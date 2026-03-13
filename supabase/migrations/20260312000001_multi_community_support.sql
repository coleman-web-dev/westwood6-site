-- =============================================
-- Multi-Community Support Migration
-- Allows a single auth user to belong to multiple communities
-- =============================================

-- ─── 1. SCHEMA CHANGES ────────────────────────────────

-- Remove single-community-per-user constraint
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_user_id_key;

-- Allow same user in multiple communities, prevent duplicates in same community
ALTER TABLE members ADD CONSTRAINT members_user_id_community_id_key UNIQUE(user_id, community_id);

-- Performance index for new RLS helper functions
CREATE INDEX IF NOT EXISTS idx_members_user_community_approved
  ON members(user_id, community_id) WHERE is_approved = true;

-- ─── 2. NEW HELPER FUNCTIONS ──────────────────────────

-- Check if current user belongs to a specific community
CREATE OR REPLACE FUNCTION is_my_community(cid UUID)
RETURNS BOOLEAN AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM members
    WHERE user_id = auth.uid()
      AND community_id = cid
      AND is_approved = true
  );
$fn$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is board member in a specific community
CREATE OR REPLACE FUNCTION is_board_member_of(cid UUID)
RETURNS BOOLEAN AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM members
    WHERE user_id = auth.uid()
      AND community_id = cid
      AND is_approved = true
      AND system_role IN ('board', 'manager', 'super_admin')
  );
$fn$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get user's unit_id in a specific community
CREATE OR REPLACE FUNCTION get_my_unit_id_in(cid UUID)
RETURNS UUID AS $fn$
  SELECT unit_id FROM members
  WHERE user_id = auth.uid()
    AND community_id = cid
    AND is_approved = true
  LIMIT 1;
$fn$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get user's member_id in a specific community (for bulletin board author checks)
CREATE OR REPLACE FUNCTION get_my_member_id_in(cid UUID)
RETURNS UUID AS $fn$
  SELECT id FROM members
  WHERE user_id = auth.uid()
    AND community_id = cid
    AND is_approved = true
  LIMIT 1;
$fn$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── 3. RLS POLICY UPDATES ───────────────────────────
-- Drop and recreate all policies that use old helper functions.
-- Old functions (get_my_community_id, is_board_member, get_my_unit_id)
-- are kept intact as backward-safety fallbacks.

-- ─── COMMUNITIES ─────────────────────────────────────

DROP POLICY IF EXISTS "Members can view their community" ON communities;
CREATE POLICY "Members can view their community"
  ON communities FOR SELECT
  USING (is_my_community(id));

DROP POLICY IF EXISTS "Board can update their community" ON communities;
CREATE POLICY "Board can update their community"
  ON communities FOR UPDATE
  USING (is_my_community(id) AND is_board_member_of(id));

-- ─── UNITS ───────────────────────────────────────────

DROP POLICY IF EXISTS "Members can view units in their community" ON units;
CREATE POLICY "Members can view units in their community"
  ON units FOR SELECT
  USING (is_my_community(community_id));

DROP POLICY IF EXISTS "Board can manage units" ON units;
CREATE POLICY "Board can manage units"
  ON units FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── MEMBERS ─────────────────────────────────────────

DROP POLICY IF EXISTS "Members can view approved members in their community" ON members;
CREATE POLICY "Members can view approved members in their community"
  ON members FOR SELECT
  USING (is_my_community(community_id) AND is_approved = true);

-- "Users can view their own profile" - no change (user_id = auth.uid())
-- "Users can update their own profile" - no change (user_id = auth.uid())

DROP POLICY IF EXISTS "Board can manage all members" ON members;
CREATE POLICY "Board can manage all members"
  ON members FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── SIGNUP REQUESTS ─────────────────────────────────

-- "Users can view their own signup request" - no change (user_id = auth.uid())
-- "Anyone can create a signup request" - no change (true)

DROP POLICY IF EXISTS "Board can manage signup requests" ON signup_requests;
CREATE POLICY "Board can manage signup requests"
  ON signup_requests FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── ANNOUNCEMENTS ───────────────────────────────────

DROP POLICY IF EXISTS "Members can view announcements" ON announcements;
CREATE POLICY "Members can view announcements"
  ON announcements FOR SELECT
  USING (is_my_community(community_id));

DROP POLICY IF EXISTS "Board can manage announcements" ON announcements;
CREATE POLICY "Board can manage announcements"
  ON announcements FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- "Anyone can view public announcements" - no change (is_public = true)

-- ─── DOCUMENTS ───────────────────────────────────────

