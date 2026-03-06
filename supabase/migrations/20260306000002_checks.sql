-- Check Printing & Signature Approval System

-- ─── Vendor Address & Default Expense Category ──────────────────────
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS default_expense_account_id UUID REFERENCES accounts(id);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS zip TEXT;

-- Add check_image to vendor document type enum
ALTER TYPE vendor_document_type ADD VALUE IF NOT EXISTS 'check_image';

-- ─── Check Number Sequences ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS check_number_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  plaid_bank_account_id UUID REFERENCES plaid_bank_accounts(id),
  bank_account_label TEXT NOT NULL,
  next_check_number INTEGER NOT NULL DEFAULT 1001,
  prefix TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_check_sequences_community ON check_number_sequences(community_id);

ALTER TABLE check_number_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Board can manage check sequences" ON check_number_sequences
  FOR ALL USING (community_id = get_my_community_id() AND is_board_member())
  WITH CHECK (community_id = get_my_community_id() AND is_board_member());

-- ─── Check Signatures ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS check_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (community_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_check_signatures_community ON check_signatures(community_id);

ALTER TABLE check_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Board can manage check signatures" ON check_signatures
  FOR ALL USING (community_id = get_my_community_id() AND is_board_member())
  WITH CHECK (community_id = get_my_community_id() AND is_board_member());

-- ─── Checks ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  check_number INTEGER NOT NULL,
  check_sequence_id UUID NOT NULL REFERENCES check_number_sequences(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  payee_vendor_id UUID REFERENCES vendors(id),
  payee_name TEXT NOT NULL,
  memo TEXT,
  expense_account_id UUID NOT NULL REFERENCES accounts(id),
  bank_account_id UUID NOT NULL REFERENCES accounts(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'printed', 'voided', 'cleared')),
  created_by UUID REFERENCES auth.users(id),
  printed_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES auth.users(id),
  void_reason TEXT,
  journal_entry_id UUID REFERENCES journal_entries(id),
  bank_transaction_id UUID REFERENCES bank_transactions(id),
  check_image_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checks_community ON checks(community_id);
CREATE INDEX IF NOT EXISTS idx_checks_community_number ON checks(community_id, check_number);
CREATE INDEX IF NOT EXISTS idx_checks_status ON checks(community_id, status);
CREATE INDEX IF NOT EXISTS idx_checks_vendor ON checks(payee_vendor_id) WHERE payee_vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_checks_bank_txn ON checks(bank_transaction_id) WHERE bank_transaction_id IS NOT NULL;

ALTER TABLE checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Board can manage checks" ON checks
  FOR ALL USING (community_id = get_my_community_id() AND is_board_member())
  WITH CHECK (community_id = get_my_community_id() AND is_board_member());

CREATE POLICY "Members can view checks" ON checks
  FOR SELECT USING (community_id = get_my_community_id());

-- ─── Check Approvals ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS check_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID NOT NULL REFERENCES checks(id) ON DELETE CASCADE,
  signer_member_id UUID NOT NULL REFERENCES members(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  signature_id UUID REFERENCES check_signatures(id),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_check_approvals_check ON check_approvals(check_id);
CREATE INDEX IF NOT EXISTS idx_check_approvals_signer ON check_approvals(signer_member_id, status);

ALTER TABLE check_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Board can manage check approvals" ON check_approvals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM checks c
      WHERE c.id = check_approvals.check_id
      AND c.community_id = get_my_community_id()
    )
    AND is_board_member()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM checks c
      WHERE c.id = check_approvals.check_id
      AND c.community_id = get_my_community_id()
    )
    AND is_board_member()
  );

-- ─── Atomic Check Number Function ───────────────────────────────────
CREATE OR REPLACE FUNCTION get_next_check_number(p_sequence_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  UPDATE check_number_sequences
  SET next_check_number = next_check_number + 1
  WHERE id = p_sequence_id
  RETURNING next_check_number - 1 INTO v_next;

  IF v_next IS NULL THEN
    RAISE EXCEPTION 'Check sequence not found: %', p_sequence_id;
  END IF;

  RETURN v_next;
END;
$$;

-- ─── Updated_at trigger for checks ──────────────────────────────────
CREATE OR REPLACE FUNCTION update_checks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checks_updated_at
  BEFORE UPDATE ON checks
  FOR EACH ROW
  EXECUTE FUNCTION update_checks_updated_at();
