-- Add min/max booking duration for time-slot amenities.
-- When NULL, defaults to slot_duration_minutes (single-slot booking).
ALTER TABLE amenities
  ADD COLUMN IF NOT EXISTS min_booking_minutes int,
  ADD COLUMN IF NOT EXISTS max_booking_minutes int;
