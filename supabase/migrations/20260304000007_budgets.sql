-- Budget & Reserve Tracking

-- Enum
DO $$ BEGIN
  CREATE TYPE budget_category AS ENUM ('dues', 'assessments', 'amenity_fees', 'interest', 'maintenance', 'landscaping', 'insurance', 'utilities', 'management', 'legal', 'reserves', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  total_income INTEGER NOT NULL DEFAULT 0,
  total_expense INTEGER NOT NULL DEFAULT 0,
  reserve_contribution INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, fiscal_year)
);

-- Budget line items table
CREATE TABLE IF NOT EXISTS budget_line_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  category budget_category NOT NULL DEFAULT 'other',
  name TEXT NOT NULL,
  budgeted_amount INTEGER NOT NULL DEFAULT 0,
  actual_amount INTEGER NOT NULL DEFAULT 0,
  is_income BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_budgets_community ON budgets(community_id);
CREATE INDEX IF NOT EXISTS idx_budget_line_items_budget ON budget_line_items(budget_id);

-- RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_line_items ENABLE ROW LEVEL SECURITY;

-- Board-only access for budgets
CREATE POLICY budgets_board_all ON budgets
  FOR ALL USING (community_id = get_my_community_id() AND is_board_member());

-- Board-only access for line items
CREATE POLICY budget_line_items_board_all ON budget_line_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM budgets b
      WHERE b.id = budget_line_items.budget_id
        AND b.community_id = get_my_community_id()
        AND is_board_member()
    )
  );
