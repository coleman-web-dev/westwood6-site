-- Stripe Direct Mode Migration
-- Adds support for using a community's own Stripe account directly
-- (as opposed to Stripe Connect Express accounts)

-- Add stripe_customer_id to members (maps DuesIQ member to Stripe Customer)
ALTER TABLE members ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_members_stripe_customer_id ON members(stripe_customer_id);

-- Add subscription tracking to units (one subscription per unit for recurring dues)
ALTER TABLE units ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;

-- Add Stripe Invoice ID to invoices (links DuesIQ invoice to Stripe Invoice)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;

-- Extend stripe_accounts to support direct mode
ALTER TABLE stripe_accounts ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'connect';
ALTER TABLE stripe_accounts ALTER COLUMN stripe_account_id DROP NOT NULL;
ALTER TABLE stripe_accounts ADD COLUMN IF NOT EXISTS webhook_secret TEXT;
ALTER TABLE stripe_accounts ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
ALTER TABLE stripe_accounts ADD COLUMN IF NOT EXISTS stripe_default_price_id TEXT;
