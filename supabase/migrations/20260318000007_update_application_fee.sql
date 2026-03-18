-- Update DuesIQ platform application fee from 2.50% to 0.60%
-- Stripe charges 2.9% + $0.30 separately; this 0.6% is the DuesIQ platform cut.

-- Update default for new rows
ALTER TABLE stripe_accounts ALTER COLUMN application_fee_percent SET DEFAULT 0.60;

-- Update existing rows that still have the old default
UPDATE stripe_accounts SET application_fee_percent = 0.60 WHERE application_fee_percent = 2.50;
