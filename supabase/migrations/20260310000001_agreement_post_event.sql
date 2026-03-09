-- Add post-event inspection tracking to signed_agreements
-- Allows board to complete post-event fields (inspection checklist, deposit return, etc.)
-- after the reservation event has occurred.

ALTER TABLE signed_agreements
  ADD COLUMN IF NOT EXISTS post_event_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS post_event_field_answers JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS post_event_completed_by UUID REFERENCES members(id),
  ADD COLUMN IF NOT EXISTS post_event_completed_at TIMESTAMPTZ;

-- Index for quickly finding agreements that need post-event completion
CREATE INDEX IF NOT EXISTS idx_signed_agreements_post_event_pending
  ON signed_agreements (community_id, post_event_completed)
  WHERE post_event_completed = false;
