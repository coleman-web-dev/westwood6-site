-- Add RSVP configuration columns to events table
ALTER TABLE events ADD COLUMN rsvp_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN rsvp_fee INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN rsvp_fee_type TEXT NOT NULL DEFAULT 'flat' CHECK (rsvp_fee_type IN ('per_person', 'flat'));
ALTER TABLE events ADD COLUMN rsvp_max_capacity INTEGER;
ALTER TABLE events ADD COLUMN rsvp_allow_cancellation BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE events ADD COLUMN rsvp_cancellation_notice_hours INTEGER;

-- Create event_rsvps table
CREATE TABLE event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id),
  member_id UUID NOT NULL REFERENCES members(id),
  unit_id UUID REFERENCES units(id),
  guest_count INTEGER NOT NULL DEFAULT 1,
  total_fee INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'pending_payment')),
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, member_id)
);

CREATE INDEX idx_event_rsvps_event ON event_rsvps(event_id);
CREATE INDEX idx_event_rsvps_member ON event_rsvps(member_id);
CREATE INDEX idx_event_rsvps_community ON event_rsvps(community_id);

-- RLS policies
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

-- Members can view RSVPs for their community
CREATE POLICY "Members can view community RSVPs"
  ON event_rsvps FOR SELECT
  USING (community_id = get_my_community_id());

-- Members can insert their own RSVPs
CREATE POLICY "Members can create own RSVPs"
  ON event_rsvps FOR INSERT
  WITH CHECK (
    community_id = get_my_community_id()
    AND member_id = (
      SELECT id FROM members
      WHERE user_id = auth.uid() AND community_id = event_rsvps.community_id
      LIMIT 1
    )
  );

-- Members can update their own RSVPs (for cancellation)
CREATE POLICY "Members can update own RSVPs"
  ON event_rsvps FOR UPDATE
  USING (
    member_id = (
      SELECT id FROM members
      WHERE user_id = auth.uid() AND community_id = event_rsvps.community_id
      LIMIT 1
    )
  );

-- Board can manage all RSVPs in their community
CREATE POLICY "Board can manage RSVPs"
  ON event_rsvps FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member());
