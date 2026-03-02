-- ─── Payment Frequency & Recurring Assessments ────────

-- Payment frequency enum
DO $$ BEGIN
  CREATE TYPE payment_frequency AS ENUM ('monthly', 'quarterly', 'semi_annual', 'annual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Unit payment frequency preference (null = use community default)
ALTER TABLE units ADD COLUMN IF NOT EXISTS payment_frequency payment_frequency;

-- Assessments table (board creates recurring annual charges)
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  annual_amount INTEGER NOT NULL, -- cents
  fiscal_year_start DATE NOT NULL,
  fiscal_year_end DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assessments_community ON assessments(community_id);

-- Link invoices to their source assessment
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL;

-- ─── RLS for assessments ────────────────────────────

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view community assessments" ON assessments;
CREATE POLICY "Members can view community assessments"
  ON assessments FOR SELECT
  USING (community_id = get_my_community_id());

DROP POLICY IF EXISTS "Board can insert assessments" ON assessments;
CREATE POLICY "Board can insert assessments"
  ON assessments FOR INSERT
  WITH CHECK (community_id = get_my_community_id() AND is_board_member());

DROP POLICY IF EXISTS "Board can update assessments" ON assessments;
CREATE POLICY "Board can update assessments"
  ON assessments FOR UPDATE
  USING (community_id = get_my_community_id() AND is_board_member());

DROP POLICY IF EXISTS "Board can delete assessments" ON assessments;
CREATE POLICY "Board can delete assessments"
  ON assessments FOR DELETE
  USING (community_id = get_my_community_id() AND is_board_member());
