-- ============================================================
-- AUTO-FETCH BANK STATEMENTS FROM PLAID
-- Extends statement_uploads to track Plaid-sourced statements
-- and plaid_connections to track Statements product consent.
-- ============================================================

-- Track source and Plaid statement ID on uploads
ALTER TABLE statement_uploads
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'plaid')),
  ADD COLUMN IF NOT EXISTS plaid_statement_id TEXT,
  ADD COLUMN IF NOT EXISTS plaid_connection_id UUID REFERENCES plaid_connections(id);

CREATE INDEX IF NOT EXISTS idx_statement_uploads_plaid_stmt
  ON statement_uploads(plaid_statement_id) WHERE plaid_statement_id IS NOT NULL;

-- Track Statements product consent and last fetch time
ALTER TABLE plaid_connections
  ADD COLUMN IF NOT EXISTS has_statements_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS statements_last_fetched_at TIMESTAMPTZ;
