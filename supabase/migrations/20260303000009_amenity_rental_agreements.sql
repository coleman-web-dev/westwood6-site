-- ============================================================
-- Per-Amenity Rental Agreements
-- Adds agreement template + custom fields to amenities table,
-- and a signed_agreements table for e-signed records.
-- ============================================================

-- 1a. Amenity table additions
ALTER TABLE amenities
  ADD COLUMN IF NOT EXISTS agreement_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreement_template TEXT,
  ADD COLUMN IF NOT EXISTS agreement_fields JSONB DEFAULT '[]'::jsonb;

-- 1b. Signed agreements table
CREATE TABLE IF NOT EXISTS signed_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id),
  signer_member_id UUID NOT NULL REFERENCES members(id),
  signer_name TEXT NOT NULL,
  filled_text TEXT NOT NULL,
  field_answers JSONB DEFAULT '{}'::jsonb,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_reservation_agreement UNIQUE (reservation_id)
);

CREATE INDEX IF NOT EXISTS idx_signed_agreements_reservation
  ON signed_agreements(reservation_id);
CREATE INDEX IF NOT EXISTS idx_signed_agreements_community
  ON signed_agreements(community_id);
CREATE INDEX IF NOT EXISTS idx_signed_agreements_amenity
  ON signed_agreements(amenity_id);

-- 1c. RLS policies
ALTER TABLE signed_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their unit signed agreements" ON signed_agreements;
CREATE POLICY "Members can view their unit signed agreements"
  ON signed_agreements FOR SELECT
  USING (
    community_id = get_my_community_id()
    AND (unit_id = get_my_unit_id() OR is_board_member())
  );

DROP POLICY IF EXISTS "Members can create signed agreements" ON signed_agreements;
CREATE POLICY "Members can create signed agreements"
  ON signed_agreements FOR INSERT
  WITH CHECK (
    community_id = get_my_community_id()
    AND unit_id = get_my_unit_id()
  );

DROP POLICY IF EXISTS "Board can manage signed agreements" ON signed_agreements;
CREATE POLICY "Board can manage signed agreements"
  ON signed_agreements FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member());
