-- Allow security deposits to be paid via Stripe and refunded to card

-- Add Stripe payment tracking fields for deposits
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS deposit_stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS deposit_stripe_payment_intent TEXT;

-- Expand deposit_return_method to include 'card' refund
ALTER TABLE reservations
  DROP CONSTRAINT IF EXISTS reservations_deposit_return_method_check;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_deposit_return_method_check
    CHECK (deposit_return_method IN ('check', 'wallet', 'card'));