DROP POLICY IF EXISTS "Members can view documents" ON documents;
CREATE POLICY "Members can view documents"
  ON documents FOR SELECT
  USING (is_my_community(community_id));

DROP POLICY IF EXISTS "Board can manage documents" ON documents;
CREATE POLICY "Board can manage documents"
  ON documents FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- "Anyone can view public documents metadata" - no change (is_public = true)

-- ─── MAINTENANCE REQUESTS ────────────────────────────

DROP POLICY IF EXISTS "Members can view their unit requests" ON maintenance_requests;
CREATE POLICY "Members can view their unit requests"
  ON maintenance_requests FOR SELECT
  USING (is_my_community(community_id) AND (unit_id = get_my_unit_id_in(community_id) OR is_board_member_of(community_id)));

DROP POLICY IF EXISTS "Members can create requests for their unit" ON maintenance_requests;
CREATE POLICY "Members can create requests for their unit"
  ON maintenance_requests FOR INSERT
  WITH CHECK (is_my_community(community_id) AND unit_id = get_my_unit_id_in(community_id));

DROP POLICY IF EXISTS "Board can manage all requests" ON maintenance_requests;
CREATE POLICY "Board can manage all requests"
  ON maintenance_requests FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── INVOICES ────────────────────────────────────────

DROP POLICY IF EXISTS "Members can view their unit invoices" ON invoices;
CREATE POLICY "Members can view their unit invoices"
  ON invoices FOR SELECT
  USING (is_my_community(community_id) AND (unit_id = get_my_unit_id_in(community_id) OR is_board_member_of(community_id)));

DROP POLICY IF EXISTS "Board can manage invoices" ON invoices;
CREATE POLICY "Board can manage invoices"
  ON invoices FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── PAYMENTS (no community_id column) ───────────────

DROP POLICY IF EXISTS "Members can view their unit payments" ON payments;
CREATE POLICY "Members can view their unit payments"
  ON payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM units u
    WHERE u.id = payments.unit_id
      AND is_my_community(u.community_id)
      AND (u.id = get_my_unit_id_in(u.community_id) OR is_board_member_of(u.community_id))
  ));

DROP POLICY IF EXISTS "Members can create payments for their unit" ON payments;
CREATE POLICY "Members can create payments for their unit"
  ON payments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM units u
    WHERE u.id = payments.unit_id
      AND is_my_community(u.community_id)
      AND u.id = get_my_unit_id_in(u.community_id)
  ));

-- ─── AMENITIES ───────────────────────────────────────

DROP POLICY IF EXISTS "Members can view active amenities" ON amenities;
CREATE POLICY "Members can view active amenities"
  ON amenities FOR SELECT
  USING (is_my_community(community_id));

DROP POLICY IF EXISTS "Board can manage amenities" ON amenities;
CREATE POLICY "Board can manage amenities"
  ON amenities FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── RESERVATIONS ────────────────────────────────────

DROP POLICY IF EXISTS "Members can view their own reservations" ON reservations;
CREATE POLICY "Members can view their own reservations"
  ON reservations FOR SELECT
  USING (is_my_community(community_id) AND (unit_id = get_my_unit_id_in(community_id) OR is_board_member_of(community_id)));

DROP POLICY IF EXISTS "Members can create reservations" ON reservations;
CREATE POLICY "Members can create reservations"
  ON reservations FOR INSERT
  WITH CHECK (is_my_community(community_id) AND unit_id = get_my_unit_id_in(community_id));

DROP POLICY IF EXISTS "Board can manage all reservations" ON reservations;
CREATE POLICY "Board can manage all reservations"
  ON reservations FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── EVENTS ──────────────────────────────────────────

DROP POLICY IF EXISTS "Members can view events in their community" ON events;
CREATE POLICY "Members can view events in their community"
  ON events FOR SELECT
  USING (is_my_community(community_id));

DROP POLICY IF EXISTS "Board can manage events" ON events;
CREATE POLICY "Board can manage events"
  ON events FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── UNIT WALLETS ────────────────────────────────────

DROP POLICY IF EXISTS "Members can view their unit wallet" ON unit_wallets;
CREATE POLICY "Members can view their unit wallet"
  ON unit_wallets FOR SELECT
  USING (is_my_community(community_id) AND (unit_id = get_my_unit_id_in(community_id) OR is_board_member_of(community_id)));

DROP POLICY IF EXISTS "Board can manage wallets" ON unit_wallets;
CREATE POLICY "Board can manage wallets"
  ON unit_wallets FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── WALLET TRANSACTIONS ────────────────────────────

