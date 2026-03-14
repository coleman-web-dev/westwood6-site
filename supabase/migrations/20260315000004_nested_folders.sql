-- ─── Nested Folders Support ──────────────────────────────────────────────────
-- Add parent_id to document_folders for hierarchical folder structure.
-- Allows creating sub-folders inside folders (one level of nesting supported in UI).

-- 1. Add parent_id column (nullable, self-referencing FK with CASCADE delete)
ALTER TABLE document_folders
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES document_folders(id) ON DELETE CASCADE;

-- 2. Index for efficient parent lookups
CREATE INDEX IF NOT EXISTS idx_document_folders_parent ON document_folders(parent_id);

-- 3. Replace the old unique constraint (community_id, name) with one that
--    accounts for parent_id, so the same folder name can exist in different parents.
--    Use COALESCE to handle NULL parent_id (root-level folders).
ALTER TABLE document_folders DROP CONSTRAINT IF EXISTS document_folders_community_id_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_folders_unique_name
  ON document_folders (community_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name);
