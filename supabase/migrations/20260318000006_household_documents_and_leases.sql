-- Household-level documents (board can attach docs to any unit)
CREATE TABLE IF NOT EXISTS household_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id    UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  unit_id         UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  file_path       TEXT NOT NULL,
  file_type       TEXT, -- mime type
  uploaded_by     UUID NOT NULL REFERENCES members(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_household_documents_unit
  ON household_documents(unit_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_household_documents_community
  ON household_documents(community_id);

ALTER TABLE household_documents ENABLE ROW LEVEL SECURITY;

-- Board full CRUD
CREATE POLICY household_documents_board_all ON household_documents
  FOR ALL USING (
    community_id = get_my_community_id() AND is_board_member()
  );

-- Residents can view their own unit's documents
CREATE POLICY household_documents_resident_select ON household_documents
  FOR SELECT USING (
    community_id = get_my_community_id()
    AND unit_id = get_my_unit_id()
  );

-- Lease fields on units table
ALTER TABLE units
  ADD COLUMN IF NOT EXISTS is_leased BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lease_document_path TEXT,
  ADD COLUMN IF NOT EXISTS lease_start_date DATE,
  ADD COLUMN IF NOT EXISTS lease_expiration_date DATE,
  ADD COLUMN IF NOT EXISTS lease_notification_rules JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Community-level default lease notification template
ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS default_lease_notification_rules JSONB NOT NULL DEFAULT '[{"days_before": 30}]'::jsonb;
