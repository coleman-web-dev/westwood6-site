-- Violation response thread: allows residents and board to communicate
-- about violations with text messages and file attachments.

CREATE TABLE IF NOT EXISTS violation_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id    UUID NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
  community_id    UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  posted_by       UUID NOT NULL REFERENCES members(id),
  body            TEXT NOT NULL,
  attachment_urls  TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Primary query: fetch thread for a violation in chronological order
CREATE INDEX IF NOT EXISTS idx_violation_responses_violation
  ON violation_responses(violation_id, created_at ASC);

-- RLS performance
CREATE INDEX IF NOT EXISTS idx_violation_responses_community
  ON violation_responses(community_id);

ALTER TABLE violation_responses ENABLE ROW LEVEL SECURITY;

-- Board can see all responses in their community
CREATE POLICY violation_responses_board_select ON violation_responses
  FOR SELECT USING (
    community_id = get_my_community_id() AND is_board_member()
  );

-- Residents can see responses on violations for their own unit
CREATE POLICY violation_responses_resident_select ON violation_responses
  FOR SELECT USING (
    community_id = get_my_community_id()
    AND EXISTS (
      SELECT 1 FROM violations v
      WHERE v.id = violation_responses.violation_id
        AND v.unit_id = get_my_unit_id()
    )
  );

-- Any community member can insert (server action enforces violation access)
CREATE POLICY violation_responses_insert ON violation_responses
  FOR INSERT WITH CHECK (community_id = get_my_community_id());

-- Board can delete any response
CREATE POLICY violation_responses_board_delete ON violation_responses
  FOR DELETE USING (
    community_id = get_my_community_id() AND is_board_member()
  );

-- Authors can delete their own responses
CREATE POLICY violation_responses_author_delete ON violation_responses
  FOR DELETE USING (
    community_id = get_my_community_id()
    AND posted_by = (
      SELECT id FROM members
      WHERE user_id = auth.uid()
        AND community_id = get_my_community_id()
      LIMIT 1
    )
  );

-- Auto-update updated_at on row changes
CREATE TRIGGER set_violation_responses_updated_at
  BEFORE UPDATE ON violation_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
