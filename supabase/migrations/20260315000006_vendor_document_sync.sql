-- ─── Vendor Document Sync to Documents Section ──────────────────────────────
-- Sync vendor documents into the main documents section under a "Vendors"
-- root folder with auto-created per-vendor subfolders.
-- Vendor documents persist even if a vendor is deactivated or deleted.

-- 1. Create "Vendors" root folder for ALL communities (default folder like Rules, Financial, etc.)
DO $$
DECLARE
  comm RECORD;
  first_member_id UUID;
BEGIN
  FOR comm IN SELECT id FROM communities LOOP
    SELECT id INTO first_member_id
    FROM members
    WHERE community_id = comm.id
    LIMIT 1;

    IF first_member_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO document_folders (community_id, name, parent_id, sort_order, created_by)
    VALUES (comm.id, 'Vendors', NULL, 4, first_member_id)
    ON CONFLICT (community_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name) DO NOTHING;
  END LOOP;
END $$;

-- 2. Add document_folder_id to vendors (tracks the auto-created subfolder)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS document_folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL;

-- 3. Add vendor_document_id to documents (links synced docs back to source)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS vendor_document_id UUID REFERENCES vendor_documents(id) ON DELETE SET NULL;

-- 4. Change vendor_documents FK from ON DELETE CASCADE to ON DELETE SET NULL
--    so vendor documents survive vendor deletion.
ALTER TABLE vendor_documents ALTER COLUMN vendor_id DROP NOT NULL;
ALTER TABLE vendor_documents DROP CONSTRAINT IF EXISTS vendor_documents_vendor_id_fkey;
ALTER TABLE vendor_documents ADD CONSTRAINT vendor_documents_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;

-- 5. Create per-vendor subfolders and sync existing vendor_documents
DO $$
DECLARE
  vr RECORD;    -- vendors root folder
  v RECORD;     -- vendor with docs
  new_folder_id UUID;
  vd RECORD;    -- vendor document
  first_member_id UUID;
BEGIN
  -- For each community's "Vendors" root folder
  FOR vr IN
    SELECT df.id AS folder_id, df.community_id
    FROM document_folders df
    WHERE df.name = 'Vendors' AND df.parent_id IS NULL
  LOOP
    -- For each vendor in that community that has documents
    FOR v IN
      SELECT DISTINCT ven.id, ven.name
      FROM vendors ven
      JOIN vendor_documents vdoc ON vdoc.vendor_id = ven.id
      WHERE ven.community_id = vr.community_id
    LOOP
      -- Find a member for created_by
      SELECT id INTO first_member_id
      FROM members
      WHERE community_id = vr.community_id
      LIMIT 1;

      IF first_member_id IS NULL THEN
        CONTINUE;
      END IF;

      -- Create subfolder for this vendor
      INSERT INTO document_folders (community_id, name, parent_id, sort_order, created_by)
      VALUES (vr.community_id, v.name, vr.folder_id, 0, first_member_id)
      ON CONFLICT (community_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name) DO NOTHING
      RETURNING id INTO new_folder_id;

      -- If ON CONFLICT hit (folder already exists), look it up
      IF new_folder_id IS NULL THEN
        SELECT id INTO new_folder_id
        FROM document_folders
        WHERE community_id = vr.community_id AND parent_id = vr.folder_id AND name = v.name;
      END IF;

      -- Link vendor to its subfolder
      UPDATE vendors SET document_folder_id = new_folder_id WHERE id = v.id;

      -- Sync each vendor_document into the documents table
      FOR vd IN
        SELECT * FROM vendor_documents WHERE vendor_id = v.id
      LOOP
        INSERT INTO documents (community_id, title, category, folder_id, file_path, file_size, visibility, is_public, uploaded_by, vendor_document_id)
        VALUES (
          vd.community_id,
          vd.title,
          'other',
          new_folder_id,
          vd.file_path,
          vd.file_size,
          'private',
          false,
          COALESCE(vd.uploaded_by, first_member_id),
          vd.id
        )
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
