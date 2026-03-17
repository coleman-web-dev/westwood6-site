-- ─── EMAIL INBOX SYSTEM ─────────────────────────────────
-- Adds inbound email storage, threading, access control, and sent messages
-- for the shared community inbox feature.

-- ─── MODIFY EXISTING: Add mailbox_type to email_addresses ────
ALTER TABLE email_addresses
  ADD COLUMN IF NOT EXISTS mailbox_type TEXT NOT NULL DEFAULT 'sending_only';
-- Values: 'sending_only' (outbound only), 'full_inbox' (inbound + outbound)

-- ─── EMAIL THREADS ──────────────────────────────────────
-- Groups related emails into conversations

CREATE TABLE email_threads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id     UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  email_address_id UUID NOT NULL REFERENCES email_addresses(id) ON DELETE CASCADE,
  subject          TEXT NOT NULL DEFAULT '',
  last_message_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  message_count    INTEGER NOT NULL DEFAULT 1,
  is_archived      BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_threads_community ON email_threads(community_id);
CREATE INDEX idx_email_threads_address ON email_threads(email_address_id);
CREATE INDEX idx_email_threads_last_message ON email_threads(community_id, last_message_at DESC);

-- ─── EMAIL INBOX (inbound messages) ─────────────────────

CREATE TABLE email_inbox (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id      UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  email_address_id  UUID NOT NULL REFERENCES email_addresses(id) ON DELETE CASCADE,
  from_address      TEXT NOT NULL,
  from_name         TEXT,
  to_addresses      TEXT[] NOT NULL DEFAULT '{}',
  cc_addresses      TEXT[] NOT NULL DEFAULT '{}',
  subject           TEXT NOT NULL DEFAULT '',
  body_text         TEXT,
  body_html         TEXT,
  snippet           TEXT, -- first ~200 chars for list preview
  thread_id         UUID REFERENCES email_threads(id) ON DELETE SET NULL,
  in_reply_to       TEXT, -- Message-ID header from sender
  message_id        TEXT, -- our generated or received Message-ID
  has_attachments   BOOLEAN NOT NULL DEFAULT false,
  resend_inbound_id TEXT,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_inbox_community ON email_inbox(community_id);
CREATE INDEX idx_email_inbox_address ON email_inbox(email_address_id);
CREATE INDEX idx_email_inbox_thread ON email_inbox(thread_id);
CREATE INDEX idx_email_inbox_received ON email_inbox(community_id, received_at DESC);
CREATE INDEX idx_email_inbox_message_id ON email_inbox(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX idx_email_inbox_in_reply_to ON email_inbox(in_reply_to) WHERE in_reply_to IS NOT NULL;

-- ─── EMAIL THREAD MEMBERS (per-member state) ────────────

CREATE TABLE email_thread_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  is_starred  BOOLEAN NOT NULL DEFAULT false,
  is_assigned BOOLEAN NOT NULL DEFAULT false,
  last_read_at TIMESTAMPTZ,
  CONSTRAINT email_thread_members_unique UNIQUE (thread_id, member_id)
);

CREATE INDEX idx_email_thread_members_thread ON email_thread_members(thread_id);
CREATE INDEX idx_email_thread_members_member ON email_thread_members(member_id);
CREATE INDEX idx_email_thread_members_unread ON email_thread_members(member_id, is_read) WHERE is_read = false;

-- ─── EMAIL ATTACHMENTS ──────────────────────────────────

CREATE TABLE email_attachments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbox_message_id  UUID REFERENCES email_inbox(id) ON DELETE CASCADE,
  sent_message_id   UUID, -- will reference email_sent_messages
  filename          TEXT NOT NULL,
  content_type      TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes        INTEGER NOT NULL DEFAULT 0,
  storage_path      TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_attachments_one_parent CHECK (
    (inbox_message_id IS NOT NULL AND sent_message_id IS NULL)
    OR (inbox_message_id IS NULL AND sent_message_id IS NOT NULL)
  )
);

CREATE INDEX idx_email_attachments_inbox ON email_attachments(inbox_message_id) WHERE inbox_message_id IS NOT NULL;
CREATE INDEX idx_email_attachments_sent ON email_attachments(sent_message_id) WHERE sent_message_id IS NOT NULL;

-- ─── EMAIL INBOX ACCESS ─────────────────────────────────
-- Controls which members can see which shared inboxes

CREATE TABLE email_inbox_access (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id     UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  email_address_id UUID NOT NULL REFERENCES email_addresses(id) ON DELETE CASCADE,
  member_id        UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  can_read         BOOLEAN NOT NULL DEFAULT true,
  can_reply        BOOLEAN NOT NULL DEFAULT true,
  can_compose      BOOLEAN NOT NULL DEFAULT true,
  notify_forward   BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_inbox_access_unique UNIQUE (email_address_id, member_id)
);

CREATE INDEX idx_email_inbox_access_community ON email_inbox_access(community_id);
CREATE INDEX idx_email_inbox_access_address ON email_inbox_access(email_address_id);
CREATE INDEX idx_email_inbox_access_member ON email_inbox_access(member_id);

-- ─── EMAIL SENT MESSAGES ────────────────────────────────
-- Outbound messages composed/replied from the inbox UI

