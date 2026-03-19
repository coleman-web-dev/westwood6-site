-- Make paid_by nullable on payments table to support imported payments
-- where the paying member is unknown
ALTER TABLE payments ALTER COLUMN paid_by DROP NOT NULL;
