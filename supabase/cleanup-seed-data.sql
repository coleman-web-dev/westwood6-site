-- ============================================================
-- DuesIQ - Remove All Seed/Test Data
-- ============================================================
-- Removes all test data while preserving:
--   - Community record (westwood6) with its config/theme
--   - Chart of accounts (standard accounting accounts)
--   - Stripe account connection
--   - Storage buckets
--   - Schema and functions
--
-- Run this against your Supabase database before importing
-- real Westwood 6 household data.
--
-- IMPORTANT: Review before running. This is irreversible.
-- ============================================================

BEGIN;

-- Get community ID for scoped deletes
DO $$
DECLARE
  v_community_id UUID;
BEGIN
  SELECT id INTO v_community_id FROM communities WHERE slug = 'westwood6';

  IF v_community_id IS NULL THEN
    RAISE NOTICE 'No westwood6 community found. Nothing to clean.';
    RETURN;
  END IF;

  RAISE NOTICE 'Cleaning seed data for community: %', v_community_id;

  -- =============================================
  -- 1. Notifications
  -- =============================================
  DELETE FROM notifications WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: notifications';

  -- =============================================
  -- 2. Email system
  -- =============================================
  DELETE FROM email_queue WHERE community_id = v_community_id;
  DELETE FROM email_logs WHERE community_id = v_community_id;
  DELETE FROM email_preferences WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: email_queue, email_logs, email_preferences';

  -- =============================================
  -- 3. Bulletin board
  -- =============================================
  DELETE FROM bulletin_comments WHERE post_id IN (
    SELECT id FROM bulletin_posts WHERE community_id = v_community_id
  );
  DELETE FROM bulletin_posts WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: bulletin_comments, bulletin_posts';

  -- =============================================
  -- 4. Voting system
  -- =============================================
  DELETE FROM ballot_results_cache WHERE ballot_id IN (
    SELECT id FROM ballots WHERE community_id = v_community_id
  );
  DELETE FROM secret_ballot_votes WHERE ballot_id IN (
    SELECT id FROM ballots WHERE community_id = v_community_id
  );
  DELETE FROM ballot_votes WHERE ballot_id IN (
    SELECT id FROM ballots WHERE community_id = v_community_id
  );
  DELETE FROM ballot_eligibility WHERE ballot_id IN (
    SELECT id FROM ballots WHERE community_id = v_community_id
  );
  DELETE FROM proxy_authorizations WHERE community_id = v_community_id;
  DELETE FROM ballot_options WHERE ballot_id IN (
    SELECT id FROM ballots WHERE community_id = v_community_id
  );
  DELETE FROM ballots WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: ballots, ballot_options, ballot_votes, ballot_eligibility, proxy_authorizations, ballot_results_cache, secret_ballot_votes';

  -- =============================================
  -- 5. Amenity agreements and reservations
  -- =============================================
  DELETE FROM signed_agreements WHERE community_id = v_community_id;
  DELETE FROM reservations WHERE community_id = v_community_id;
  DELETE FROM amenities WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: signed_agreements, reservations, amenities';

  -- =============================================
  -- 6. Events
  -- =============================================
  DELETE FROM events WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: events';

  -- =============================================
  -- 7. Documents
  -- =============================================
  DELETE FROM documents WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: documents';

  -- =============================================
  -- 8. Maintenance
  -- =============================================
  DELETE FROM maintenance_requests WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: maintenance_requests';

  -- =============================================
  -- 9. Violations and ARC
  -- =============================================
  DELETE FROM violation_notices WHERE violation_id IN (
    SELECT id FROM violations WHERE community_id = v_community_id
  );
  DELETE FROM violations WHERE community_id = v_community_id;
  DELETE FROM arc_requests WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: violations, violation_notices, arc_requests';

  -- =============================================
  -- 10. Announcements
  -- =============================================
  DELETE FROM announcements WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: announcements';

  -- =============================================
  -- 11. Checks
  -- =============================================
  DELETE FROM check_approvals WHERE check_id IN (
    SELECT id FROM checks WHERE community_id = v_community_id
  );
  DELETE FROM checks WHERE community_id = v_community_id;
  DELETE FROM check_signatures WHERE community_id = v_community_id;
  DELETE FROM check_number_sequences WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: checks, check_approvals, check_signatures, check_number_sequences';

  -- =============================================
  -- 12. Banking / Reconciliation
  -- =============================================
  DELETE FROM bank_transactions WHERE community_id = v_community_id;
  DELETE FROM bank_reconciliations WHERE community_id = v_community_id;
  DELETE FROM categorization_rules WHERE community_id = v_community_id;
  DELETE FROM statement_uploads WHERE community_id = v_community_id;
  DELETE FROM plaid_bank_accounts WHERE community_id = v_community_id;
  DELETE FROM plaid_connections WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: bank_transactions, bank_reconciliations, categorization_rules, statement_uploads, plaid_bank_accounts, plaid_connections';

  -- =============================================
  -- 13. Accounting (journals, NOT chart of accounts)
  -- =============================================
  DELETE FROM journal_lines WHERE journal_entry_id IN (
    SELECT id FROM journal_entries WHERE community_id = v_community_id
  );
  DELETE FROM journal_entries WHERE community_id = v_community_id;
  DELETE FROM fiscal_periods WHERE community_id = v_community_id;
  DELETE FROM recurring_journal_entries WHERE community_id = v_community_id;
  DELETE FROM delinquency_actions WHERE rule_id IN (
    SELECT id FROM delinquency_rules WHERE community_id = v_community_id
  );
  DELETE FROM delinquency_rules WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: journal_lines, journal_entries, fiscal_periods, recurring_journal_entries, delinquency_rules, delinquency_actions';

  -- =============================================
  -- 14. Budgets
  -- =============================================
  DELETE FROM budget_line_items WHERE budget_id IN (
    SELECT id FROM budgets WHERE community_id = v_community_id
  );
  DELETE FROM budgets WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: budget_line_items, budgets';

  -- =============================================
  -- 15. Vendors
  -- =============================================
  DELETE FROM vendor_documents WHERE vendor_id IN (
    SELECT id FROM vendors WHERE community_id = v_community_id
  );
  DELETE FROM vendors WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: vendor_documents, vendors';

  -- =============================================
  -- 16. Financial data (payments, invoices, wallets)
  -- =============================================
  DELETE FROM wallet_transactions WHERE wallet_id IN (
    SELECT id FROM unit_wallets WHERE community_id = v_community_id
  );
  DELETE FROM unit_wallets WHERE community_id = v_community_id;
  DELETE FROM payments WHERE invoice_id IN (
    SELECT id FROM invoices WHERE community_id = v_community_id
  );
  DELETE FROM invoices WHERE community_id = v_community_id;
  DELETE FROM assessments WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: wallet_transactions, unit_wallets, payments, invoices, assessments';

  -- =============================================
  -- 17. Signup requests
  -- =============================================
  DELETE FROM signup_requests WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: signup_requests';

  -- =============================================
  -- 18. Audit logs
  -- =============================================
  DELETE FROM audit_logs WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: audit_logs';

  -- =============================================
  -- 19. Members (removes all fake members)
  -- =============================================
  DELETE FROM members WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: members';

  -- =============================================
  -- 20. Units (removes all fake units)
  -- =============================================
  DELETE FROM units WHERE community_id = v_community_id;
  RAISE NOTICE 'Cleaned: units';

  -- =============================================
  -- Summary
  -- =============================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Seed data cleanup complete!';
  RAISE NOTICE 'Preserved: community record, chart of accounts, stripe_accounts, storage buckets';
  RAISE NOTICE 'Ready for real Westwood 6 household data import.';
  RAISE NOTICE '========================================';

END $$;

COMMIT;
