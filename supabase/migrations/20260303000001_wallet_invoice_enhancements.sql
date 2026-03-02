-- 1a. Voided invoice status
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'voided';

-- 1b. Invoice notes + bounced tracking
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bounced_from_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- 1c. Unit wallets (one per unit, balance in cents -- same cents pattern as invoices.amount)
CREATE TABLE IF NOT EXISTS unit_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL UNIQUE REFERENCES units(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unit_wallets_community ON unit_wallets(community_id);

-- 1d. Wallet transactions
DO $$ BEGIN
  CREATE TYPE wallet_transaction_type AS ENUM (
    'overpayment','manual_credit','manual_debit','payment_applied','refund','bounced_reversal'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  type wallet_transaction_type NOT NULL,
  reference_id UUID,
  description TEXT,
  created_by UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_unit ON wallet_transactions(unit_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_community ON wallet_transactions(community_id);

-- 1e. Deposit tracking on reservations
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT false;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ;

-- 1f. RLS
ALTER TABLE unit_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their unit wallet" ON unit_wallets;
CREATE POLICY "Members can view their unit wallet"
  ON unit_wallets FOR SELECT
  USING (community_id = get_my_community_id() AND (unit_id = get_my_unit_id() OR is_board_member()));

DROP POLICY IF EXISTS "Board can manage wallets" ON unit_wallets;
CREATE POLICY "Board can manage wallets"
  ON unit_wallets FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member());

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their unit transactions" ON wallet_transactions;
CREATE POLICY "Members can view their unit transactions"
  ON wallet_transactions FOR SELECT
  USING (community_id = get_my_community_id() AND (unit_id = get_my_unit_id() OR is_board_member()));

DROP POLICY IF EXISTS "Board can manage transactions" ON wallet_transactions;
CREATE POLICY "Board can manage transactions"
  ON wallet_transactions FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member());

-- 1g. Auto-create wallet for new units + backfill existing
CREATE OR REPLACE FUNCTION auto_create_unit_wallet() RETURNS TRIGGER AS $fn$
BEGIN
  INSERT INTO unit_wallets (unit_id, community_id) VALUES (NEW.id, NEW.community_id)
  ON CONFLICT (unit_id) DO NOTHING;
  RETURN NEW;
END; $fn$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_unit_created_wallet ON units;
CREATE TRIGGER on_unit_created_wallet AFTER INSERT ON units
  FOR EACH ROW EXECUTE FUNCTION auto_create_unit_wallet();

INSERT INTO unit_wallets (unit_id, community_id) SELECT id, community_id FROM units
ON CONFLICT (unit_id) DO NOTHING;
