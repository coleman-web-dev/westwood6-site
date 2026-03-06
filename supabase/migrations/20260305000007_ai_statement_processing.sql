-- AI Statement Processing: vendor on categorization rules + statement uploads table

-- Add vendor_id to categorization_rules for auto-vendor assignment
ALTER TABLE categorization_rules ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);

-- Statement uploads for AI processing
CREATE TABLE IF NOT EXISTS statement_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  plaid_bank_account_id UUID REFERENCES plaid_bank_accounts(id),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  period_month INTEGER NOT NULL,  -- 1-12
  period_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
  ai_results JSONB,               -- parsed transactions, check images, vendor matches
  transactions_found INTEGER DEFAULT 0,
  checks_found INTEGER DEFAULT 0,
  auto_categorized INTEGER DEFAULT 0,
  error_message TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_statement_uploads_community ON statement_uploads(community_id);
CREATE INDEX IF NOT EXISTS idx_statement_uploads_period ON statement_uploads(period_year, period_month);

-- RLS: Board-only
ALTER TABLE statement_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Board can manage statement uploads"
  ON statement_uploads FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member())
  WITH CHECK (community_id = get_my_community_id() AND is_board_member());
