-- Per-bank-account setting for how to determine transaction direction (inflow vs outflow).
-- 'sign'  = trust Plaid amount sign (positive = outflow, negative = inflow)
-- 'name'  = parse transaction name keywords (debit/check = out, credit/deposit = in)
-- 'abs'   = show absolute values with no direction coloring
ALTER TABLE plaid_bank_accounts
  ADD COLUMN IF NOT EXISTS amount_sign_source TEXT NOT NULL DEFAULT 'name'
  CHECK (amount_sign_source IN ('sign', 'name', 'abs'));
