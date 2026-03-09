-- Event enhancements: display settings, email blast support
-- Adds show_on_announcements, is_pinned, notify_on_create, notify_roles columns

ALTER TABLE events
  ADD COLUMN show_on_announcements BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN notify_on_create BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN notify_roles TEXT[] NOT NULL DEFAULT '{owner,member}';

-- Index for announcements feed queries (active pinned events first)
CREATE INDEX idx_events_announcements
  ON events (community_id, show_on_announcements, is_pinned, end_datetime);

-- Add 'event' to email_category enum
ALTER TYPE email_category ADD VALUE IF NOT EXISTS 'event';
