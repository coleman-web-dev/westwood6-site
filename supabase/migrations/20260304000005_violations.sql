-- Violation/Compliance Tracking

-- Enums
DO $$ BEGIN
  CREATE TYPE violation_category AS ENUM ('architectural', 'noise', 'parking', 'maintenance', 'pets', 'trash', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE violation_status AS ENUM ('reported', 'under_review', 'notice_sent', 'in_compliance', 'escalated', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE violation_severity AS ENUM ('warning', 'minor', 'major', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notice_type AS ENUM ('courtesy', 'first_notice', 'second_notice', 'final_notice', 'hearing_notice');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_method AS ENUM ('email', 'mail', 'both');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add violation_notice to email_category enum
ALTER TYPE email_category ADD VALUE IF NOT EXISTS 'violation_notice';

-- Violations table
CREATE TABLE IF NOT EXISTS violations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES members(id),
  category violation_category NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  status violation_status NOT NULL DEFAULT 'reported',
  severity violation_severity NOT NULL DEFAULT 'warning',
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Violation notices table
CREATE TABLE IF NOT EXISTS violation_notices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  violation_id UUID NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
  notice_type notice_type NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_by UUID REFERENCES members(id),
  delivery_method delivery_method NOT NULL DEFAULT 'email',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_violations_community ON violations(community_id);
CREATE INDEX IF NOT EXISTS idx_violations_unit ON violations(unit_id);
CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);
CREATE INDEX IF NOT EXISTS idx_violation_notices_violation ON violation_notices(violation_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_violations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS violations_updated_at ON violations;
CREATE TRIGGER violations_updated_at
  BEFORE UPDATE ON violations
  FOR EACH ROW EXECUTE FUNCTION update_violations_updated_at();

-- RLS
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE violation_notices ENABLE ROW LEVEL SECURITY;

-- Board: full access to violations
CREATE POLICY violations_board_all ON violations
  FOR ALL USING (community_id = get_my_community_id() AND is_board_member());

-- Residents: see own unit violations
CREATE POLICY violations_resident_select ON violations
  FOR SELECT USING (community_id = get_my_community_id() AND unit_id = get_my_unit_id());

-- Board: full access to notices
CREATE POLICY violation_notices_board_all ON violation_notices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM violations v
      WHERE v.id = violation_notices.violation_id
        AND v.community_id = get_my_community_id()
        AND is_board_member()
    )
  );

-- Residents: see notices for own unit violations
CREATE POLICY violation_notices_resident_select ON violation_notices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM violations v
      WHERE v.id = violation_notices.violation_id
        AND v.community_id = get_my_community_id()
        AND v.unit_id = get_my_unit_id()
    )
  );
