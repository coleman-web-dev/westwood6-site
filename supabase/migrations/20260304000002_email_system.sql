-- ─── EMAIL NOTIFICATION SYSTEM ──────────────────────────

-- Email category enum
DO $$ BEGIN
  CREATE TYPE email_category AS ENUM (
    'payment_confirmation',
    'payment_reminder',
    'announcement',
    'maintenance_update',
    'voting_notice',
    'reservation_update',
    'weekly_digest',
    'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE email_status AS ENUM (
    'queued',
    'sending',
    'sent',
    'failed',
    'bounced'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE email_priority AS ENUM (
    'immediate',
    'normal',
    'scheduled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── EMAIL PREFERENCES ────────────────────────────────
-- Per-member category opt-out
CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  category email_category NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id, category)
);

CREATE INDEX IF NOT EXISTS idx_email_prefs_member ON email_preferences(member_id);
CREATE INDEX IF NOT EXISTS idx_email_prefs_community ON email_preferences(community_id);

-- ─── EMAIL QUEUE ───────────────────────────────────────
-- Processing queue for batched sending
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  recipient_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  category email_category NOT NULL,
  priority email_priority NOT NULL DEFAULT 'normal',
  subject TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_data JSONB NOT NULL DEFAULT '{}',
  status email_status NOT NULL DEFAULT 'queued',
  resend_message_id TEXT,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_for TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled
  ON email_queue(status, scheduled_for)
  WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_email_queue_community ON email_queue(community_id);

-- ─── EMAIL LOGS ────────────────────────────────────────
-- Immutable audit trail
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  queue_id UUID REFERENCES email_queue(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  category email_category NOT NULL,
  subject TEXT NOT NULL,
  resend_message_id TEXT,
  status email_status NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_community ON email_logs(community_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);

-- ─── RLS ───────────────────────────────────────────────
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Members manage their own preferences
DROP POLICY IF EXISTS "Members can view their email preferences" ON email_preferences;
CREATE POLICY "Members can view their email preferences"
  ON email_preferences FOR SELECT
  USING (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Members can manage their email preferences" ON email_preferences;
CREATE POLICY "Members can manage their email preferences"
  ON email_preferences FOR ALL
  USING (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));

-- Board can view queue and logs
DROP POLICY IF EXISTS "Board can view email queue" ON email_queue;
CREATE POLICY "Board can view email queue"
  ON email_queue FOR SELECT
  USING (community_id = get_my_community_id() AND is_board_member());

DROP POLICY IF EXISTS "Board can insert email queue items" ON email_queue;
CREATE POLICY "Board can insert email queue items"
  ON email_queue FOR INSERT
  WITH CHECK (community_id = get_my_community_id());

DROP POLICY IF EXISTS "Board can view email logs" ON email_logs;
CREATE POLICY "Board can view email logs"
  ON email_logs FOR SELECT
  USING (community_id = get_my_community_id() AND is_board_member());

-- ─── INITIALIZE DEFAULT PREFERENCES ───────────────────
-- Seed preferences for all existing members with emails
INSERT INTO email_preferences (member_id, community_id, category, enabled)
SELECT m.id, m.community_id, cat.category, true
FROM members m
CROSS JOIN (
  VALUES
    ('payment_confirmation'::email_category),
    ('payment_reminder'::email_category),
    ('announcement'::email_category),
    ('maintenance_update'::email_category),
    ('voting_notice'::email_category),
    ('reservation_update'::email_category),
    ('weekly_digest'::email_category),
    ('system'::email_category)
) AS cat(category)
WHERE m.email IS NOT NULL AND m.is_approved = true
ON CONFLICT (member_id, category) DO NOTHING;
