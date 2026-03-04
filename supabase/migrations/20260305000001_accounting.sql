-- ─── Accounting Module ──────────────────────────────────────────────
-- Double-entry general ledger, chart of accounts, journal entries,
-- fiscal periods. Board-only access via RLS.

-- ─── Enums ─────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE account_fund AS ENUM ('operating', 'reserve', 'special');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE journal_source AS ENUM (
    'manual',
    'invoice_created',
    'payment_received',
    'late_fee_applied',
    'invoice_waived',
    'invoice_voided',
    'wallet_credit',
    'wallet_debit',
    'refund',
    'assessment_generated'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE journal_status AS ENUM ('draft', 'posted', 'reversed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Chart of Accounts ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type account_type NOT NULL,
  fund account_fund NOT NULL DEFAULT 'operating',
  parent_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  normal_balance TEXT NOT NULL DEFAULT 'debit' CHECK (normal_balance IN ('debit', 'credit')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_community_account_code UNIQUE (community_id, code)
);

CREATE INDEX IF NOT EXISTS idx_accounts_community ON accounts(community_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(community_id, account_type);

-- ─── Journal Entries (header) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  source journal_source NOT NULL DEFAULT 'manual',
  status journal_status NOT NULL DEFAULT 'posted',
  reference_type TEXT,
  reference_id UUID,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  reversed_by UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  reversal_of UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  memo TEXT,
  created_by UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  posted_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_community ON journal_entries(community_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(community_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON journal_entries(community_id, source);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference ON journal_entries(reference_type, reference_id);

-- ─── Journal Lines (debit/credit legs) ───────────────────────────

CREATE TABLE IF NOT EXISTS journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  debit BIGINT NOT NULL DEFAULT 0,
  credit BIGINT NOT NULL DEFAULT 0,
  description TEXT,
  CONSTRAINT check_debit_or_credit CHECK (
    (debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);

-- ─── Fiscal Periods ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fiscal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_fiscal_dates CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_periods_community ON fiscal_periods(community_id);

-- ─── RLS ─────────────────────────────────────────────────────────

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;

-- Accounts: board can do everything, residents can read
CREATE POLICY accounts_select ON accounts FOR SELECT
  USING (community_id = get_my_community_id());

CREATE POLICY accounts_board_all ON accounts FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member())
  WITH CHECK (community_id = get_my_community_id() AND is_board_member());

-- Journal entries: board-only
CREATE POLICY journal_entries_board ON journal_entries FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member())
  WITH CHECK (community_id = get_my_community_id() AND is_board_member());

-- Journal lines: board-only (via join to entry)
CREATE POLICY journal_lines_board ON journal_lines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_lines.journal_entry_id
      AND je.community_id = get_my_community_id()
      AND is_board_member()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_lines.journal_entry_id
      AND je.community_id = get_my_community_id()
      AND is_board_member()
    )
  );

-- Fiscal periods: board-only
CREATE POLICY fiscal_periods_board ON fiscal_periods FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member())
  WITH CHECK (community_id = get_my_community_id() AND is_board_member());

-- ─── Seed Default Chart of Accounts ──────────────────────────────

CREATE OR REPLACE FUNCTION seed_default_chart_of_accounts(p_community_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only seed if no accounts exist for this community
  IF EXISTS (SELECT 1 FROM accounts WHERE community_id = p_community_id LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO accounts (community_id, code, name, account_type, fund, is_system, normal_balance, display_order) VALUES
    -- ASSETS (1000s)
    (p_community_id, '1000', 'Operating Cash', 'asset', 'operating', true, 'debit', 100),
    (p_community_id, '1010', 'Reserve Cash', 'asset', 'reserve', true, 'debit', 110),
    (p_community_id, '1100', 'Accounts Receivable - Dues', 'asset', 'operating', true, 'debit', 120),
    (p_community_id, '1110', 'Accounts Receivable - Special Assessments', 'asset', 'operating', true, 'debit', 130),
    (p_community_id, '1200', 'Prepaid Expenses', 'asset', 'operating', false, 'debit', 140),
    (p_community_id, '1300', 'Amenity Deposits Held', 'asset', 'operating', false, 'debit', 150),

    -- LIABILITIES (2000s)
    (p_community_id, '2000', 'Accounts Payable', 'liability', 'operating', true, 'credit', 200),
    (p_community_id, '2100', 'Homeowner Prepayments', 'liability', 'operating', false, 'credit', 210),
    (p_community_id, '2110', 'Homeowner Wallet Credits', 'liability', 'operating', true, 'credit', 220),
    (p_community_id, '2200', 'Amenity Deposits Payable', 'liability', 'operating', false, 'credit', 230),
    (p_community_id, '2300', 'Accrued Expenses', 'liability', 'operating', false, 'credit', 240),

    -- EQUITY (3000s)
    (p_community_id, '3000', 'Operating Fund Balance', 'equity', 'operating', true, 'credit', 300),
    (p_community_id, '3100', 'Reserve Fund Balance', 'equity', 'reserve', true, 'credit', 310),
    (p_community_id, '3200', 'Retained Earnings', 'equity', 'operating', true, 'credit', 320),

    -- REVENUE (4000s)
    (p_community_id, '4000', 'Assessment Revenue - Regular', 'revenue', 'operating', true, 'credit', 400),
    (p_community_id, '4010', 'Assessment Revenue - Special', 'revenue', 'operating', true, 'credit', 410),
    (p_community_id, '4100', 'Late Fee Revenue', 'revenue', 'operating', true, 'credit', 420),
    (p_community_id, '4200', 'Amenity Fee Revenue', 'revenue', 'operating', false, 'credit', 430),
    (p_community_id, '4300', 'Interest Income', 'revenue', 'operating', false, 'credit', 440),
    (p_community_id, '4400', 'Other Income', 'revenue', 'operating', false, 'credit', 450),
    (p_community_id, '4500', 'Reserve Contribution Revenue', 'revenue', 'reserve', false, 'credit', 460),

    -- EXPENSES (5000s)
    (p_community_id, '5000', 'Maintenance & Repairs', 'expense', 'operating', false, 'debit', 500),
    (p_community_id, '5100', 'Landscaping', 'expense', 'operating', false, 'debit', 510),
    (p_community_id, '5200', 'Insurance', 'expense', 'operating', false, 'debit', 520),
    (p_community_id, '5300', 'Utilities', 'expense', 'operating', false, 'debit', 530),
    (p_community_id, '5400', 'Management Fees', 'expense', 'operating', false, 'debit', 540),
    (p_community_id, '5500', 'Legal & Professional', 'expense', 'operating', false, 'debit', 550),
    (p_community_id, '5600', 'Administrative', 'expense', 'operating', false, 'debit', 560),
    (p_community_id, '5700', 'Stripe Processing Fees', 'expense', 'operating', false, 'debit', 570),
    (p_community_id, '5800', 'Bad Debt Expense', 'expense', 'operating', true, 'debit', 580),
    (p_community_id, '5900', 'Reserve Fund Expenses', 'expense', 'reserve', false, 'debit', 590);
END;
$$;
