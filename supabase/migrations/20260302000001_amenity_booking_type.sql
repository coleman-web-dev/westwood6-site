-- Add booking configuration to amenities
ALTER TABLE amenities
  ADD COLUMN booking_type TEXT NOT NULL DEFAULT 'full_day'
    CHECK (booking_type IN ('full_day', 'time_slot')),
  ADD COLUMN slot_duration_minutes INTEGER DEFAULT 60
    CHECK (slot_duration_minutes IS NULL OR slot_duration_minutes IN (30, 60, 90, 120));

-- Privacy-safe availability function
-- Returns blocked date ranges without exposing who booked them.
-- Uses SECURITY DEFINER to bypass RLS (only returns dates + block type, never reservation details).
CREATE OR REPLACE FUNCTION get_amenity_blocked_dates(
  p_amenity_id UUID,
  p_range_start TIMESTAMPTZ,
  p_range_end TIMESTAMPTZ
)
RETURNS TABLE (
  start_datetime TIMESTAMPTZ,
  end_datetime TIMESTAMPTZ,
  block_type TEXT,
  event_title TEXT,
  event_description TEXT
) AS $fn$
  -- Active reservations (approved or pending)
  SELECT r.start_datetime, r.end_datetime,
    'reservation'::TEXT, NULL::TEXT, NULL::TEXT
  FROM reservations r
  WHERE r.amenity_id = p_amenity_id
    AND r.status IN ('approved', 'pending')
    AND r.start_datetime < p_range_end
    AND r.end_datetime > p_range_start
  UNION ALL
  -- Events that block this amenity (only show details for public events)
  SELECT e.start_datetime, e.end_datetime,
    'event'::TEXT,
    CASE WHEN e.visibility = 'public' THEN e.title ELSE NULL END,
    CASE WHEN e.visibility = 'public' THEN e.description ELSE NULL END
  FROM events e
  WHERE e.amenity_id = p_amenity_id
    AND e.blocks_amenity = true
    AND e.start_datetime < p_range_end
    AND e.end_datetime > p_range_start
  ORDER BY 1;
$fn$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Prevent overlapping reservations for the same amenity
CREATE OR REPLACE FUNCTION check_reservation_overlap()
RETURNS TRIGGER AS $fn$
BEGIN
  IF EXISTS (
    SELECT 1 FROM reservations
    WHERE amenity_id = NEW.amenity_id
      AND status IN ('approved', 'pending')
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND start_datetime < NEW.end_datetime
      AND end_datetime > NEW.start_datetime
  ) THEN
    RAISE EXCEPTION 'This time slot is already reserved';
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

CREATE TRIGGER check_reservation_overlap_trigger
  BEFORE INSERT OR UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION check_reservation_overlap();
