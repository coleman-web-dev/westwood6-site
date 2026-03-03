-- Late Fees: add late_fee_amount column to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS late_fee_amount INTEGER NOT NULL DEFAULT 0;
