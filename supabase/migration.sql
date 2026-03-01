-- ============================================================
-- HOA PORTAL DATABASE SCHEMA
-- Designed for multi-tenant use (one Supabase project per HOA)
-- Run this in the Supabase SQL Editor for each new community
-- ============================================================

-- ─── ENUMS ───────────────────────────────────────────

CREATE TYPE member_role AS ENUM ('owner', 'member', 'tenant', 'minor');
CREATE TYPE system_role AS ENUM ('resident', 'board', 'manager', 'super_admin');
CREATE TYPE unit_status AS ENUM ('active', 'inactive');
CREATE TYPE request_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE invoice_status AS ENUM ('pending', 'paid', 'overdue', 'partial', 'waived');
CREATE TYPE reservation_status AS ENUM ('pending', 'approved', 'denied', 'cancelled');
CREATE TYPE event_visibility AS ENUM ('public', 'private');
CREATE TYPE doc_category AS ENUM ('rules', 'financial', 'meeting_minutes', 'forms', 'other');
CREATE TYPE announcement_priority AS ENUM ('normal', 'important', 'urgent');
CREATE TYPE signup_request_status AS ENUM ('pending', 'approved', 'denied');

-- ─── COMMUNITIES ─────────────────────────────────────

CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  theme JSONB DEFAULT '{}',
  tenant_permissions JSONB DEFAULT '{
    "can_reserve_amenities": false,
    "can_attend_events": true,
    "can_submit_requests": true,
    "can_view_directory": true
  }',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── UNITS ───────────────────────────────────────────

CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  address TEXT,
  status unit_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(community_id, unit_number)
);

CREATE INDEX idx_units_community ON units(community_id);

-- ─── MEMBERS ─────────────────────────────────────────

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  member_role member_role NOT NULL DEFAULT 'owner',
  system_role system_role NOT NULL DEFAULT 'resident',
  parent_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  show_in_directory BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_members_community ON members(community_id);
CREATE INDEX idx_members_unit ON members(unit_id);
CREATE INDEX idx_members_user ON members(user_id);

-- ─── SIGNUP REQUESTS (pending approval) ──────────────

CREATE TABLE signup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  unit_number TEXT,
  status signup_request_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES members(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_signup_requests_community ON signup_requests(community_id);
CREATE INDEX idx_signup_requests_status ON signup_requests(status);

-- ─── ANNOUNCEMENTS ───────────────────────────────────

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority announcement_priority DEFAULT 'normal',
  posted_by UUID NOT NULL REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_announcements_community ON announcements(community_id);
CREATE INDEX idx_announcements_created ON announcements(created_at DESC);

-- ─── DOCUMENTS ───────────────────────────────────────

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category doc_category NOT NULL DEFAULT 'other',
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID NOT NULL REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_documents_community ON documents(community_id);
CREATE INDEX idx_documents_category ON documents(category);

-- ─── MAINTENANCE REQUESTS ────────────────────────────

CREATE TABLE maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id),
  submitted_by UUID NOT NULL REFERENCES members(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status request_status DEFAULT 'open',
  admin_notes TEXT,
  assigned_to UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_requests_community ON maintenance_requests(community_id);
CREATE INDEX idx_requests_unit ON maintenance_requests(unit_id);
CREATE INDEX idx_requests_status ON maintenance_requests(status);

-- ─── INVOICES (tied to UNIT, not person) ─────────────

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id),
  title TEXT NOT NULL,
  description TEXT,
  amount INTEGER NOT NULL,
  due_date DATE NOT NULL,
  status invoice_status DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES members(id),
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoices_community ON invoices(community_id);
CREATE INDEX idx_invoices_unit ON invoices(unit_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- ─── PAYMENTS ────────────────────────────────────────

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id),
  amount INTEGER NOT NULL,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  paid_by UUID NOT NULL REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_unit ON payments(unit_id);

-- ─── AMENITIES ───────────────────────────────────────

CREATE TABLE amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER,
  fee INTEGER DEFAULT 0,
  deposit INTEGER DEFAULT 0,
  rules_text TEXT,
  operating_hours JSONB,
  auto_approve BOOLEAN DEFAULT false,
  requires_payment BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_amenities_community ON amenities(community_id);

-- ─── RESERVATIONS ────────────────────────────────────

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amenity_id UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id),
  reserved_by UUID NOT NULL REFERENCES members(id),
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  status reservation_status DEFAULT 'pending',
  purpose TEXT,
  guest_count INTEGER,
  fee_amount INTEGER DEFAULT 0,
  deposit_amount INTEGER DEFAULT 0,
  stripe_payment_id TEXT,
  deposit_refunded BOOLEAN DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_datetime CHECK (end_datetime > start_datetime)
);

CREATE INDEX idx_reservations_amenity ON reservations(amenity_id);
CREATE INDEX idx_reservations_community ON reservations(community_id);
CREATE INDEX idx_reservations_dates ON reservations(start_datetime, end_datetime);
CREATE INDEX idx_reservations_status ON reservations(status);

-- ─── EVENTS ──────────────────────────────────────────

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  amenity_id UUID REFERENCES amenities(id) ON DELETE SET NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  visibility event_visibility DEFAULT 'public',
  blocks_amenity BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_event_datetime CHECK (end_datetime > start_datetime)
);