CREATE TABLE email_sent_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id      UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  email_address_id  UUID NOT NULL REFERENCES email_addresses(id) ON DELETE CASCADE,
  sender_member_id  UUID NOT NULL REFERENCES members(id) ON DELETE SET NULL,
  to_addresses      TEXT[] NOT NULL DEFAULT '{}',
  cc_addresses      TEXT[] NOT NULL DEFAULT '{}',
  bcc_addresses     TEXT[] NOT NULL DEFAULT '{}',
  subject           TEXT NOT NULL DEFAULT '',
  body_html         TEXT,
  body_text         TEXT,
  thread_id         UUID REFERENCES email_threads(id) ON DELETE SET NULL,
  in_reply_to       TEXT,
  message_id        TEXT,
  resend_message_id TEXT,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_sent_community ON email_sent_messages(community_id);
CREATE INDEX idx_email_sent_address ON email_sent_messages(email_address_id);
CREATE INDEX idx_email_sent_thread ON email_sent_messages(thread_id);
CREATE INDEX idx_email_sent_message_id ON email_sent_messages(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX idx_email_sent_at ON email_sent_messages(community_id, sent_at DESC);

-- Add FK for email_attachments.sent_message_id now that the table exists
ALTER TABLE email_attachments
  ADD CONSTRAINT email_attachments_sent_fk
  FOREIGN KEY (sent_message_id) REFERENCES email_sent_messages(id) ON DELETE CASCADE;

-- ─── RLS POLICIES ───────────────────────────────────────

ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_inbox_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sent_messages ENABLE ROW LEVEL SECURITY;

-- Helper: check if member has inbox access for a given email_address_id
CREATE OR REPLACE FUNCTION has_inbox_access(addr_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM email_inbox_access
    WHERE email_address_id = addr_id
      AND member_id = (SELECT id FROM members WHERE user_id = auth.uid() AND community_id = get_my_community_id() LIMIT 1)
      AND can_read = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- email_threads
CREATE POLICY "Members view accessible threads"
  ON email_threads FOR SELECT
  USING (community_id = get_my_community_id() AND has_inbox_access(email_address_id));

CREATE POLICY "Board manages threads"
  ON email_threads FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member())
  WITH CHECK (community_id = get_my_community_id() AND is_board_member());

-- email_inbox
CREATE POLICY "Members view accessible inbox messages"
  ON email_inbox FOR SELECT
  USING (community_id = get_my_community_id() AND has_inbox_access(email_address_id));

CREATE POLICY "Board manages inbox"
  ON email_inbox FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member())
  WITH CHECK (community_id = get_my_community_id() AND is_board_member());

-- email_thread_members
CREATE POLICY "Members manage own thread state"
  ON email_thread_members FOR ALL
  USING (member_id = (SELECT id FROM members WHERE user_id = auth.uid() AND community_id = get_my_community_id() LIMIT 1))
  WITH CHECK (member_id = (SELECT id FROM members WHERE user_id = auth.uid() AND community_id = get_my_community_id() LIMIT 1));

CREATE POLICY "Board views all thread members"
  ON email_thread_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM email_threads t
    WHERE t.id = thread_id AND t.community_id = get_my_community_id()
  ) AND is_board_member());

-- email_attachments
CREATE POLICY "Members view accessible attachments"
  ON email_attachments FOR SELECT
  USING (
    (inbox_message_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM email_inbox i WHERE i.id = inbox_message_id AND i.community_id = get_my_community_id() AND has_inbox_access(i.email_address_id)
    ))
    OR
    (sent_message_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM email_sent_messages s WHERE s.id = sent_message_id AND s.community_id = get_my_community_id() AND has_inbox_access(s.email_address_id)
    ))
  );

-- email_inbox_access
CREATE POLICY "Members view own access"
  ON email_inbox_access FOR SELECT
  USING (
    community_id = get_my_community_id()
    AND (
      member_id = (SELECT id FROM members WHERE user_id = auth.uid() AND community_id = get_my_community_id() LIMIT 1)
      OR is_board_member()
    )
  );

CREATE POLICY "Board manages inbox access"
  ON email_inbox_access FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member())
  WITH CHECK (community_id = get_my_community_id() AND is_board_member());

-- email_sent_messages
CREATE POLICY "Members view accessible sent messages"
  ON email_sent_messages FOR SELECT
  USING (community_id = get_my_community_id() AND has_inbox_access(email_address_id));

CREATE POLICY "Members with compose access can insert"
  ON email_sent_messages FOR INSERT
  WITH CHECK (
    community_id = get_my_community_id()
    AND EXISTS (
      SELECT 1 FROM email_inbox_access
      WHERE email_address_id = email_sent_messages.email_address_id
        AND member_id = (SELECT id FROM members WHERE user_id = auth.uid() AND community_id = get_my_community_id() LIMIT 1)
        AND can_compose = true
    )
  );

-- ─── HELPER FUNCTIONS ────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_thread_message_count(thread_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE email_threads
  SET message_count = message_count + 1,
      last_message_at = now()
  WHERE id = thread_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── STORAGE BUCKET ─────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('email-attachments', 'email-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: community-scoped access
CREATE POLICY "Community members read email attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'email-attachments'
    AND (storage.foldername(name))[1] = get_my_community_id()::text
  );

CREATE POLICY "Board uploads email attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'email-attachments'
    AND (storage.foldername(name))[1] = get_my_community_id()::text
    AND is_board_member()
  );
