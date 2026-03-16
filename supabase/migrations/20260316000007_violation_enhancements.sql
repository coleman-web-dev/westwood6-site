-- Violation enhancements: compliance deadlines, templates, fine linking

-- 1. Compliance deadline columns on violations
ALTER TABLE violations ADD COLUMN IF NOT EXISTS compliance_deadline DATE;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS auto_escalated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_violations_deadline ON violations(compliance_deadline)
  WHERE compliance_deadline IS NOT NULL AND status NOT IN ('resolved', 'dismissed');

-- 2. Violation templates table
CREATE TABLE IF NOT EXISTS violation_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category violation_category NOT NULL DEFAULT 'other',
  severity violation_severity NOT NULL DEFAULT 'warning',
  default_fine_amount INTEGER,
  default_deadline_days INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_violation_templates_community
  ON violation_templates(community_id);

-- Reuse existing updated_at trigger function
CREATE TRIGGER violation_templates_updated_at
  BEFORE UPDATE ON violation_templates
  FOR EACH ROW EXECUTE FUNCTION update_violations_updated_at();

-- RLS
ALTER TABLE violation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY violation_templates_board_all ON violation_templates
  FOR ALL USING (community_id = get_my_community_id() AND is_board_member());

CREATE POLICY violation_templates_resident_select ON violation_templates
  FOR SELECT USING (community_id = get_my_community_id() AND is_active = true);

-- 3. Fine linking: add violation_id FK to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS violation_id UUID REFERENCES violations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_violation ON invoices(violation_id)
  WHERE violation_id IS NOT NULL;
