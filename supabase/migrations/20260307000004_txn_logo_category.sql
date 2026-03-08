-- Add merchant logo URL and Plaid category to bank transactions
-- logo_url: 100x100 PNG from Plaid's counterparty data
-- plaid_category: Plaid's personal_finance_category.primary (e.g. "FOOD_AND_DRINK")

ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS plaid_category TEXT;
