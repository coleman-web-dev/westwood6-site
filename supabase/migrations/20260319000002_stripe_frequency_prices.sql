-- Add stripe_prices JSONB column to stripe_accounts
-- Maps payment frequency to Stripe Price ID:
-- {"monthly": "price_xxx", "quarterly": "price_yyy", "semi_annual": "price_zzz", "annual": "price_aaa"}
ALTER TABLE stripe_accounts ADD COLUMN IF NOT EXISTS stripe_prices JSONB DEFAULT '{}';