DROP POLICY IF EXISTS "Members can view their unit transactions" ON wallet_transactions;
CREATE POLICY "Members can view their unit transactions"
  ON wallet_transactions FOR SELECT
  USING (is_my_community(community_id) AND (unit_id = get_my_unit_id_in(community_id) OR is_board_member_of(community_id)));

DROP POLICY IF EXISTS "Board can manage transactions" ON wallet_transactions;
CREATE POLICY "Board can manage transactions"
  ON wallet_transactions FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── ASSESSMENTS ─────────────────────────────────────

DROP POLICY IF EXISTS "Members can view community assessments" ON assessments;
CREATE POLICY "Members can view community assessments"
  ON assessments FOR SELECT
  USING (is_my_community(community_id));

DROP POLICY IF EXISTS "Board can insert assessments" ON assessments;
CREATE POLICY "Board can insert assessments"
  ON assessments FOR INSERT
  WITH CHECK (is_my_community(community_id) AND is_board_member_of(community_id));

DROP POLICY IF EXISTS "Board can update assessments" ON assessments;
CREATE POLICY "Board can update assessments"
  ON assessments FOR UPDATE
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

DROP POLICY IF EXISTS "Board can delete assessments" ON assessments;
CREATE POLICY "Board can delete assessments"
  ON assessments FOR DELETE
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── SIGNED AGREEMENTS ──────────────────────────────

DROP POLICY IF EXISTS "Members can view their unit signed agreements" ON signed_agreements;
CREATE POLICY "Members can view their unit signed agreements"
  ON signed_agreements FOR SELECT
  USING (is_my_community(community_id) AND (unit_id = get_my_unit_id_in(community_id) OR is_board_member_of(community_id)));

DROP POLICY IF EXISTS "Members can create signed agreements" ON signed_agreements;
CREATE POLICY "Members can create signed agreements"
  ON signed_agreements FOR INSERT
  WITH CHECK (is_my_community(community_id) AND unit_id = get_my_unit_id_in(community_id));

DROP POLICY IF EXISTS "Board can manage signed agreements" ON signed_agreements;
CREATE POLICY "Board can manage signed agreements"
  ON signed_agreements FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── BALLOTS ─────────────────────────────────────────

DROP POLICY IF EXISTS "Members can view community ballots" ON ballots;
CREATE POLICY "Members can view community ballots"
  ON ballots FOR SELECT
  USING (is_my_community(community_id));

DROP POLICY IF EXISTS "Board can manage ballots" ON ballots;
CREATE POLICY "Board can manage ballots"
  ON ballots FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── BALLOT OPTIONS ─────────────────────────────────

DROP POLICY IF EXISTS "Members can view ballot options" ON ballot_options;
CREATE POLICY "Members can view ballot options"
  ON ballot_options FOR SELECT
  USING (ballot_id IN (SELECT id FROM ballots WHERE is_my_community(community_id)));

DROP POLICY IF EXISTS "Board can manage ballot options" ON ballot_options;
CREATE POLICY "Board can manage ballot options"
  ON ballot_options FOR ALL
  USING (ballot_id IN (SELECT id FROM ballots WHERE is_my_community(community_id) AND is_board_member_of(community_id)));

-- ─── BALLOT ELIGIBILITY ─────────────────────────────

DROP POLICY IF EXISTS "Members can view their ballot eligibility" ON ballot_eligibility;
CREATE POLICY "Members can view their ballot eligibility"
  ON ballot_eligibility FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ballots b
      WHERE b.id = ballot_eligibility.ballot_id
        AND is_my_community(b.community_id)
        AND (ballot_eligibility.unit_id = get_my_unit_id_in(b.community_id) OR is_board_member_of(b.community_id))
    )
  );

-- ─── BALLOT VOTES ────────────────────────────────────

DROP POLICY IF EXISTS "Board can view non-secret votes after close" ON ballot_votes;
CREATE POLICY "Board can view non-secret votes after close"
  ON ballot_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ballots b
      WHERE b.id = ballot_votes.ballot_id
        AND is_my_community(b.community_id)
        AND b.is_secret_ballot = false
        AND b.status IN ('closed', 'certified')
        AND is_board_member_of(b.community_id)
    )
  );

-- "No direct access to secret ballot votes" - no change (USING false)

-- ─── PROXY AUTHORIZATIONS ───────────────────────────

DROP POLICY IF EXISTS "Members can view their proxy authorizations" ON proxy_authorizations;
CREATE POLICY "Members can view their proxy authorizations"
  ON proxy_authorizations FOR SELECT
  USING (
    is_my_community(community_id)
    AND (
      grantor_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
      OR grantee_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
      OR is_board_member_of(community_id)
    )
  );

