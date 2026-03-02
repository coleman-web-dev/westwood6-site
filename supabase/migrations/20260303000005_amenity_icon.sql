-- Add icon column for amenity display icons.
-- Stores a key from a predefined set (e.g. 'pool', 'tennis', 'clubhouse').
ALTER TABLE amenities
  ADD COLUMN IF NOT EXISTS icon text;
