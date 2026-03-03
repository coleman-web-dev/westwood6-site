-- Architectural Review Committee (ARC) Requests

-- Enums
DO $$ BEGIN
  CREATE TYPE arc_project_type AS ENUM ('fence', 'landscaping', 'paint', 'addition', 'deck', 'roof', 'solar', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE arc_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'approved_with_conditions', 'denied');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ARC requests table
CREATE TABLE IF NOT EXISTS arc_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES members(id),
  title TEXT NOT NULL,
  description TEXT,
  project_type arc_project_type NOT NULL DEFAULT 'other',
  estimated_cost INTEGER, -- cents
  photo_urls TEXT[] DEFAULT '{}',
  status arc_status NOT NULL DEFAULT 'draft',
  conditions TEXT,
  reviewed_by UUID REFERENCES members(id),
  reviewed_at TIMESTAMPTZ,
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_arc_requests_community ON arc_requests(community_id);
CREATE INDEX IF NOT EXISTS idx_arc_requests_unit ON arc_requests(unit_id);
CREATE INDEX IF NOT EXISTS idx_arc_requests_status ON arc_requests(status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_arc_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS arc_requests_updated_at ON arc_requests;
CREATE TRIGGER arc_requests_updated_at
  BEFORE UPDATE ON arc_requests
  FOR EACH ROW EXECUTE FUNCTION update_arc_requests_updated_at();

-- RLS
ALTER TABLE arc_requests ENABLE ROW LEVEL SECURITY;

-- Residents: see own unit + can insert drafts
CREATE POLICY arc_requests_resident_select ON arc_requests
  FOR SELECT USING (community_id = get_my_community_id() AND unit_id = get_my_unit_id());

CREATE POLICY arc_requests_resident_insert ON arc_requests
  FOR INSERT WITH CHECK (community_id = get_my_community_id() AND unit_id = get_my_unit_id());

CREATE POLICY arc_requests_resident_update ON arc_requests
  FOR UPDATE USING (
    community_id = get_my_community_id()
    AND unit_id = get_my_unit_id()
    AND status IN ('draft')
  );

-- Board: full access
CREATE POLICY arc_requests_board_all ON arc_requests
  FOR ALL USING (community_id = get_my_community_id() AND is_board_member());
