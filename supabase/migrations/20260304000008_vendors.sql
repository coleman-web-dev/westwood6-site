-- Vendor Management

-- Enums
DO $$ BEGIN
  CREATE TYPE vendor_category AS ENUM ('landscaping', 'plumbing', 'electrical', 'hvac', 'painting', 'roofing', 'cleaning', 'security', 'general', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vendor_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  category vendor_category NOT NULL DEFAULT 'general',
  license_number TEXT,
  insurance_expiry DATE,
  notes TEXT,
  status vendor_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link vendors to maintenance requests
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendors_community ON vendors(community_id);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);

-- RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Board: full CRUD
CREATE POLICY vendors_board_all ON vendors
  FOR ALL USING (community_id = get_my_community_id() AND is_board_member());

-- All members: can see active vendors
CREATE POLICY vendors_member_select ON vendors
  FOR SELECT USING (community_id = get_my_community_id() AND status = 'active');
