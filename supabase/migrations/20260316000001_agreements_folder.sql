-- Seed "Agreements" root folder for each community and add signed_agreement_id
-- to documents table so e-signed agreements can appear in the Documents section.

-- Add signed_agreement_id to documents for linking e-signed agreements
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS signed_agreement_id UUID REFERENCES signed_agreements(id);

-- Seed "Agreements" root folder for every community that doesn't already have one
INSERT INTO document_folders (community_id, name, parent_id, sort_order, created_by)
SELECT
  c.id,
  'Agreements',
  NULL,
  6,
  (SELECT m.id FROM members m WHERE m.community_id = c.id AND m.system_role IN ('board', 'manager', 'super_admin') LIMIT 1)
FROM communities c
WHERE NOT EXISTS (
  SELECT 1 FROM document_folders df
  WHERE df.community_id = c.id AND df.name = 'Agreements' AND df.parent_id IS NULL
)
-- Only insert if we can find a board member to set as created_by
AND EXISTS (
  SELECT 1 FROM members m WHERE m.community_id = c.id AND m.system_role IN ('board', 'manager', 'super_admin')
);

-- Rename any existing "Amenity Agreements" folders to "Agreements" so they merge
UPDATE document_folders
SET name = 'Agreements'
WHERE name = 'Amenity Agreements' AND parent_id IS NULL
AND NOT EXISTS (
  SELECT 1 FROM document_folders df2
  WHERE df2.community_id = document_folders.community_id
    AND df2.name = 'Agreements'
    AND df2.parent_id IS NULL
    AND df2.id != document_folders.id
);
