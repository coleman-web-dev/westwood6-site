-- ARC request response thread: allows residents and board to communicate
-- about ARC requests with text messages and file attachments.

CREATE TABLE IF NOT EXISTS arc_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arc_request_id  UUID NOT NULL REFERENCES arc_requests(id) ON DELETE CASCADE,
  community_id    UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  posted_by       UUID NOT NULL REFERENCES members(id),
  body            TEXT NOT NULL,
  attachment_urls  TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Primary query: fetch thread for an ARC request in chronological order
CREATE INDEX IF NOT EXISTS idx_arc_responses_request
  ON arc_responses(arc_request_id, created_at ASC);

-- RLS performance
CREATE INDEX IF NOT EXISTS idx_arc_responses_community
  ON arc_responses(community_id);

ALTER TABLE arc_responses ENABLE ROW LEVEL SECURITY;

-- Board can see all responses in their community
CREATE POLICY arc_responses_board_select ON arc_responses
  FOR SELECT USING (
    community_id = get_my_community_id() AND is_board_member()
  );

-- Residents can see responses on ARC requests for their own unit
CREATE POLICY arc_responses_resident_select ON arc_responses
  FOR SELECT USING (
    community_id = get_my_community_id()
    AND EXISTS (
      SELECT 1 FROM arc_requests ar
      WHERE ar.id = arc_responses.arc_request_id
        AND ar.unit_id = get_my_unit_id()
    )
  );

-- Any community member can insert (access scoped by community)
CREATE POLICY arc_responses_insert ON arc_responses
  FOR INSERT WITH CHECK (community_id = get_my_community_id());

-- Board can delete any response
CREATE POLICY arc_responses_board_delete ON arc_responses
  FOR DELETE USING (
    community_id = get_my_community_id() AND is_board_member()
  );

-- Authors can delete their own responses
CREATE POLICY arc_responses_author_delete ON arc_responses
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
CREATE TRIGGER set_arc_responses_updated_at
  BEFORE UPDATE ON arc_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
