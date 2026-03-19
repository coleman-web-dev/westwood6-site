-- Add payment_methods JSONB column to payments and reservations
-- Stores an array of {method, amount, reference} objects for split payment recording
-- e.g., [{"method":"check","amount":20000,"reference":"1234"},{"method":"cash","amount":10000}]

ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_methods JSONB;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS payment_methods JSONB;
