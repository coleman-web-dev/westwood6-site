-- Estoppel Certificate Requests
-- Tracks requests from external parties (attorneys, title companies) for estoppel certificates.
-- Template configuration is stored in communities.theme.estoppel_settings.

CREATE TABLE IF NOT EXISTS estoppel_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,

  -- Dynamic field answers stored as JSONB (keyed by template field keys)
  requester_fields JSONB NOT NULL DEFAULT '{}',
  system_fields JSONB NOT NULL DEFAULT '{}',
  board_fields JSONB NOT NULL DEFAULT '{}',

  -- Unit lookup (matched from requester's lot/unit input)
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,

  -- Request type & payment
  request_type TEXT NOT NULL DEFAULT 'standard'
    CHECK (request_type IN ('standard', 'expedited')),
  fee_amount INTEGER NOT NULL DEFAULT 0,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  paid_at TIMESTAMPTZ,

  -- Certification / e-signature
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_review', 'completed', 'cancelled')),
  completed_by UUID REFERENCES members(id) ON DELETE SET NULL,
  completed_by_name TEXT,
  completed_by_title TEXT,
  completed_at TIMESTAMPTZ,
  signature_name TEXT,

  -- Delivery
  delivery_email TEXT NOT NULL,
  pdf_path TEXT,
  delivered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_estoppel_requests_community ON estoppel_requests(community_id);
CREATE INDEX IF NOT EXISTS idx_estoppel_requests_status ON estoppel_requests(community_id, status);
CREATE INDEX IF NOT EXISTS idx_estoppel_requests_stripe_session ON estoppel_requests(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- Updated_at trigger (reuse existing function from initial schema)
DROP TRIGGER IF EXISTS set_estoppel_requests_updated_at ON estoppel_requests;
CREATE TRIGGER set_estoppel_requests_updated_at
  BEFORE UPDATE ON estoppel_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE estoppel_requests ENABLE ROW LEVEL SECURITY;

-- Board members can view estoppel requests for their community
DROP POLICY IF EXISTS "Board members can view estoppel requests" ON estoppel_requests;
CREATE POLICY "Board members can view estoppel requests"
  ON estoppel_requests FOR SELECT
  USING (community_id = get_my_community_id() AND is_board_member());

-- Board members can update estoppel requests for their community
DROP POLICY IF EXISTS "Board members can update estoppel requests" ON estoppel_requests;
CREATE POLICY "Board members can update estoppel requests"
  ON estoppel_requests FOR UPDATE
  USING (community_id = get_my_community_id() AND is_board_member());

-- Insert is done via admin client (webhook handler), no public INSERT policy needed