CREATE INDEX idx_events_community ON events(community_id);
CREATE INDEX idx_events_dates ON events(start_datetime, end_datetime);
CREATE INDEX idx_events_amenity ON events(amenity_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE signup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's community_id
CREATE OR REPLACE FUNCTION get_my_community_id()
RETURNS UUID AS $fn$
  SELECT community_id FROM members WHERE user_id = auth.uid() AND is_approved = true LIMIT 1;
$fn$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is board/manager
CREATE OR REPLACE FUNCTION is_board_member()
RETURNS BOOLEAN AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM members
    WHERE user_id = auth.uid()
      AND is_approved = true
      AND system_role IN ('board', 'manager', 'super_admin')
  );
$fn$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's unit_id
CREATE OR REPLACE FUNCTION get_my_unit_id()
RETURNS UUID AS $fn$
  SELECT unit_id FROM members WHERE user_id = auth.uid() AND is_approved = true LIMIT 1;
$fn$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── COMMUNITIES RLS ─────────────────────────────────
CREATE POLICY "Members can view their community"
  ON communities FOR SELECT
  USING (id = get_my_community_id());

CREATE POLICY "Board can update their community"
  ON communities FOR UPDATE
  USING (id = get_my_community_id() AND is_board_member());

-- ─── UNITS RLS ───────────────────────────────────────
CREATE POLICY "Members can view units in their community"
  ON units FOR SELECT
  USING (community_id = get_my_community_id());

CREATE POLICY "Board can manage units"
  ON units FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member());

-- ─── MEMBERS RLS ─────────────────────────────────────
CREATE POLICY "Members can view approved members in their community"
  ON members FOR SELECT
  USING (community_id = get_my_community_id() AND is_approved = true);

CREATE POLICY "Users can view their own profile"
  ON members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Board can manage all members"
  ON members FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member());

-- ─── SIGNUP REQUESTS RLS ─────────────────────────────
CREATE POLICY "Users can view their own signup request"
  ON signup_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Board can manage signup requests"
  ON signup_requests FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member());

CREATE POLICY "Anyone can create a signup request"
  ON signup_requests FOR INSERT
  WITH CHECK (true);

-- ─── ANNOUNCEMENTS RLS ───────────────────────────────
CREATE POLICY "Members can view announcements"
  ON announcements FOR SELECT
  USING (community_id = get_my_community_id());

CREATE POLICY "Board can manage announcements"
  ON announcements FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member());

-- ─── DOCUMENTS RLS ───────────────────────────────────
CREATE POLICY "Members can view documents"
  ON documents FOR SELECT
  USING (community_id = get_my_community_id());

CREATE POLICY "Board can manage documents"
  ON documents FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member());

-- ─── MAINTENANCE REQUESTS RLS ────────────────────────
CREATE POLICY "Members can view their unit requests"
  ON maintenance_requests FOR SELECT
  USING (community_id = get_my_community_id() AND (unit_id = get_my_unit_id() OR is_board_member()));

CREATE POLICY "Members can create requests for their unit"
  ON maintenance_requests FOR INSERT
  WITH CHECK (community_id = get_my_community_id() AND unit_id = get_my_unit_id());

CREATE POLICY "Board can manage all requests"
  ON maintenance_requests FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member());

-- ─── INVOICES RLS ────────────────────────────────────
CREATE POLICY "Members can view their unit invoices"
  ON invoices FOR SELECT
  USING (community_id = get_my_community_id() AND (unit_id = get_my_unit_id() OR is_board_member()));

CREATE POLICY "Board can manage invoices"
  ON invoices FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member());

-- ─── PAYMENTS RLS ────────────────────────────────────
CREATE POLICY "Members can view their unit payments"
  ON payments FOR SELECT
  USING (unit_id = get_my_unit_id() OR is_board_member());

CREATE POLICY "Members can create payments for their unit"
  ON payments FOR INSERT
  WITH CHECK (unit_id = get_my_unit_id());

-- ─── AMENITIES RLS ───────────────────────────────────
CREATE POLICY "Members can view active amenities"
  ON amenities FOR SELECT
  USING (community_id = get_my_community_id());

CREATE POLICY "Board can manage amenities"
  ON amenities FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member());

-- ─── RESERVATIONS RLS ────────────────────────────────
CREATE POLICY "Members can view their own reservations"
  ON reservations FOR SELECT
  USING (community_id = get_my_community_id() AND (unit_id = get_my_unit_id() OR is_board_member()));

CREATE POLICY "Members can create reservations"
  ON reservations FOR INSERT
  WITH CHECK (community_id = get_my_community_id() AND unit_id = get_my_unit_id());

CREATE POLICY "Board can manage all reservations"
  ON reservations FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member());

-- ─── EVENTS RLS ──────────────────────────────────────
CREATE POLICY "Members can view events in their community"
  ON events FOR SELECT
  USING (community_id = get_my_community_id());

CREATE POLICY "Board can manage events"
  ON events FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member());

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at on maintenance_requests
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_maintenance_requests_updated_at
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Link auth.users to pre-provisioned members on signup
CREATE OR REPLACE FUNCTION link_auth_user_to_member()
RETURNS TRIGGER AS $fn$
BEGIN
  UPDATE members SET user_id = NEW.id WHERE email = NEW.email AND user_id IS NULL;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION link_auth_user_to_member();

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('hoa-documents', 'hoa-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Members can download documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hoa-documents' AND EXISTS (
    SELECT 1 FROM members WHERE user_id = auth.uid() AND is_approved = true
  ));

CREATE POLICY "Board can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'hoa-documents' AND is_board_member());

CREATE POLICY "Board can delete documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'hoa-documents' AND is_board_member());
