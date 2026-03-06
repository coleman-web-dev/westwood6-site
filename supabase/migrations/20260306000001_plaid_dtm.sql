-- Plaid Data Transparency Messaging (DTM) support
-- Stores consent data returned by Plaid after Link completion

ALTER TABLE plaid_connections
  ADD COLUMN IF NOT EXISTS consented_products text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS consented_data_scopes jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS requires_reconsent boolean DEFAULT false;

-- Index for quickly finding connections that need re-consent
CREATE INDEX IF NOT EXISTS idx_plaid_connections_reconsent
  ON plaid_connections (community_id)
  WHERE requires_reconsent = true AND is_active = true;
