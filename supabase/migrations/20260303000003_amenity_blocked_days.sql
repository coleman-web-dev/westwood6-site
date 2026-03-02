-- Add blocked_days column to amenities
-- Stores day-of-week names that are unavailable for booking (e.g. ['sunday'])
ALTER TABLE amenities
  ADD COLUMN IF NOT EXISTS blocked_days text[] NOT NULL DEFAULT '{}';
