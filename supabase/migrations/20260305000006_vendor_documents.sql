-- Vendor Documents & Insurance Expiry Reminders

-- Enum for vendor document types
DO $$ BEGIN
  CREATE TYPE vendor_document_type AS ENUM ('contract', 'insurance_cert', 'license', 'w9', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Vendor documents table
CREATE TABLE IF NOT EXISTS vendor_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  document_type vendor_document_type NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendor_documents_vendor_type ON vendor_documents(vendor_id, document_type);
CREATE INDEX IF NOT EXISTS idx_vendor_documents_community ON vendor_documents(community_id);

-- RLS
ALTER TABLE vendor_documents ENABLE ROW LEVEL SECURITY;

-- Board: full CRUD
CREATE POLICY vendor_documents_board_all ON vendor_documents
  FOR ALL USING (community_id = get_my_community_id() AND is_board_member());

-- All members: can view documents
CREATE POLICY vendor_documents_member_select ON vendor_documents
  FOR SELECT USING (community_id = get_my_community_id());

-- Add insurance_reminder_email to email_category enum
ALTER TYPE email_category ADD VALUE IF NOT EXISTS 'insurance_reminder_email';
