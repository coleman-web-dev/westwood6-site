-- Add preferred_billing_day to units for per-unit autopay scheduling
ALTER TABLE units ADD COLUMN IF NOT EXISTS preferred_billing_day INTEGER;

-- Constraint: billing day must be 1-28 (avoid month-end edge cases)
ALTER TABLE units ADD CONSTRAINT units_billing_day_range
  CHECK (preferred_billing_day IS NULL OR (preferred_billing_day >= 1 AND preferred_billing_day <= 28));
