-- Demo request leads from landing page
CREATE TABLE IF NOT EXISTS demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  community_name TEXT,
  unit_count INTEGER,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS - admin-only via service role
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;
