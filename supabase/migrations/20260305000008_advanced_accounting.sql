-- Migration: Advanced accounting features
-- Adds: recurring journal entries, delinquency automation

-- ─── Recurring Journal Entries ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS recurring_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  memo TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'annually')),
  next_run_date DATE NOT NULL,
  end_date DATE,
  lines JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_date DATE,
  times_run INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_entries_community ON recurring_journal_entries(community_id);
CREATE INDEX idx_recurring_entries_next_run ON recurring_journal_entries(next_run_date) WHERE is_active = true;

ALTER TABLE recurring_journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board can manage recurring entries" ON recurring_journal_entries
  FOR ALL USING (community_id = get_my_community_id() AND is_board_member());

-- ─── Delinquency Rules ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delinquency_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  days_overdue INTEGER NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('reminder', 'late_notice', 'lien_warning', 'lien_filed')),
  email_subject TEXT NOT NULL,
  email_body TEXT NOT NULL,
  apply_late_fee BOOLEAN NOT NULL DEFAULT false,
  late_fee_amount INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (community_id, step_order)
);

ALTER TABLE delinquency_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board can manage delinquency rules" ON delinquency_rules
  FOR ALL USING (community_id = get_my_community_id() AND is_board_member());

-- ─── Delinquency Action Log ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS delinquency_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES delinquency_rules(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email_sent BOOLEAN NOT NULL DEFAULT false,
  late_fee_applied BOOLEAN NOT NULL DEFAULT false,
  notes TEXT
);

CREATE INDEX idx_delinquency_actions_invoice ON delinquency_actions(invoice_id);
CREATE INDEX idx_delinquency_actions_community ON delinquency_actions(community_id);

ALTER TABLE delinquency_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board can view delinquency actions" ON delinquency_actions
  FOR ALL USING (community_id = get_my_community_id() AND is_board_member());
