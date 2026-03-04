-- Bank Reconciliation + Plaid Integration
-- Phase 2 of accounting module

-- Add bank_sync to journal_source enum
ALTER TYPE journal_source ADD VALUE IF NOT EXISTS 'bank_sync';

-- New enums
DO $$ BEGIN
  CREATE TYPE bank_txn_status AS ENUM ('pending', 'matched', 'categorized', 'excluded', 'reconciled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE recon_status AS ENUM ('in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE match_method AS ENUM ('auto_amount_date', 'auto_reference', 'manual', 'rule');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Plaid connections (one per connected institution per community)
CREATE TABLE IF NOT EXISTS plaid_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  plaid_item_id TEXT NOT NULL UNIQUE,
  plaid_access_token TEXT NOT NULL,
  institution_id TEXT,
  institution_name TEXT,
  last_sync_cursor TEXT,
  last_synced_at TIMESTAMPTZ,
  error_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bank accounts within a Plaid connection
CREATE TABLE IF NOT EXISTS plaid_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_connection_id UUID NOT NULL REFERENCES plaid_connections(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  plaid_account_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  official_name TEXT,
  mask TEXT,
  type TEXT NOT NULL,
  subtype TEXT,
  current_balance BIGINT,
  available_balance BIGINT,
  gl_account_id UUID REFERENCES accounts(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bank reconciliation sessions
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  plaid_bank_account_id UUID NOT NULL REFERENCES plaid_bank_accounts(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  statement_ending_balance BIGINT NOT NULL,
  gl_ending_balance BIGINT,
  difference BIGINT,
  status recon_status NOT NULL DEFAULT 'in_progress',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Imported bank transactions
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  plaid_bank_account_id UUID NOT NULL REFERENCES plaid_bank_accounts(id) ON DELETE CASCADE,
  plaid_transaction_id TEXT NOT NULL UNIQUE,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  merchant_name TEXT,
  amount BIGINT NOT NULL,
  status bank_txn_status NOT NULL DEFAULT 'pending',
  matched_journal_entry_id UUID REFERENCES journal_entries(id),
  match_method match_method,
  categorized_account_id UUID REFERENCES accounts(id),
  reconciliation_id UUID REFERENCES bank_reconciliations(id),
  excluded_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-categorization rules
CREATE TABLE IF NOT EXISTS categorization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  match_field TEXT NOT NULL DEFAULT 'name',
  account_id UUID NOT NULL REFERENCES accounts(id),
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  times_applied INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plaid_connections_community ON plaid_connections(community_id);
CREATE INDEX IF NOT EXISTS idx_plaid_bank_accounts_community ON plaid_bank_accounts(community_id);
CREATE INDEX IF NOT EXISTS idx_plaid_bank_accounts_connection ON plaid_bank_accounts(plaid_connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_community ON bank_transactions(community_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_bank_account ON bank_transactions(plaid_bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_recon ON bank_transactions(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_community ON bank_reconciliations(community_id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_account ON bank_reconciliations(plaid_bank_account_id);
CREATE INDEX IF NOT EXISTS idx_categorization_rules_community ON categorization_rules(community_id);

-- RLS: Board-only on all tables
ALTER TABLE plaid_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;

-- plaid_connections policies
CREATE POLICY "Board can manage plaid connections"
  ON plaid_connections FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member())
  WITH CHECK (community_id = get_my_community_id() AND is_board_member());

-- plaid_bank_accounts policies
CREATE POLICY "Board can manage bank accounts"
  ON plaid_bank_accounts FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member())
  WITH CHECK (community_id = get_my_community_id() AND is_board_member());

-- bank_transactions policies
CREATE POLICY "Board can manage bank transactions"
  ON bank_transactions FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member())
  WITH CHECK (community_id = get_my_community_id() AND is_board_member());

-- bank_reconciliations policies
CREATE POLICY "Board can manage reconciliations"
  ON bank_reconciliations FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member())
  WITH CHECK (community_id = get_my_community_id() AND is_board_member());

-- categorization_rules policies
CREATE POLICY "Board can manage categorization rules"
  ON categorization_rules FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member())
  WITH CHECK (community_id = get_my_community_id() AND is_board_member());

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER update_plaid_connections_updated_at
    BEFORE UPDATE ON plaid_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_plaid_bank_accounts_updated_at
    BEFORE UPDATE ON plaid_bank_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_bank_transactions_updated_at
    BEFORE UPDATE ON bank_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_bank_reconciliations_updated_at
    BEFORE UPDATE ON bank_reconciliations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_categorization_rules_updated_at
    BEFORE UPDATE ON categorization_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
