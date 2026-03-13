-- Member notes: board-only private notes about individual members
CREATE TABLE member_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  note         TEXT NOT NULL,
  created_by   UUID NOT NULL REFERENCES members(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_member_notes_member ON member_notes(member_id);
CREATE INDEX idx_member_notes_community ON member_notes(community_id);

ALTER TABLE member_notes ENABLE ROW LEVEL SECURITY;

-- Only board members can view and manage notes
CREATE POLICY "Board can manage member notes"
  ON member_notes FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member());
