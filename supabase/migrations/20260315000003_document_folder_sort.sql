-- ─── Document Folder Sort Order + Unified Organization ──────────────────────
-- Unify categories and folders: folders become the single organizational unit.
-- Tabs are generated dynamically from folders. Default folders map to the
-- existing category enum values.

-- 1. Add sort_order column for folder reordering
ALTER TABLE document_folders ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 2. Seed default folders for every existing community that has no folders yet.
--    For communities that already have folders, we still create the defaults
--    (only if no name collision exists, thanks to ON CONFLICT).
DO $$
DECLARE
  comm RECORD;
  default_folders TEXT[] := ARRAY['Rules', 'Financial', 'Meeting Minutes', 'Forms', 'Other'];
  folder_name TEXT;
  idx INTEGER;
  first_member_id UUID;
BEGIN
  FOR comm IN SELECT id FROM communities LOOP
    -- Find any member in this community to use as created_by
    SELECT id INTO first_member_id
    FROM members
    WHERE community_id = comm.id
    LIMIT 1;

    -- Skip if community has no members (shouldn't happen in practice)
    IF first_member_id IS NULL THEN
      CONTINUE;
    END IF;

    idx := 0;
    FOREACH folder_name IN ARRAY default_folders LOOP
      INSERT INTO document_folders (community_id, name, created_by, sort_order)
      VALUES (comm.id, folder_name, first_member_id, idx)
      ON CONFLICT (community_id, name) DO UPDATE SET sort_order = EXCLUDED.sort_order;
      idx := idx + 1;
    END LOOP;
  END LOOP;
END $$;

-- 3. Migrate documents: assign folder_id based on category for docs without a folder.
--    Map category enum values to their corresponding folder names.
DO $$
DECLARE
  cat_to_folder RECORD;
BEGIN
  FOR cat_to_folder IN
    SELECT d.id AS doc_id, df.id AS folder_id
    FROM documents d
    JOIN document_folders df ON df.community_id = d.community_id
      AND df.name = CASE d.category
        WHEN 'rules' THEN 'Rules'
        WHEN 'financial' THEN 'Financial'
        WHEN 'meeting_minutes' THEN 'Meeting Minutes'
        WHEN 'forms' THEN 'Forms'
        WHEN 'other' THEN 'Other'
      END
    WHERE d.folder_id IS NULL
  LOOP
    UPDATE documents SET folder_id = cat_to_folder.folder_id WHERE id = cat_to_folder.doc_id;
  END LOOP;
END $$;
