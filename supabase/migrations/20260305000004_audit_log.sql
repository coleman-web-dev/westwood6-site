-- Audit log for security compliance and access reviews
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_community ON audit_logs(community_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Board members can read their community's audit logs
CREATE POLICY "Board can read audit logs" ON audit_logs
  FOR SELECT USING (
    community_id = get_my_community_id()
    AND is_board_member()
  );

-- No INSERT/UPDATE/DELETE policies for authenticated role
-- All inserts go through admin client (service role)
