-- ─── Document Folders ─────────────────────────────────────────────────────

CREATE TABLE document_folders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  created_by   UUID NOT NULL REFERENCES members(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (community_id, name)
);

CREATE INDEX idx_document_folders_community ON document_folders(community_id);

ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

-- Board members: full CRUD
CREATE POLICY "Board can manage document folders"
  ON document_folders FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member());

-- All approved members: read
CREATE POLICY "Members can view document folders"
  ON document_folders FOR SELECT
  USING (community_id = get_my_community_id());

-- ─── Add folder_id to documents ───────────────────────────────────────────

ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL;

CREATE INDEX idx_documents_folder ON documents(folder_id);
