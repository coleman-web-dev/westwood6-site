-- Allow 'both' as a booking_type option so amenities can support
-- full-day AND time-slot reservations.
ALTER TABLE amenities
  DROP CONSTRAINT IF EXISTS amenities_booking_type_check;

ALTER TABLE amenities
  ADD CONSTRAINT amenities_booking_type_check
    CHECK (booking_type IN ('full_day', 'time_slot', 'both'));
