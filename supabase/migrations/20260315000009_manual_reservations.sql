-- ─── Manual Reservations ─────────────────────────────────────────────────────
-- Allow board to create manual reservations for people without DuesIQ accounts.
-- Adds contact fields, payment tracking (check/cash), and paper agreement support.

-- 1. Reservations: make unit_id and reserved_by nullable for manual reservations
ALTER TABLE reservations ALTER COLUMN unit_id DROP NOT NULL;
ALTER TABLE reservations ALTER COLUMN reserved_by DROP NOT NULL;

-- 2. Reservations: add manual reservation fields
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS manual_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS manual_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES members(id),
  ADD COLUMN IF NOT EXISTS fee_paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fee_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS check_number TEXT;

-- 3. Signed agreements: make signer_member_id and unit_id nullable for paper agreements
ALTER TABLE signed_agreements ALTER COLUMN signer_member_id DROP NOT NULL;
ALTER TABLE signed_agreements ALTER COLUMN unit_id DROP NOT NULL;

-- 4. Signed agreements: add paper agreement fields
ALTER TABLE signed_agreements
  ADD COLUMN IF NOT EXISTS paper_agreement_path TEXT,
  ADD COLUMN IF NOT EXISTS is_paper BOOLEAN NOT NULL DEFAULT false;

-- 5. Index for finding manual reservations
CREATE INDEX IF NOT EXISTS idx_reservations_is_manual
  ON reservations (community_id, is_manual) WHERE is_manual = true;