DROP POLICY IF EXISTS "Members can create proxy authorizations" ON proxy_authorizations;
CREATE POLICY "Members can create proxy authorizations"
  ON proxy_authorizations FOR INSERT
  WITH CHECK (is_my_community(community_id) AND grantor_unit_id = get_my_unit_id_in(community_id));

DROP POLICY IF EXISTS "Members can update their proxy authorizations" ON proxy_authorizations;
CREATE POLICY "Members can update their proxy authorizations"
  ON proxy_authorizations FOR UPDATE
  USING (
    is_my_community(community_id)
    AND (
      grantor_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
      OR grantee_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    )
  );

-- ─── BALLOT RESULTS CACHE ───────────────────────────

DROP POLICY IF EXISTS "Members can view published results" ON ballot_results_cache;
CREATE POLICY "Members can view published results"
  ON ballot_results_cache FOR SELECT
  USING (ballot_id IN (
    SELECT id FROM ballots
    WHERE is_my_community(community_id)
      AND (results_published = true OR is_board_member_of(community_id))
  ));

DROP POLICY IF EXISTS "Board can manage results cache" ON ballot_results_cache;
CREATE POLICY "Board can manage results cache"
  ON ballot_results_cache FOR ALL
  USING (ballot_id IN (
    SELECT id FROM ballots
    WHERE is_my_community(community_id) AND is_board_member_of(community_id)
  ));

-- ─── BULLETIN POSTS ─────────────────────────────────

DROP POLICY IF EXISTS "Members can view bulletin posts" ON bulletin_posts;
CREATE POLICY "Members can view bulletin posts"
  ON bulletin_posts FOR SELECT
  USING (is_my_community(community_id));

DROP POLICY IF EXISTS "Members can create bulletin posts" ON bulletin_posts;
CREATE POLICY "Members can create bulletin posts"
  ON bulletin_posts FOR INSERT
  WITH CHECK (is_my_community(community_id));

DROP POLICY IF EXISTS "Board can manage bulletin posts" ON bulletin_posts;
CREATE POLICY "Board can manage bulletin posts"
  ON bulletin_posts FOR UPDATE
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

DROP POLICY IF EXISTS "Board can delete bulletin posts" ON bulletin_posts;
CREATE POLICY "Board can delete bulletin posts"
  ON bulletin_posts FOR DELETE
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

DROP POLICY IF EXISTS "Authors can update own bulletin posts" ON bulletin_posts;
CREATE POLICY "Authors can update own bulletin posts"
  ON bulletin_posts FOR UPDATE
  USING (is_my_community(community_id) AND posted_by = get_my_member_id_in(community_id));

DROP POLICY IF EXISTS "Authors can delete own bulletin posts" ON bulletin_posts;
CREATE POLICY "Authors can delete own bulletin posts"
  ON bulletin_posts FOR DELETE
  USING (is_my_community(community_id) AND posted_by = get_my_member_id_in(community_id));

-- ─── BULLETIN COMMENTS ──────────────────────────────

DROP POLICY IF EXISTS "Members can view bulletin comments" ON bulletin_comments;
CREATE POLICY "Members can view bulletin comments"
  ON bulletin_comments FOR SELECT
  USING (is_my_community(community_id));

DROP POLICY IF EXISTS "Members can create bulletin comments" ON bulletin_comments;
CREATE POLICY "Members can create bulletin comments"
  ON bulletin_comments FOR INSERT
  WITH CHECK (is_my_community(community_id));

DROP POLICY IF EXISTS "Board can manage bulletin comments" ON bulletin_comments;
CREATE POLICY "Board can manage bulletin comments"
  ON bulletin_comments FOR UPDATE
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

DROP POLICY IF EXISTS "Board can delete bulletin comments" ON bulletin_comments;
CREATE POLICY "Board can delete bulletin comments"
  ON bulletin_comments FOR DELETE
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

DROP POLICY IF EXISTS "Authors can update own bulletin comments" ON bulletin_comments;
CREATE POLICY "Authors can update own bulletin comments"
  ON bulletin_comments FOR UPDATE
  USING (is_my_community(community_id) AND posted_by = get_my_member_id_in(community_id));

DROP POLICY IF EXISTS "Authors can delete own bulletin comments" ON bulletin_comments;
CREATE POLICY "Authors can delete own bulletin comments"
  ON bulletin_comments FOR DELETE
  USING (is_my_community(community_id) AND posted_by = get_my_member_id_in(community_id));

-- ─── STRIPE ACCOUNTS ────────────────────────────────

