-- Wallet deposit returns + invoice auto-pay from wallet balance

-- 1a. New wallet transaction type for deposit returns
ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'deposit_return';

-- 1b. Track how deposit was returned on the reservation
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS deposit_return_method TEXT
    CHECK (deposit_return_method IN ('check', 'wallet'));

-- 1c. Track partial payments on invoices (cents paid so far)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS amount_paid INTEGER NOT NULL DEFAULT 0;
