-- Add setup_completed_at to members for first-login wizard tracking
ALTER TABLE members ADD COLUMN setup_completed_at timestamptz;

-- Backfill: mark all existing members who have logged in (have a user_id)
-- as already completed so they are not forced through the wizard.
UPDATE members SET setup_completed_at = created_at WHERE user_id IS NOT NULL;