DROP POLICY IF EXISTS "Members view own community Stripe account" ON stripe_accounts;
CREATE POLICY "Members view own community Stripe account"
  ON stripe_accounts FOR SELECT
  USING (is_my_community(community_id));

DROP POLICY IF EXISTS "Board manages Stripe account" ON stripe_accounts;
CREATE POLICY "Board manages Stripe account"
  ON stripe_accounts FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id))
  WITH CHECK (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── EMAIL QUEUE ─────────────────────────────────────

DROP POLICY IF EXISTS "Board can view email queue" ON email_queue;
CREATE POLICY "Board can view email queue"
  ON email_queue FOR SELECT
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

DROP POLICY IF EXISTS "Board can insert email queue items" ON email_queue;
CREATE POLICY "Board can insert email queue items"
  ON email_queue FOR INSERT
  WITH CHECK (is_my_community(community_id));

-- ─── EMAIL LOGS ──────────────────────────────────────

DROP POLICY IF EXISTS "Board can view email logs" ON email_logs;
CREATE POLICY "Board can view email logs"
  ON email_logs FOR SELECT
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- email_preferences - uses member_id IN (SELECT id FROM members WHERE user_id = auth.uid()), no change needed
-- notifications - uses member_id IN (SELECT id FROM members WHERE user_id = auth.uid()), no change needed

-- ─── VIOLATIONS ──────────────────────────────────────

DROP POLICY IF EXISTS "violations_board_all" ON violations;
CREATE POLICY "violations_board_all"
  ON violations FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

DROP POLICY IF EXISTS "violations_resident_select" ON violations;
CREATE POLICY "violations_resident_select"
  ON violations FOR SELECT
  USING (is_my_community(community_id) AND unit_id = get_my_unit_id_in(community_id));

-- ─── VIOLATION NOTICES ──────────────────────────────

DROP POLICY IF EXISTS "violation_notices_board_all" ON violation_notices;
CREATE POLICY "violation_notices_board_all"
  ON violation_notices FOR ALL
  USING (EXISTS (
    SELECT 1 FROM violations v
    WHERE v.id = violation_notices.violation_id
      AND is_my_community(v.community_id)
      AND is_board_member_of(v.community_id)
  ));

DROP POLICY IF EXISTS "violation_notices_resident_select" ON violation_notices;
CREATE POLICY "violation_notices_resident_select"
  ON violation_notices FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM violations v
    WHERE v.id = violation_notices.violation_id
      AND is_my_community(v.community_id)
      AND v.unit_id = get_my_unit_id_in(v.community_id)
  ));

-- ─── ARC REQUESTS ────────────────────────────────────

DROP POLICY IF EXISTS "arc_requests_resident_select" ON arc_requests;
CREATE POLICY "arc_requests_resident_select"
  ON arc_requests FOR SELECT
  USING (is_my_community(community_id) AND unit_id = get_my_unit_id_in(community_id));

DROP POLICY IF EXISTS "arc_requests_resident_insert" ON arc_requests;
CREATE POLICY "arc_requests_resident_insert"
  ON arc_requests FOR INSERT
  WITH CHECK (is_my_community(community_id) AND unit_id = get_my_unit_id_in(community_id));

DROP POLICY IF EXISTS "arc_requests_resident_update" ON arc_requests;
CREATE POLICY "arc_requests_resident_update"
  ON arc_requests FOR UPDATE
  USING (is_my_community(community_id) AND unit_id = get_my_unit_id_in(community_id) AND status IN ('draft'));

DROP POLICY IF EXISTS "arc_requests_board_all" ON arc_requests;
CREATE POLICY "arc_requests_board_all"
  ON arc_requests FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── BUDGETS ─────────────────────────────────────────

DROP POLICY IF EXISTS "budgets_board_all" ON budgets;
CREATE POLICY "budgets_board_all"
  ON budgets FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── BUDGET LINE ITEMS ──────────────────────────────

DROP POLICY IF EXISTS "budget_line_items_board_all" ON budget_line_items;
CREATE POLICY "budget_line_items_board_all"
  ON budget_line_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM budgets b
    WHERE b.id = budget_line_items.budget_id
      AND is_my_community(b.community_id)
      AND is_board_member_of(b.community_id)
  ));

-- ─── VENDORS ─────────────────────────────────────────

DROP POLICY IF EXISTS "vendors_board_all" ON vendors;
CREATE POLICY "vendors_board_all"
  ON vendors FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

DROP POLICY IF EXISTS "vendors_member_select" ON vendors;
CREATE POLICY "vendors_member_select"
  ON vendors FOR SELECT
  USING (is_my_community(community_id) AND status = 'active');

