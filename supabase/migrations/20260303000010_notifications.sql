-- ─── NOTIFICATIONS SYSTEM ──────────────────────────────

-- Notification type enum
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'agreement_signed',
    'reservation_created',
    'reservation_approved',
    'reservation_denied',
    'general'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type notification_type NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT,
  reference_id UUID,
  reference_type TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup: member's unread notifications sorted by date
CREATE INDEX IF NOT EXISTS idx_notifications_member_unread
  ON notifications(member_id, read, created_at DESC);

-- ─── RLS ───────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Members can view their own notifications
DROP POLICY IF EXISTS "Members can view their own notifications" ON notifications;
CREATE POLICY "Members can view their own notifications"
  ON notifications FOR SELECT
  USING (member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  ));

-- Members can update (mark read) their own notifications
DROP POLICY IF EXISTS "Members can update their own notifications" ON notifications;
CREATE POLICY "Members can update their own notifications"
  ON notifications FOR UPDATE
  USING (member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  ));

-- Members can delete their own notifications
DROP POLICY IF EXISTS "Members can delete their own notifications" ON notifications;
CREATE POLICY "Members can delete their own notifications"
  ON notifications FOR DELETE
  USING (member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  ));

-- ─── RPC: Create notifications for all board members ───
-- SECURITY DEFINER so any authenticated user can trigger board notifications
CREATE OR REPLACE FUNCTION create_board_notifications(
  p_community_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (community_id, member_id, type, title, body, reference_id, reference_type)
  SELECT
    p_community_id,
    m.id,
    p_type,
    p_title,
    p_body,
    p_reference_id,
    p_reference_type
  FROM members m
  WHERE m.community_id = p_community_id
    AND m.is_approved = true
    AND m.system_role IN ('board', 'manager', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
