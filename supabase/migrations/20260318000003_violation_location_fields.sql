-- Add location identifier fields for resident-reported violations.
-- reported_unit_id = the unit the violation is ABOUT (optional).
-- reported_location = free-text description for violations not tied to a specific unit.
-- unit_id remains the reporter's own unit (preserves RLS visibility for residents).

ALTER TABLE violations
  ADD COLUMN IF NOT EXISTS reported_unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reported_location TEXT;

CREATE INDEX IF NOT EXISTS idx_violations_reported_unit
  ON violations(reported_unit_id) WHERE reported_unit_id IS NOT NULL;