-- ─── VENDOR DOCUMENTS ───────────────────────────────

DROP POLICY IF EXISTS "vendor_documents_board_all" ON vendor_documents;
CREATE POLICY "vendor_documents_board_all"
  ON vendor_documents FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

DROP POLICY IF EXISTS "vendor_documents_member_select" ON vendor_documents;
CREATE POLICY "vendor_documents_member_select"
  ON vendor_documents FOR SELECT
  USING (is_my_community(community_id));

-- ─── VENDOR CATEGORIES ──────────────────────────────

DROP POLICY IF EXISTS "vendor_categories_board_all" ON vendor_categories;
CREATE POLICY "vendor_categories_board_all"
  ON vendor_categories FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

DROP POLICY IF EXISTS "vendor_categories_member_select" ON vendor_categories;
CREATE POLICY "vendor_categories_member_select"
  ON vendor_categories FOR SELECT
  USING (is_my_community(community_id));

-- ─── ACCOUNTS (Chart of Accounts) ───────────────────

DROP POLICY IF EXISTS "accounts_select" ON accounts;
CREATE POLICY "accounts_select"
  ON accounts FOR SELECT
  USING (is_my_community(community_id));

DROP POLICY IF EXISTS "accounts_board_all" ON accounts;
CREATE POLICY "accounts_board_all"
  ON accounts FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id))
  WITH CHECK (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── JOURNAL ENTRIES ─────────────────────────────────

DROP POLICY IF EXISTS "journal_entries_board" ON journal_entries;
CREATE POLICY "journal_entries_board"
  ON journal_entries FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id))
  WITH CHECK (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── JOURNAL LINES ──────────────────────────────────

DROP POLICY IF EXISTS "journal_lines_board" ON journal_lines;
CREATE POLICY "journal_lines_board"
  ON journal_lines FOR ALL
  USING (EXISTS (
    SELECT 1 FROM journal_entries je
    WHERE je.id = journal_lines.journal_entry_id
      AND is_my_community(je.community_id)
      AND is_board_member_of(je.community_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM journal_entries je
    WHERE je.id = journal_lines.journal_entry_id
      AND is_my_community(je.community_id)
      AND is_board_member_of(je.community_id)
  ));

-- ─── FISCAL PERIODS ─────────────────────────────────

DROP POLICY IF EXISTS "fiscal_periods_board" ON fiscal_periods;
CREATE POLICY "fiscal_periods_board"
  ON fiscal_periods FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id))
  WITH CHECK (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── PLAID CONNECTIONS ──────────────────────────────

DROP POLICY IF EXISTS "Board can manage plaid connections" ON plaid_connections;
CREATE POLICY "Board can manage plaid connections"
  ON plaid_connections FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id))
  WITH CHECK (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── PLAID BANK ACCOUNTS ────────────────────────────

DROP POLICY IF EXISTS "Board can manage bank accounts" ON plaid_bank_accounts;
CREATE POLICY "Board can manage bank accounts"
  ON plaid_bank_accounts FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id))
  WITH CHECK (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── BANK TRANSACTIONS ─────────────────────────────

DROP POLICY IF EXISTS "Board can manage bank transactions" ON bank_transactions;
CREATE POLICY "Board can manage bank transactions"
  ON bank_transactions FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id))
  WITH CHECK (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── BANK RECONCILIATIONS ───────────────────────────

DROP POLICY IF EXISTS "Board can manage reconciliations" ON bank_reconciliations;
CREATE POLICY "Board can manage reconciliations"
  ON bank_reconciliations FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id))
  WITH CHECK (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── CATEGORIZATION RULES ───────────────────────────

DROP POLICY IF EXISTS "Board can manage categorization rules" ON categorization_rules;
CREATE POLICY "Board can manage categorization rules"
  ON categorization_rules FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id))
  WITH CHECK (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── AUDIT LOGS ──────────────────────────────────────

DROP POLICY IF EXISTS "Board can read audit logs" ON audit_logs;
CREATE POLICY "Board can read audit logs"
  ON audit_logs FOR SELECT
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── STATEMENT UPLOADS ──────────────────────────────

DROP POLICY IF EXISTS "Board can manage statement uploads" ON statement_uploads;
CREATE POLICY "Board can manage statement uploads"
  ON statement_uploads FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id))
  WITH CHECK (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── RECURRING JOURNAL ENTRIES ──────────────────────

DROP POLICY IF EXISTS "Board can manage recurring entries" ON recurring_journal_entries;
CREATE POLICY "Board can manage recurring entries"
  ON recurring_journal_entries FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── DELINQUENCY RULES ─────────────────────────────

DROP POLICY IF EXISTS "Board can manage delinquency rules" ON delinquency_rules;
CREATE POLICY "Board can manage delinquency rules"
  ON delinquency_rules FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── DELINQUENCY ACTIONS ────────────────────────────

DROP POLICY IF EXISTS "Board can view delinquency actions" ON delinquency_actions;
CREATE POLICY "Board can view delinquency actions"
  ON delinquency_actions FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── CHECK NUMBER SEQUENCES ─────────────────────────

DROP POLICY IF EXISTS "Board can manage check sequences" ON check_number_sequences;
CREATE POLICY "Board can manage check sequences"
  ON check_number_sequences FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id))
  WITH CHECK (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── CHECK SIGNATURES ───────────────────────────────

DROP POLICY IF EXISTS "Board can manage check signatures" ON check_signatures;
CREATE POLICY "Board can manage check signatures"
  ON check_signatures FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id))
  WITH CHECK (is_my_community(community_id) AND is_board_member_of(community_id));

