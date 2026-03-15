-- Make file_path nullable on documents table.
-- E-signed agreements may not have a physical file (fallback if PDF generation fails).
ALTER TABLE documents ALTER COLUMN file_path DROP NOT NULL;
