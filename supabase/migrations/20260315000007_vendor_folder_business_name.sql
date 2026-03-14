-- ─── Fix vendor subfolder names to use business name ─────────────────────────
-- Use COALESCE(company, name) to prefer business name over contact name,
-- matching the display pattern used in the vendor list UI.

UPDATE document_folders df
SET name = COALESCE(v.company, v.name)
FROM vendors v
WHERE v.document_folder_id = df.id
  AND v.company IS NOT NULL
  AND v.company != ''
  AND df.name != v.company;
