-- ─── COMMUNITY EMAIL DOMAINS ─────────────────────────────
-- Domain configuration per community for custom sending/receiving

CREATE TYPE email_domain_status AS ENUM (
  'not_started',
  'pending',
  'verified',
  'failed',
  'temporary_failure'
);

CREATE TABLE community_email_domains (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id     UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  resend_domain_id TEXT NOT NULL,
  domain_name      TEXT NOT NULL,
  domain_type      TEXT NOT NULL DEFAULT 'custom',  -- 'custom' or 'subdomain'
  status           email_domain_status NOT NULL DEFAULT 'not_started',
  dns_records      JSONB NOT NULL DEFAULT '[]',
  is_active        BOOLEAN NOT NULL DEFAULT false,
  last_verified_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT community_email_domains_community_unique UNIQUE (community_id),
  CONSTRAINT community_email_domains_resend_unique UNIQUE (resend_domain_id)
);

CREATE INDEX idx_community_email_domains_community
  ON community_email_domains(community_id);

-- RLS
ALTER TABLE community_email_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own community email domain"
  ON community_email_domains FOR SELECT
  USING (community_id = get_my_community_id());

CREATE POLICY "Board manages community email domain"
  ON community_email_domains FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member())
  WITH CHECK (community_id = get_my_community_id() AND is_board_member());

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_community_email_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER community_email_domains_updated_at
  BEFORE UPDATE ON community_email_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_community_email_domains_updated_at();


-- ─── EMAIL ADDRESSES ─────────────────────────────────────
-- Individual sending/receiving addresses tied to a community domain

CREATE TABLE email_addresses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id     UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  domain_id        UUID NOT NULL REFERENCES community_email_domains(id) ON DELETE CASCADE,
  address          TEXT NOT NULL,
  display_name     TEXT,
  address_type     TEXT NOT NULL DEFAULT 'community',  -- 'community' (shared) or 'role' (individual)
  role_label       TEXT,
  assigned_to      UUID REFERENCES members(id) ON DELETE SET NULL,
  forward_to       TEXT,
  is_default       BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT email_addresses_address_unique UNIQUE (address)
);

CREATE INDEX idx_email_addresses_community ON email_addresses(community_id);
CREATE INDEX idx_email_addresses_domain ON email_addresses(domain_id);
CREATE INDEX idx_email_addresses_assigned ON email_addresses(assigned_to);

-- RLS
ALTER TABLE email_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own community email addresses"
  ON email_addresses FOR SELECT
  USING (community_id = get_my_community_id());

CREATE POLICY "Board manages email addresses"
  ON email_addresses FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member())
  WITH CHECK (community_id = get_my_community_id() AND is_board_member());

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_email_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_addresses_updated_at
  BEFORE UPDATE ON email_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_email_addresses_updated_at();
