-- Add column to track actual refund amount for partial deposit returns.
-- NULL means full refund (backward compatible with existing data).
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS deposit_refund_amount INTEGER;