-- ─── CHECKS ──────────────────────────────────────────

DROP POLICY IF EXISTS "Board can manage checks" ON checks;
CREATE POLICY "Board can manage checks"
  ON checks FOR ALL
  USING (is_my_community(community_id) AND is_board_member_of(community_id))
  WITH CHECK (is_my_community(community_id) AND is_board_member_of(community_id));

DROP POLICY IF EXISTS "Members can view checks" ON checks;
CREATE POLICY "Members can view checks"
  ON checks FOR SELECT
  USING (is_my_community(community_id));

-- ─── CHECK APPROVALS ────────────────────────────────

DROP POLICY IF EXISTS "Board can manage check approvals" ON check_approvals;
CREATE POLICY "Board can manage check approvals"
  ON check_approvals FOR ALL
  USING (EXISTS (
    SELECT 1 FROM checks c
    WHERE c.id = check_approvals.check_id
      AND is_my_community(c.community_id)
      AND is_board_member_of(c.community_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM checks c
    WHERE c.id = check_approvals.check_id
      AND is_my_community(c.community_id)
      AND is_board_member_of(c.community_id)
  ));

-- ─── 4. VOTING RPC FUNCTION UPDATES ────────────────
-- Scope member lookups by ballot's community_id

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
  -- Get ballot and its community
  SELECT * INTO v_ballot FROM ballots WHERE id = p_ballot_id;
  IF v_ballot IS NULL THEN
    RETURN jsonb_build_object('error', 'Ballot not found');
  END IF;

  -- Get current member scoped to ballot's community
  SELECT id, unit_id INTO v_member_id, v_unit_id
  FROM members
  WHERE user_id = auth.uid()
    AND community_id = v_ballot.community_id
    AND is_approved = true
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not an approved member');
  END IF;

  IF v_ballot.status != 'open' THEN
    RETURN jsonb_build_object('error', 'Ballot is not open for voting');
  END IF;

  -- Determine which unit is voting
  IF p_is_proxy AND p_voter_unit_id IS NOT NULL THEN
    -- Proxy voting: verify authorization
    SELECT * INTO v_proxy FROM proxy_authorizations
    WHERE ballot_id = p_ballot_id
      AND grantor_unit_id = p_voter_unit_id
      AND grantee_member_id = v_member_id
      AND status = 'active';

    IF v_proxy IS NULL THEN
      RETURN jsonb_build_object('error', 'No active proxy authorization found');
    END IF;
    v_unit_id := p_voter_unit_id;
  END IF;

  -- Check eligibility
  SELECT * INTO v_eligibility FROM ballot_eligibility
  WHERE ballot_id = p_ballot_id AND unit_id = v_unit_id;

  IF v_eligibility IS NULL THEN
    RETURN jsonb_build_object('error', 'Unit is not eligible to vote on this ballot');
  END IF;

  IF v_eligibility.has_voted THEN
    RETURN jsonb_build_object('error', 'This unit has already voted');
  END IF;

  -- Validate option count
  IF v_ballot.max_selections IS NOT NULL AND array_length(p_option_ids, 1) > v_ballot.max_selections THEN
    RETURN jsonb_build_object('error', 'Too many selections');
  END IF;

  -- Cast votes
  IF v_ballot.is_secret_ballot THEN
    FOREACH v_option_id IN ARRAY p_option_ids LOOP
      INSERT INTO secret_ballot_votes (ballot_id, option_id)
      VALUES (p_ballot_id, v_option_id);
    END LOOP;
  ELSE
    FOREACH v_option_id IN ARRAY p_option_ids LOOP
      INSERT INTO ballot_votes (ballot_id, option_id, member_id, unit_id, is_proxy, proxy_authorization_id)
      VALUES (p_ballot_id, v_option_id, v_member_id, v_unit_id, p_is_proxy, v_proxy.id);
    END LOOP;
  END IF;

  -- Mark as voted
  UPDATE ballot_eligibility
  SET has_voted = true, voted_at = now(), voted_by_member_id = v_member_id
  WHERE ballot_id = p_ballot_id AND unit_id = v_unit_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION open_ballot(p_ballot_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_ballot RECORD;
  v_member_id UUID;
  v_eligible_count INTEGER;
BEGIN
  -- Get ballot
  SELECT * INTO v_ballot FROM ballots WHERE id = p_ballot_id;
  IF v_ballot IS NULL THEN
    RETURN jsonb_build_object('error', 'Ballot not found');
  END IF;

  -- Verify caller is board in the ballot's community
  SELECT id INTO v_member_id FROM members
  WHERE user_id = auth.uid()
    AND community_id = v_ballot.community_id
    AND is_approved = true
    AND system_role IN ('board', 'manager', 'super_admin')
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Only board members can open ballots');
  END IF;

  IF v_ballot.status != 'draft' AND v_ballot.status != 'scheduled' THEN
    RETURN jsonb_build_object('error', 'Ballot must be in draft or scheduled status');
  END IF;

  -- Snapshot eligible voters (one per unit with an owner)
  INSERT INTO ballot_eligibility (ballot_id, unit_id, member_id)
  SELECT p_ballot_id, u.id, m.id
  FROM units u
  JOIN members m ON m.unit_id = u.id AND m.community_id = v_ballot.community_id
    AND m.member_role = 'owner' AND m.parent_member_id IS NULL AND m.is_approved = true
  WHERE u.community_id = v_ballot.community_id AND u.status = 'active'
  ON CONFLICT DO NOTHING;

  SELECT COUNT(*) INTO v_eligible_count FROM ballot_eligibility WHERE ballot_id = p_ballot_id;

  UPDATE ballots SET status = 'open', opened_at = now() WHERE id = p_ballot_id;

  RETURN jsonb_build_object('success', true, 'eligible_count', v_eligible_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION close_and_tally_ballot(p_ballot_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_ballot RECORD;
  v_member_id UUID;
  v_total_eligible INTEGER;
  v_total_voted INTEGER;
  v_quorum_met BOOLEAN;
BEGIN
  -- Get ballot
  SELECT * INTO v_ballot FROM ballots WHERE id = p_ballot_id;
  IF v_ballot IS NULL THEN
    RETURN jsonb_build_object('error', 'Ballot not found');
  END IF;

  -- Verify caller is board in the ballot's community
  SELECT id INTO v_member_id FROM members
  WHERE user_id = auth.uid()
    AND community_id = v_ballot.community_id
    AND is_approved = true
    AND system_role IN ('board', 'manager', 'super_admin')
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Only board members can close ballots');
  END IF;

  IF v_ballot.status != 'open' THEN
    RETURN jsonb_build_object('error', 'Ballot must be open to close');
  END IF;

  -- Calculate quorum
  SELECT COUNT(*) INTO v_total_eligible FROM ballot_eligibility WHERE ballot_id = p_ballot_id;
  SELECT COUNT(*) INTO v_total_voted FROM ballot_eligibility WHERE ballot_id = p_ballot_id AND has_voted = true;
  v_quorum_met := v_total_eligible > 0 AND (v_total_voted::NUMERIC / v_total_eligible) >= v_ballot.quorum_threshold;

  -- Tally results into cache
  IF v_ballot.is_secret_ballot THEN
    INSERT INTO ballot_results_cache (ballot_id, option_id, vote_count)
    SELECT p_ballot_id, option_id, COUNT(*)
    FROM secret_ballot_votes WHERE ballot_id = p_ballot_id
    GROUP BY option_id;
  ELSE
    INSERT INTO ballot_results_cache (ballot_id, option_id, vote_count)
    SELECT p_ballot_id, option_id, COUNT(*)
    FROM ballot_votes WHERE ballot_id = p_ballot_id
    GROUP BY option_id;
  END IF;

  -- Update ballot status
  UPDATE ballots
  SET status = 'closed',
      closed_at = now(),
      quorum_met = v_quorum_met,
      total_eligible = v_total_eligible,
      total_voted = v_total_voted
  WHERE id = p_ballot_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_eligible', v_total_eligible,
    'total_voted', v_total_voted,
    'quorum_met', v_quorum_met
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
