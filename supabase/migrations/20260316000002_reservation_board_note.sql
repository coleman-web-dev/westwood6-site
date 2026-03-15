-- Add board_note to reservations for approval/denial messages
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS board_note TEXT;
