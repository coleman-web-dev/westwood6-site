-- Per-transaction manual direction override.
-- When set, overrides the automatic direction detection (sign-based or name-based).
ALTER TABLE bank_transactions
  ADD COLUMN IF NOT EXISTS direction_override TEXT DEFAULT NULL
  CHECK (direction_override IS NULL OR direction_override IN ('inflow', 'outflow'));
