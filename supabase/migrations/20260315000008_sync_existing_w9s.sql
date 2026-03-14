-- ─── Sync existing W-9 documents to vendor_documents + documents ─────────────
-- W-9s are stored on the vendor record (w9_document_path) but were not
-- previously tracked in vendor_documents or synced to the documents section.

DO $$
DECLARE
  v RECORD;
  vr RECORD;
  new_vd_id UUID;
  vendor_folder_id UUID;
  first_member_id UUID;
BEGIN
  -- For each vendor that has a W-9 on file
  FOR v IN
    SELECT id, community_id, name, company, w9_document_path, document_folder_id
    FROM vendors
    WHERE w9_on_file = true AND w9_document_path IS NOT NULL AND w9_document_path != ''
  LOOP
    -- Skip if a W-9 vendor_document already exists for this vendor
    IF EXISTS (
      SELECT 1 FROM vendor_documents
      WHERE vendor_id = v.id AND document_type = 'w9'
    ) THEN
      CONTINUE;
    END IF;

    -- Find a member for created_by
    SELECT id INTO first_member_id
    FROM members WHERE community_id = v.community_id LIMIT 1;

    IF first_member_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Create vendor_documents entry for this W-9
    INSERT INTO vendor_documents (id, vendor_id, community_id, document_type, title, file_path, file_size, uploaded_by)
    VALUES (gen_random_uuid(), v.id, v.community_id, 'w9', 'W-9', v.w9_document_path, NULL, first_member_id)
    RETURNING id INTO new_vd_id;

    -- Ensure vendor has a subfolder
    vendor_folder_id := v.document_folder_id;

    IF vendor_folder_id IS NULL THEN
      -- Find the Vendors root folder
      SELECT df.id INTO vr FROM document_folders df
      WHERE df.community_id = v.community_id AND df.name = 'Vendors' AND df.parent_id IS NULL;

      IF vr IS NOT NULL THEN
        -- Create subfolder for this vendor
        INSERT INTO document_folders (community_id, name, parent_id, sort_order, created_by)
        VALUES (v.community_id, COALESCE(v.company, v.name), vr, 0, first_member_id)
        ON CONFLICT (community_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name) DO NOTHING
        RETURNING id INTO vendor_folder_id;

        -- If conflict, look it up
        IF vendor_folder_id IS NULL THEN
          SELECT id INTO vendor_folder_id FROM document_folders
          WHERE community_id = v.community_id AND parent_id = vr AND name = COALESCE(v.company, v.name);
        END IF;

        -- Link vendor to subfolder
        IF vendor_folder_id IS NOT NULL THEN
          UPDATE vendors SET document_folder_id = vendor_folder_id WHERE id = v.id;
        END IF;
      END IF;
    END IF;

    -- Sync to documents table
    IF vendor_folder_id IS NOT NULL THEN
      INSERT INTO documents (community_id, title, category, folder_id, file_path, file_size, visibility, is_public, uploaded_by, vendor_document_id)
      VALUES (v.community_id, 'W-9', 'other', vendor_folder_id, v.w9_document_path, NULL, 'private', false, first_member_id, new_vd_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;
