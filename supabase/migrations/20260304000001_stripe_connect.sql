-- Stripe Connect accounts for each community
CREATE TABLE stripe_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  application_fee_percent NUMERIC(5,2) DEFAULT 2.50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT stripe_accounts_community_unique UNIQUE (community_id),
  CONSTRAINT stripe_accounts_stripe_unique UNIQUE (stripe_account_id)
);

-- RLS
ALTER TABLE stripe_accounts ENABLE ROW LEVEL SECURITY;

-- Members can view their own community's Stripe account status
CREATE POLICY "Members view own community Stripe account"
  ON stripe_accounts FOR SELECT
  USING (community_id = get_my_community_id());

-- Board members can manage Stripe account
CREATE POLICY "Board manages Stripe account"
  ON stripe_accounts FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member())
  WITH CHECK (community_id = get_my_community_id() AND is_board_member());

-- Add stripe fields to payments table (if payments table exists, otherwise these are on invoices)
-- We'll add stripe_session_id and stripe_payment_intent to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_stripe_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stripe_accounts_updated_at
  BEFORE UPDATE ON stripe_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_accounts_updated_at();
