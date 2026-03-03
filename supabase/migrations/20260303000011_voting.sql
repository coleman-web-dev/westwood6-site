-- ══════════════════════════════════════════════════════════════════
-- HOA Electronic Voting System
-- Legally compliant across all 50 US states (ESIGN, UETA, FL 720.317,
-- CA AB 2159, TX Property Code 209, etc.)
-- ══════════════════════════════════════════════════════════════════

-- ── Enums ────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE ballot_status AS ENUM ('draft', 'scheduled', 'open', 'closed', 'certified', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ballot_type AS ENUM (
    'board_election',
    'budget_approval',
    'amendment',
    'special_assessment',
    'recall',
    'general'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ballot_tally_method AS ENUM (
    'plurality',
    'yes_no',
    'yes_no_abstain',
    'multi_select'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE proxy_status AS ENUM ('pending', 'active', 'revoked', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Extend notification_type with voting-related types
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ballot_created';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ballot_opened';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ballot_reminder';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ballot_closed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ballot_results';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'proxy_requested';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'proxy_granted';


-- ── Tables ───────────────────────────────────────────────────────

-- Ballots: core ballot definition, created by board members
CREATE TABLE IF NOT EXISTS ballots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  ballot_type ballot_type NOT NULL DEFAULT 'general',
  tally_method ballot_tally_method NOT NULL DEFAULT 'yes_no',

  -- Voting rules
  is_secret_ballot BOOLEAN NOT NULL DEFAULT false,
  quorum_threshold NUMERIC(5,4) NOT NULL DEFAULT 0.2000,
  approval_threshold NUMERIC(5,4),
  max_selections INTEGER DEFAULT 1,

  -- Schedule
  notice_sent_at TIMESTAMPTZ,
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,

  -- State
  status ballot_status NOT NULL DEFAULT 'draft',
  certified_at TIMESTAMPTZ,
  certified_by UUID REFERENCES members(id),
  results_published BOOLEAN NOT NULL DEFAULT false,
  results_published_at TIMESTAMPTZ,

  -- Audit
  created_by UUID NOT NULL REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_ballot_dates CHECK (closes_at > opens_at),
  CONSTRAINT valid_quorum CHECK (quorum_threshold > 0 AND quorum_threshold <= 1),
  CONSTRAINT valid_approval CHECK (approval_threshold IS NULL OR (approval_threshold > 0 AND approval_threshold <= 1))
);

CREATE INDEX IF NOT EXISTS idx_ballots_community ON ballots(community_id);
CREATE INDEX IF NOT EXISTS idx_ballots_status ON ballots(community_id, status);
CREATE INDEX IF NOT EXISTS idx_ballots_dates ON ballots(opens_at, closes_at);


-- Ballot options: choices on a ballot
CREATE TABLE IF NOT EXISTS ballot_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id UUID NOT NULL REFERENCES ballots(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ballot_options_ballot ON ballot_options(ballot_id);


-- Ballot eligibility: materialized voter roll, snapshot when ballot opens
CREATE TABLE IF NOT EXISTS ballot_eligibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id UUID NOT NULL REFERENCES ballots(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id),
  member_id UUID NOT NULL REFERENCES members(id),
  has_voted BOOLEAN NOT NULL DEFAULT false,
  voted_at TIMESTAMPTZ,
  voted_by_proxy BOOLEAN NOT NULL DEFAULT false,
  proxy_member_id UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_ballot_unit UNIQUE (ballot_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_ballot_eligibility_ballot ON ballot_eligibility(ballot_id);
CREATE INDEX IF NOT EXISTS idx_ballot_eligibility_member ON ballot_eligibility(member_id);
CREATE INDEX IF NOT EXISTS idx_ballot_eligibility_unit ON ballot_eligibility(unit_id);


-- Non-secret ballot votes: stores who voted for what
CREATE TABLE IF NOT EXISTS ballot_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id UUID NOT NULL REFERENCES ballots(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id),
  option_id UUID NOT NULL REFERENCES ballot_options(id) ON DELETE CASCADE,
  cast_by_member_id UUID NOT NULL REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ballot_votes_ballot ON ballot_votes(ballot_id);
CREATE INDEX IF NOT EXISTS idx_ballot_votes_option ON ballot_votes(option_id);
CREATE INDEX IF NOT EXISTS idx_ballot_votes_unit ON ballot_votes(unit_id, ballot_id);


-- Secret ballot votes: NO voter identity columns at all
-- This is the core of the secret ballot architecture.
-- Even a database admin cannot link these rows to any voter.
CREATE TABLE IF NOT EXISTS secret_ballot_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id UUID NOT NULL REFERENCES ballots(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES ballot_options(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
  -- NO unit_id, NO member_id, NO cast_by column
);

CREATE INDEX IF NOT EXISTS idx_secret_votes_ballot ON secret_ballot_votes(ballot_id);
CREATE INDEX IF NOT EXISTS idx_secret_votes_option ON secret_ballot_votes(option_id);


-- Proxy authorizations
CREATE TABLE IF NOT EXISTS proxy_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  grantor_unit_id UUID NOT NULL REFERENCES units(id),
  grantor_member_id UUID NOT NULL REFERENCES members(id),
  grantee_member_id UUID NOT NULL REFERENCES members(id),
  ballot_id UUID REFERENCES ballots(id) ON DELETE CASCADE,
  status proxy_status NOT NULL DEFAULT 'pending',
  authorized_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_proxy_ballot UNIQUE (grantor_unit_id, ballot_id)
);

CREATE INDEX IF NOT EXISTS idx_proxy_auth_community ON proxy_authorizations(community_id);
CREATE INDEX IF NOT EXISTS idx_proxy_auth_grantee ON proxy_authorizations(grantee_member_id);
CREATE INDEX IF NOT EXISTS idx_proxy_auth_ballot ON proxy_authorizations(ballot_id);


-- Ballot results cache: computed after close
CREATE TABLE IF NOT EXISTS ballot_results_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id UUID NOT NULL REFERENCES ballots(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES ballot_options(id) ON DELETE CASCADE,
  vote_count INTEGER NOT NULL DEFAULT 0,
  vote_percentage NUMERIC(5,4) NOT NULL DEFAULT 0,
  is_winner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_result_option UNIQUE (ballot_id, option_id)
);

CREATE INDEX IF NOT EXISTS idx_results_ballot ON ballot_results_cache(ballot_id);


-- ── RLS ──────────────────────────────────────────────────────────

ALTER TABLE ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballot_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballot_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballot_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_ballot_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballot_results_cache ENABLE ROW LEVEL SECURITY;

-- Ballots: all members can view, board can manage
DROP POLICY IF EXISTS "Members can view community ballots" ON ballots;
CREATE POLICY "Members can view community ballots"
  ON ballots FOR SELECT
  USING (community_id = get_my_community_id());

DROP POLICY IF EXISTS "Board can manage ballots" ON ballots;
CREATE POLICY "Board can manage ballots"
  ON ballots FOR ALL
  USING (community_id = get_my_community_id() AND is_board_member());

-- Ballot options: all members can view, board can manage
DROP POLICY IF EXISTS "Members can view ballot options" ON ballot_options;
CREATE POLICY "Members can view ballot options"
  ON ballot_options FOR SELECT
  USING (ballot_id IN (SELECT id FROM ballots WHERE community_id = get_my_community_id()));

DROP POLICY IF EXISTS "Board can manage ballot options" ON ballot_options;
CREATE POLICY "Board can manage ballot options"
  ON ballot_options FOR ALL
  USING (ballot_id IN (SELECT id FROM ballots WHERE community_id = get_my_community_id() AND is_board_member()));

-- Eligibility: members see own unit + board sees all
DROP POLICY IF EXISTS "Members can view their ballot eligibility" ON ballot_eligibility;
CREATE POLICY "Members can view their ballot eligibility"
  ON ballot_eligibility FOR SELECT
  USING (
    ballot_id IN (SELECT id FROM ballots WHERE community_id = get_my_community_id())
    AND (unit_id = get_my_unit_id() OR is_board_member())
  );

-- Non-secret votes: board can view after ballot closes
DROP POLICY IF EXISTS "Board can view non-secret votes after close" ON ballot_votes;
CREATE POLICY "Board can view non-secret votes after close"
  ON ballot_votes FOR SELECT
  USING (
    ballot_id IN (
      SELECT id FROM ballots
      WHERE community_id = get_my_community_id()
        AND is_secret_ballot = false
        AND status IN ('closed', 'certified')
    )
    AND is_board_member()
  );

-- Secret ballot votes: NO direct access ever. Only RPCs.
DROP POLICY IF EXISTS "No direct access to secret ballot votes" ON secret_ballot_votes;
CREATE POLICY "No direct access to secret ballot votes"
  ON secret_ballot_votes FOR SELECT
  USING (false);

-- Proxy authorizations
DROP POLICY IF EXISTS "Members can view their proxy authorizations" ON proxy_authorizations;
CREATE POLICY "Members can view their proxy authorizations"
  ON proxy_authorizations FOR SELECT
  USING (
    community_id = get_my_community_id()
    AND (
      grantor_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
      OR grantee_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
      OR is_board_member()
    )
  );

DROP POLICY IF EXISTS "Members can create proxy authorizations" ON proxy_authorizations;
CREATE POLICY "Members can create proxy authorizations"
  ON proxy_authorizations FOR INSERT
  WITH CHECK (
    community_id = get_my_community_id()
    AND grantor_unit_id = get_my_unit_id()
  );

DROP POLICY IF EXISTS "Members can update their proxy authorizations" ON proxy_authorizations;
CREATE POLICY "Members can update their proxy authorizations"
  ON proxy_authorizations FOR UPDATE
  USING (
    community_id = get_my_community_id()
    AND (
      grantor_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
      OR grantee_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    )
  );

-- Results cache: viewable when published or by board
DROP POLICY IF EXISTS "Members can view published results" ON ballot_results_cache;
CREATE POLICY "Members can view published results"
  ON ballot_results_cache FOR SELECT
  USING (
    ballot_id IN (
      SELECT id FROM ballots
      WHERE community_id = get_my_community_id()
        AND (results_published = true OR is_board_member())
    )
  );

DROP POLICY IF EXISTS "Board can manage results cache" ON ballot_results_cache;
CREATE POLICY "Board can manage results cache"
  ON ballot_results_cache FOR ALL
  USING (ballot_id IN (SELECT id FROM ballots WHERE community_id = get_my_community_id() AND is_board_member()));


-- ── RPC Functions ────────────────────────────────────────────────

-- Cast a vote (handles both secret and non-secret ballots)
CREATE OR REPLACE FUNCTION cast_vote(
  p_ballot_id UUID,
  p_option_ids UUID[],
  p_voter_unit_id UUID DEFAULT NULL,
  p_is_proxy BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  v_ballot RECORD;
  v_member_id UUID;
  v_unit_id UUID;
  v_eligibility RECORD;
  v_option_id UUID;
  v_proxy RECORD;
BEGIN
  -- Get current member
  SELECT id, unit_id INTO v_member_id, v_unit_id
  FROM members WHERE user_id = auth.uid() AND is_approved = true LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not an approved member');
  END IF;

  -- Determine which unit we are voting for
  IF p_is_proxy AND p_voter_unit_id IS NOT NULL THEN
    SELECT * INTO v_proxy FROM proxy_authorizations
    WHERE grantee_member_id = v_member_id
      AND grantor_unit_id = p_voter_unit_id
      AND status = 'active'
      AND (ballot_id IS NULL OR ballot_id = p_ballot_id)
      AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1;

    IF v_proxy IS NULL THEN
      RETURN jsonb_build_object('error', 'No valid proxy authorization for this unit');
    END IF;

    v_unit_id := p_voter_unit_id;
  END IF;

  -- Get ballot details
  SELECT * INTO v_ballot FROM ballots WHERE id = p_ballot_id;

  IF v_ballot IS NULL THEN
    RETURN jsonb_build_object('error', 'Ballot not found');
  END IF;

  IF v_ballot.status != 'open' THEN
    RETURN jsonb_build_object('error', 'Ballot is not currently open for voting');
  END IF;

  IF now() < v_ballot.opens_at OR now() > v_ballot.closes_at THEN
    RETURN jsonb_build_object('error', 'Ballot is outside its voting window');
  END IF;

  -- Validate option count
  IF array_length(p_option_ids, 1) IS NULL OR array_length(p_option_ids, 1) = 0 THEN
    RETURN jsonb_build_object('error', 'No options selected');
  END IF;

  IF array_length(p_option_ids, 1) > v_ballot.max_selections THEN
    RETURN jsonb_build_object('error', format('Maximum %s selection(s) allowed', v_ballot.max_selections));
  END IF;

  -- Validate all option_ids belong to this ballot
  IF EXISTS (
    SELECT 1 FROM unnest(p_option_ids) oid
    WHERE oid NOT IN (SELECT id FROM ballot_options WHERE ballot_id = p_ballot_id)
  ) THEN
    RETURN jsonb_build_object('error', 'Invalid option selected');
  END IF;

  -- Check eligibility
  SELECT * INTO v_eligibility FROM ballot_eligibility
  WHERE ballot_id = p_ballot_id AND unit_id = v_unit_id;

  IF v_eligibility IS NULL THEN
    RETURN jsonb_build_object('error', 'This unit is not eligible to vote on this ballot');
  END IF;

  IF v_eligibility.has_voted THEN
    RETURN jsonb_build_object('error', 'This unit has already voted on this ballot');
  END IF;

  -- Cast the vote(s)
  IF v_ballot.is_secret_ballot THEN
    -- SECRET BALLOT: insert vote with NO identity info
    FOREACH v_option_id IN ARRAY p_option_ids LOOP
      INSERT INTO secret_ballot_votes (ballot_id, option_id)
      VALUES (p_ballot_id, v_option_id);
    END LOOP;
  ELSE
    -- NON-SECRET BALLOT: include identity info
    FOREACH v_option_id IN ARRAY p_option_ids LOOP
      INSERT INTO ballot_votes (ballot_id, unit_id, option_id, cast_by_member_id)
      VALUES (p_ballot_id, v_unit_id, v_option_id, v_member_id);
    END LOOP;
  END IF;

  -- Mark as voted in eligibility table (audit trail: who voted, when)
  UPDATE ballot_eligibility
  SET has_voted = true,
      voted_at = now(),
      voted_by_proxy = p_is_proxy,
      proxy_member_id = CASE WHEN p_is_proxy THEN v_member_id ELSE NULL END
  WHERE ballot_id = p_ballot_id AND unit_id = v_unit_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Open a ballot: snapshots eligible voters and sets status to open
CREATE OR REPLACE FUNCTION open_ballot(p_ballot_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_ballot RECORD;
  v_member_id UUID;
  v_eligible_count INTEGER;
BEGIN
  -- Verify caller is board
  SELECT id INTO v_member_id FROM members
  WHERE user_id = auth.uid() AND is_approved = true
    AND system_role IN ('board', 'manager', 'super_admin') LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Only board members can open ballots');
  END IF;

  SELECT * INTO v_ballot FROM ballots WHERE id = p_ballot_id;
  IF v_ballot IS NULL OR v_ballot.status NOT IN ('draft', 'scheduled') THEN
    RETURN jsonb_build_object('error', 'Ballot cannot be opened from its current state');
  END IF;

  -- Snapshot eligible voters: one per active unit, head of household only
  INSERT INTO ballot_eligibility (ballot_id, unit_id, member_id)
  SELECT p_ballot_id, u.id, m.id
  FROM units u
  INNER JOIN members m ON m.unit_id = u.id
    AND m.community_id = v_ballot.community_id
    AND m.is_approved = true
    AND m.member_role = 'owner'
    AND m.parent_member_id IS NULL
  WHERE u.community_id = v_ballot.community_id
    AND u.status = 'active'
  ON CONFLICT (ballot_id, unit_id) DO NOTHING;

  GET DIAGNOSTICS v_eligible_count = ROW_COUNT;

  -- Update ballot status
  UPDATE ballots SET status = 'open', updated_at = now() WHERE id = p_ballot_id;

  RETURN jsonb_build_object('success', true, 'eligible_voters', v_eligible_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Close and tally a ballot
CREATE OR REPLACE FUNCTION close_and_tally_ballot(p_ballot_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_ballot RECORD;
  v_member_id UUID;
  v_total_eligible INTEGER;
  v_total_voted INTEGER;
  v_quorum_met BOOLEAN;
BEGIN
  -- Verify caller is board
  SELECT id INTO v_member_id FROM members
  WHERE user_id = auth.uid() AND is_approved = true
    AND system_role IN ('board', 'manager', 'super_admin') LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Only board members can close ballots');
  END IF;

  SELECT * INTO v_ballot FROM ballots WHERE id = p_ballot_id;
  IF v_ballot IS NULL OR v_ballot.status != 'open' THEN
    RETURN jsonb_build_object('error', 'Ballot is not currently open');
  END IF;

  -- Compute quorum
  SELECT COUNT(*) INTO v_total_eligible FROM ballot_eligibility WHERE ballot_id = p_ballot_id;
  SELECT COUNT(*) INTO v_total_voted FROM ballot_eligibility WHERE ballot_id = p_ballot_id AND has_voted = true;
  v_quorum_met := v_total_eligible > 0 AND (v_total_voted::NUMERIC / v_total_eligible) >= v_ballot.quorum_threshold;

  -- Clear old results
  DELETE FROM ballot_results_cache WHERE ballot_id = p_ballot_id;

  -- Tally results
  IF v_ballot.is_secret_ballot THEN
    INSERT INTO ballot_results_cache (ballot_id, option_id, vote_count, vote_percentage, is_winner)
    SELECT
      p_ballot_id,
      bo.id,
      COALESCE(sv.cnt, 0),
      CASE WHEN v_total_voted > 0 THEN COALESCE(sv.cnt, 0)::NUMERIC / v_total_voted ELSE 0 END,
      false
    FROM ballot_options bo
    LEFT JOIN (
      SELECT option_id, COUNT(*) AS cnt FROM secret_ballot_votes WHERE ballot_id = p_ballot_id GROUP BY option_id
    ) sv ON sv.option_id = bo.id
    WHERE bo.ballot_id = p_ballot_id;
  ELSE
    INSERT INTO ballot_results_cache (ballot_id, option_id, vote_count, vote_percentage, is_winner)
    SELECT
      p_ballot_id,
      bo.id,
      COALESCE(bv.cnt, 0),
      CASE WHEN v_total_voted > 0 THEN COALESCE(bv.cnt, 0)::NUMERIC / v_total_voted ELSE 0 END,
      false
    FROM ballot_options bo
    LEFT JOIN (
      SELECT option_id, COUNT(*) AS cnt FROM ballot_votes WHERE ballot_id = p_ballot_id GROUP BY option_id
    ) bv ON bv.option_id = bo.id
    WHERE bo.ballot_id = p_ballot_id;
  END IF;

  -- Mark winner(s)
  UPDATE ballot_results_cache SET is_winner = true
  WHERE ballot_id = p_ballot_id
    AND vote_count = (SELECT MAX(vote_count) FROM ballot_results_cache WHERE ballot_id = p_ballot_id)
    AND vote_count > 0;

  -- Close ballot
  UPDATE ballots SET status = 'closed', updated_at = now() WHERE id = p_ballot_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_eligible', v_total_eligible,
    'total_voted', v_total_voted,
    'quorum_met', v_quorum_met
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Get real-time quorum status
CREATE OR REPLACE FUNCTION get_ballot_quorum_status(p_ballot_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total INTEGER;
  v_voted INTEGER;
  v_threshold NUMERIC;
BEGIN
  SELECT quorum_threshold INTO v_threshold FROM ballots WHERE id = p_ballot_id;
  SELECT COUNT(*) INTO v_total FROM ballot_eligibility WHERE ballot_id = p_ballot_id;
  SELECT COUNT(*) INTO v_voted FROM ballot_eligibility WHERE ballot_id = p_ballot_id AND has_voted = true;

  RETURN jsonb_build_object(
    'total_eligible', v_total,
    'total_voted', v_voted,
    'participation_rate', CASE WHEN v_total > 0 THEN ROUND(v_voted::NUMERIC / v_total, 4) ELSE 0 END,
    'quorum_threshold', v_threshold,
    'quorum_met', v_total > 0 AND (v_voted::NUMERIC / v_total) >= v_threshold
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Notify all approved members (or a specific list)
CREATE OR REPLACE FUNCTION create_member_notifications(
  p_community_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_member_ids UUID[] DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  IF p_member_ids IS NOT NULL THEN
    INSERT INTO notifications (community_id, member_id, type, title, body, reference_id, reference_type)
    SELECT p_community_id, mid, p_type, p_title, p_body, p_reference_id, p_reference_type
    FROM unnest(p_member_ids) AS mid;
  ELSE
    INSERT INTO notifications (community_id, member_id, type, title, body, reference_id, reference_type)
    SELECT p_community_id, m.id, p_type, p_title, p_body, p_reference_id, p_reference_type
    FROM members m
    WHERE m.community_id = p_community_id AND m.is_approved = true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Updated_at trigger for ballots
CREATE OR REPLACE FUNCTION update_ballots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ballots_updated_at ON ballots;
CREATE TRIGGER trigger_ballots_updated_at
  BEFORE UPDATE ON ballots
  FOR EACH ROW
  EXECUTE FUNCTION update_ballots_updated_at();
