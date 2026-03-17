-- ─── SMTP CREDENTIAL TRACKING ─────────────────────────────
-- Adds columns to email_addresses for tracking Resend API key IDs
-- used for Gmail/Outlook "Send mail as" SMTP configuration.
-- We store only the key ID (for revocation), never the key itself.

ALTER TABLE email_addresses
  ADD COLUMN IF NOT EXISTS smtp_resend_key_id TEXT,
  ADD COLUMN IF NOT EXISTS smtp_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS smtp_created_for_member_id UUID REFERENCES members(id) ON DELETE SET NULL;

-- Index for looking up who has SMTP credentials
CREATE INDEX IF NOT EXISTS idx_email_addresses_smtp_member
  ON email_addresses(smtp_created_for_member_id)
  WHERE smtp_created_for_member_id IS NOT NULL;
