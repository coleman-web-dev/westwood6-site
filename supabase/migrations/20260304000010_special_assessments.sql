-- Add special assessment support to assessments table
ALTER TABLE assessments
  ADD COLUMN type TEXT NOT NULL DEFAULT 'regular',
  ADD COLUMN installments INTEGER,
  ADD COLUMN installment_start_date DATE;

-- Validate type values
ALTER TABLE assessments
  ADD CONSTRAINT assessments_type_check CHECK (type IN ('regular', 'special'));

-- Validate installments is positive when set
ALTER TABLE assessments
  ADD CONSTRAINT assessments_installments_check CHECK (installments IS NULL OR installments >= 1);
