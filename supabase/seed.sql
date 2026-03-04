-- ============================================================
-- DuesIQ Seed Data - Westwood Community Six
-- ============================================================
-- Idempotent: skips if community already exists.
-- To re-seed: DELETE FROM communities WHERE slug = 'westwood6';
-- (cascades handle cleanup)
-- ============================================================

DO $$
DECLARE
  -- Community
  v_community_id UUID := gen_random_uuid();

  -- Units (15)
  v_unit_101 UUID := gen_random_uuid();
  v_unit_102 UUID := gen_random_uuid();
  v_unit_103 UUID := gen_random_uuid();
  v_unit_104 UUID := gen_random_uuid();
  v_unit_105 UUID := gen_random_uuid();
  v_unit_106 UUID := gen_random_uuid();
  v_unit_107 UUID := gen_random_uuid();
  v_unit_108 UUID := gen_random_uuid();
  v_unit_109 UUID := gen_random_uuid();
  v_unit_110 UUID := gen_random_uuid();
  v_unit_111 UUID := gen_random_uuid();
  v_unit_112 UUID := gen_random_uuid();
  v_unit_113 UUID := gen_random_uuid();
  v_unit_114 UUID := gen_random_uuid();
  v_unit_115 UUID := gen_random_uuid();

  -- Members (22)
  -- Board (3)
  v_m_president  UUID := gen_random_uuid();  -- Unit 101, board, owner
  v_m_treasurer  UUID := gen_random_uuid();  -- Unit 102, board, owner
  v_m_secretary  UUID := gen_random_uuid();  -- Unit 103, board, owner
  -- Owners (12 more, units 104-115)
  v_m_owner_104  UUID := gen_random_uuid();
  v_m_owner_105  UUID := gen_random_uuid();
  v_m_owner_106  UUID := gen_random_uuid();
  v_m_owner_107  UUID := gen_random_uuid();
  v_m_owner_108  UUID := gen_random_uuid();
  v_m_owner_109  UUID := gen_random_uuid();
  v_m_owner_110  UUID := gen_random_uuid();
  v_m_owner_111  UUID := gen_random_uuid();
  v_m_owner_112  UUID := gen_random_uuid();
  v_m_owner_113  UUID := gen_random_uuid();
  v_m_owner_114  UUID := gen_random_uuid();
  v_m_owner_115  UUID := gen_random_uuid();
  -- Tenants (2)
  v_m_tenant_106 UUID := gen_random_uuid();  -- tenant in unit 106
  v_m_tenant_107 UUID := gen_random_uuid();  -- tenant in unit 107
  -- Spouses (2)
  v_m_spouse_104 UUID := gen_random_uuid();  -- spouse of owner 104
  v_m_spouse_108 UUID := gen_random_uuid();  -- spouse of owner 108
  -- Minors (3) -- children of owners
  v_m_minor_104  UUID := gen_random_uuid();  -- child of owner 104
  v_m_minor_108a UUID := gen_random_uuid();  -- child of owner 108
  v_m_minor_108b UUID := gen_random_uuid();  -- child of owner 108

  -- Assessments (2)
  v_assess_regular UUID := gen_random_uuid();
  v_assess_special UUID := gen_random_uuid();

  -- Invoices (25)
  v_inv_101_q1 UUID := gen_random_uuid();  -- paid
  v_inv_101_q2 UUID := gen_random_uuid();  -- paid
  v_inv_102_q1 UUID := gen_random_uuid();  -- paid
  v_inv_102_q2 UUID := gen_random_uuid();  -- pending
  v_inv_103_q1 UUID := gen_random_uuid();  -- paid
  v_inv_103_q2 UUID := gen_random_uuid();  -- overdue
  v_inv_104_q1 UUID := gen_random_uuid();  -- paid
  v_inv_104_q2 UUID := gen_random_uuid();  -- partial
  v_inv_105_q1 UUID := gen_random_uuid();  -- paid
  v_inv_105_q2 UUID := gen_random_uuid();  -- pending
  v_inv_106_q1 UUID := gen_random_uuid();  -- paid
  v_inv_106_q2 UUID := gen_random_uuid();  -- overdue
  v_inv_107_q1 UUID := gen_random_uuid();  -- waived
  v_inv_107_q2 UUID := gen_random_uuid();  -- pending
  v_inv_108_q1 UUID := gen_random_uuid();  -- paid
  v_inv_108_q2 UUID := gen_random_uuid();  -- voided
  v_inv_109_q1 UUID := gen_random_uuid();  -- paid
  v_inv_110_q1 UUID := gen_random_uuid();  -- overdue
  v_inv_111_q1 UUID := gen_random_uuid();  -- paid
  v_inv_112_q1 UUID := gen_random_uuid();  -- pending
  v_inv_113_q1 UUID := gen_random_uuid();  -- partial
  v_inv_114_q1 UUID := gen_random_uuid();  -- paid
  v_inv_115_q1 UUID := gen_random_uuid();  -- pending
  -- Special assessment invoices
  v_inv_sp_101 UUID := gen_random_uuid();   -- paid
  v_inv_sp_102 UUID := gen_random_uuid();   -- pending

  -- Payments (10)
  v_pay_101_q1 UUID := gen_random_uuid();
  v_pay_101_q2 UUID := gen_random_uuid();
  v_pay_102_q1 UUID := gen_random_uuid();
  v_pay_103_q1 UUID := gen_random_uuid();
  v_pay_104_q1 UUID := gen_random_uuid();
  v_pay_104_q2_partial UUID := gen_random_uuid();
  v_pay_105_q1 UUID := gen_random_uuid();
  v_pay_106_q1 UUID := gen_random_uuid();
  v_pay_108_q1 UUID := gen_random_uuid();
  v_pay_109_q1 UUID := gen_random_uuid();

  -- Amenities (4)
  v_amenity_clubhouse UUID := gen_random_uuid();
  v_amenity_pool      UUID := gen_random_uuid();
  v_amenity_tennis    UUID := gen_random_uuid();
  v_amenity_pavilion  UUID := gen_random_uuid();

  -- Reservations (8)
  v_res_1 UUID := gen_random_uuid();  -- clubhouse, approved
  v_res_2 UUID := gen_random_uuid();  -- pool, approved
  v_res_3 UUID := gen_random_uuid();  -- tennis, pending
  v_res_4 UUID := gen_random_uuid();  -- pavilion, approved
  v_res_5 UUID := gen_random_uuid();  -- clubhouse, denied
  v_res_6 UUID := gen_random_uuid();  -- pool, cancelled
  v_res_7 UUID := gen_random_uuid();  -- tennis, approved
  v_res_8 UUID := gen_random_uuid();  -- pavilion, pending

  -- Ballots (5)
  v_ballot_election  UUID := gen_random_uuid();  -- certified
  v_ballot_budget    UUID := gen_random_uuid();  -- closed, secret
  v_ballot_amendment UUID := gen_random_uuid();  -- open
  v_ballot_pool      UUID := gen_random_uuid();  -- draft
  v_ballot_survey    UUID := gen_random_uuid();  -- cancelled

  -- Ballot options
  v_bo_election_alice  UUID := gen_random_uuid();
  v_bo_election_bob    UUID := gen_random_uuid();
  v_bo_election_carol  UUID := gen_random_uuid();
  v_bo_budget_yes      UUID := gen_random_uuid();
  v_bo_budget_no       UUID := gen_random_uuid();
  v_bo_budget_abstain  UUID := gen_random_uuid();
  v_bo_amend_yes       UUID := gen_random_uuid();
  v_bo_amend_no        UUID := gen_random_uuid();
  v_bo_pool_yes        UUID := gen_random_uuid();
  v_bo_pool_no         UUID := gen_random_uuid();
  v_bo_survey_opt1     UUID := gen_random_uuid();
  v_bo_survey_opt2     UUID := gen_random_uuid();
  v_bo_survey_opt3     UUID := gen_random_uuid();

  -- Vendors (5)
  v_vendor_landscape UUID := gen_random_uuid();
  v_vendor_plumbing  UUID := gen_random_uuid();
  v_vendor_electric  UUID := gen_random_uuid();
  v_vendor_hvac      UUID := gen_random_uuid();
  v_vendor_security  UUID := gen_random_uuid();

  -- Maintenance requests (10)
  v_maint_1  UUID := gen_random_uuid();
  v_maint_2  UUID := gen_random_uuid();
  v_maint_3  UUID := gen_random_uuid();
  v_maint_4  UUID := gen_random_uuid();
  v_maint_5  UUID := gen_random_uuid();
  v_maint_6  UUID := gen_random_uuid();
  v_maint_7  UUID := gen_random_uuid();
  v_maint_8  UUID := gen_random_uuid();
  v_maint_9  UUID := gen_random_uuid();
  v_maint_10 UUID := gen_random_uuid();

  -- Violations (6)
  v_viol_1 UUID := gen_random_uuid();
  v_viol_2 UUID := gen_random_uuid();
  v_viol_3 UUID := gen_random_uuid();
  v_viol_4 UUID := gen_random_uuid();
  v_viol_5 UUID := gen_random_uuid();
  v_viol_6 UUID := gen_random_uuid();

  -- ARC requests (3)
  v_arc_1 UUID := gen_random_uuid();
  v_arc_2 UUID := gen_random_uuid();
  v_arc_3 UUID := gen_random_uuid();

  -- Budget
  v_budget_2026 UUID := gen_random_uuid();

  -- Journal entries (5)
  v_je_1 UUID := gen_random_uuid();
  v_je_2 UUID := gen_random_uuid();
  v_je_3 UUID := gen_random_uuid();
  v_je_4 UUID := gen_random_uuid();
  v_je_5 UUID := gen_random_uuid();

  -- Bulletin posts (10)
  v_post_1  UUID := gen_random_uuid();
  v_post_2  UUID := gen_random_uuid();
  v_post_3  UUID := gen_random_uuid();
  v_post_4  UUID := gen_random_uuid();
  v_post_5  UUID := gen_random_uuid();
  v_post_6  UUID := gen_random_uuid();
  v_post_7  UUID := gen_random_uuid();
  v_post_8  UUID := gen_random_uuid();
  v_post_9  UUID := gen_random_uuid();
  v_post_10 UUID := gen_random_uuid();

  -- Events (12)
  v_event_1  UUID := gen_random_uuid();
  v_event_2  UUID := gen_random_uuid();
  v_event_3  UUID := gen_random_uuid();
  v_event_4  UUID := gen_random_uuid();
  v_event_5  UUID := gen_random_uuid();
  v_event_6  UUID := gen_random_uuid();
  v_event_7  UUID := gen_random_uuid();
  v_event_8  UUID := gen_random_uuid();
  v_event_9  UUID := gen_random_uuid();
  v_event_10 UUID := gen_random_uuid();
  v_event_11 UUID := gen_random_uuid();
  v_event_12 UUID := gen_random_uuid();

  -- Account IDs (looked up after seeding chart of accounts)
  v_acct_ar        UUID;
  v_acct_cash      UUID;
  v_acct_dues_rev  UUID;
  v_acct_late_fees UUID;
  v_acct_maint_exp UUID;

BEGIN
  -- ── Idempotency guard ──
  IF EXISTS (SELECT 1 FROM communities WHERE slug = 'westwood6') THEN
    RAISE NOTICE 'Seed data already exists for westwood6, skipping.';
    RETURN;
  END IF;

  -- ============================================================
  -- 1. COMMUNITY
  -- ============================================================
  INSERT INTO communities (id, name, slug, address, phone, email, theme, tenant_permissions)
  VALUES (
    v_community_id,
    'Westwood Community Six',
    'westwood6',
    '1200 Westwood Blvd, Austin, TX 78704',
    '(512) 555-0100',
    'board@westwood6.org',
    '{
      "payment_settings": {
        "allow_flexible_frequency": true,
        "default_frequency": "quarterly",
        "late_fee_settings": {
          "enabled": true,
          "grace_period_days": 15,
          "fee_type": "flat",
          "fee_amount": 2500,
          "max_fee": 10000
        },
        "auto_generate_invoices": true,
        "auto_mark_overdue": true,
        "auto_notify_new_invoices": true,
        "reminder_days_before": 7,
        "reminder_days_after": 3
      },
      "voting_enabled": true,
      "bulletin_settings": {
        "posting": "all_households",
        "commenting": "all_households"
      },
      "email_settings": {
        "reply_to": "board@westwood6.org",
        "from_name": "Westwood Community Six",
        "primary_color": "#1D2024"
      },
      "arc_enabled": true,
      "onboarding": {
        "completed_steps": ["info", "units", "members", "assessments", "invites"],
        "completed_at": "2026-01-15T10:00:00Z"
      }
    }'::jsonb,
    '{"can_reserve_amenities": true, "can_attend_events": true, "can_submit_requests": true, "can_view_directory": true}'::jsonb
  );

  -- ============================================================
  -- 2. UNITS (15) - triggers auto-create unit_wallets
  -- ============================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency) VALUES
    (v_unit_101, v_community_id, '101', '101 Westwood Ln', 'active', 'quarterly'),
    (v_unit_102, v_community_id, '102', '102 Westwood Ln', 'active', 'quarterly'),
    (v_unit_103, v_community_id, '103', '103 Westwood Ln', 'active', 'quarterly'),
    (v_unit_104, v_community_id, '104', '104 Westwood Ln', 'active', 'monthly'),
    (v_unit_105, v_community_id, '105', '105 Westwood Ln', 'active', 'quarterly'),
    (v_unit_106, v_community_id, '106', '106 Westwood Ln', 'active', NULL),
    (v_unit_107, v_community_id, '107', '107 Westwood Ln', 'active', NULL),
    (v_unit_108, v_community_id, '108', '108 Westwood Ln', 'active', 'semi_annual'),
    (v_unit_109, v_community_id, '109', '109 Westwood Ln', 'active', 'quarterly'),
    (v_unit_110, v_community_id, '110', '110 Westwood Ln', 'active', 'quarterly'),
    (v_unit_111, v_community_id, '111', '111 Westwood Ln', 'active', 'annual'),
    (v_unit_112, v_community_id, '112', '112 Westwood Ln', 'active', NULL),
    (v_unit_113, v_community_id, '113', '113 Westwood Ln', 'active', 'quarterly'),
    (v_unit_114, v_community_id, '114', '114 Westwood Ln', 'active', 'quarterly'),
    (v_unit_115, v_community_id, '115', '115 Westwood Ln', 'active', NULL);

  -- ============================================================
  -- 3. MEMBERS (22) - parents first, then children
  -- ============================================================

  -- Board members (3)
  INSERT INTO members (id, unit_id, community_id, first_name, last_name, email, phone, member_role, system_role, board_title, show_in_directory, is_approved) VALUES
    (v_m_president, v_unit_101, v_community_id, 'James',   'Mitchell',  'james.mitchell@example.com',  '(512) 555-0101', 'owner', 'board',       'President',  true, true),
    (v_m_treasurer, v_unit_102, v_community_id, 'Linda',   'Chen',      'linda.chen@example.com',      '(512) 555-0102', 'owner', 'board',       'Treasurer',  true, true),
    (v_m_secretary, v_unit_103, v_community_id, 'Robert',  'Garcia',    'robert.garcia@example.com',   '(512) 555-0103', 'owner', 'board',       'Secretary',  true, true);

  -- Owners (12)
  INSERT INTO members (id, unit_id, community_id, first_name, last_name, email, phone, member_role, system_role, show_in_directory, is_approved) VALUES
    (v_m_owner_104, v_unit_104, v_community_id, 'Sarah',    'Johnson',   'sarah.johnson@example.com',   '(512) 555-0104', 'owner', 'resident', true,  true),
    (v_m_owner_105, v_unit_105, v_community_id, 'Michael',  'Williams',  'michael.williams@example.com','(512) 555-0105', 'owner', 'resident', true,  true),
    (v_m_owner_106, v_unit_106, v_community_id, 'Jennifer', 'Brown',     'jennifer.brown@example.com',  '(512) 555-0106', 'owner', 'resident', false, true),
    (v_m_owner_107, v_unit_107, v_community_id, 'David',    'Martinez',  'david.martinez@example.com',  '(512) 555-0107', 'owner', 'resident', true,  true),
    (v_m_owner_108, v_unit_108, v_community_id, 'Emily',    'Davis',     'emily.davis@example.com',     '(512) 555-0108', 'owner', 'resident', true,  true),
    (v_m_owner_109, v_unit_109, v_community_id, 'Daniel',   'Rodriguez', 'daniel.rodriguez@example.com','(512) 555-0109', 'owner', 'resident', true,  true),
    (v_m_owner_110, v_unit_110, v_community_id, 'Ashley',   'Wilson',    'ashley.wilson@example.com',   '(512) 555-0110', 'owner', 'resident', true,  true),
    (v_m_owner_111, v_unit_111, v_community_id, 'Matthew',  'Anderson',  'matthew.anderson@example.com','(512) 555-0111', 'owner', 'resident', true,  true),
    (v_m_owner_112, v_unit_112, v_community_id, 'Jessica',  'Thomas',    'jessica.thomas@example.com',  '(512) 555-0112', 'owner', 'resident', false, true),
    (v_m_owner_113, v_unit_113, v_community_id, 'Andrew',   'Taylor',    'andrew.taylor@example.com',   '(512) 555-0113', 'owner', 'resident', true,  true),
    (v_m_owner_114, v_unit_114, v_community_id, 'Amanda',   'Moore',     'amanda.moore@example.com',    '(512) 555-0114', 'owner', 'resident', true,  true),
    (v_m_owner_115, v_unit_115, v_community_id, 'Christopher','Jackson', 'christopher.jackson@example.com','(512) 555-0115', 'owner', 'resident', true,  true);

  -- Tenants (2)
  INSERT INTO members (id, unit_id, community_id, first_name, last_name, email, phone, member_role, system_role, show_in_directory, is_approved) VALUES
    (v_m_tenant_106, v_unit_106, v_community_id, 'Kevin',  'Lee',     'kevin.lee@example.com',     '(512) 555-0206', 'tenant', 'resident', false, true),
    (v_m_tenant_107, v_unit_107, v_community_id, 'Rachel', 'Harris',  'rachel.harris@example.com', '(512) 555-0207', 'tenant', 'resident', false, true);

  -- Spouses (2) - parent_member_id set
  INSERT INTO members (id, unit_id, community_id, first_name, last_name, email, phone, member_role, system_role, parent_member_id, show_in_directory, is_approved) VALUES
    (v_m_spouse_104, v_unit_104, v_community_id, 'Mark',    'Johnson',  'mark.johnson@example.com',  '(512) 555-0304', 'member', 'resident', v_m_owner_104, true, true),
    (v_m_spouse_108, v_unit_108, v_community_id, 'Ryan',    'Davis',    'ryan.davis@example.com',    '(512) 555-0308', 'member', 'resident', v_m_owner_108, true, true);

  -- Minors (3) - parent_member_id set
  INSERT INTO members (id, unit_id, community_id, first_name, last_name, member_role, system_role, parent_member_id, show_in_directory, is_approved) VALUES
    (v_m_minor_104,  v_unit_104, v_community_id, 'Lily',   'Johnson',  'minor', 'resident', v_m_owner_104, false, true),
    (v_m_minor_108a, v_unit_108, v_community_id, 'Ethan',  'Davis',    'minor', 'resident', v_m_owner_108, false, true),
    (v_m_minor_108b, v_unit_108, v_community_id, 'Sophie', 'Davis',    'minor', 'resident', v_m_owner_108, false, true);

  -- ============================================================
  -- 4. STRIPE ACCOUNT
  -- ============================================================
  INSERT INTO stripe_accounts (community_id, mode, onboarding_complete, charges_enabled, payouts_enabled)
  VALUES (v_community_id, 'direct', true, true, true);

  -- ============================================================
  -- 5. ASSESSMENTS (2)
  -- ============================================================
  INSERT INTO assessments (id, community_id, title, description, annual_amount, fiscal_year_start, fiscal_year_end, is_active, type, created_by) VALUES
    (v_assess_regular, v_community_id, '2026 Annual Dues', 'Regular annual HOA dues for 2026 fiscal year', 180000, '2026-01-01', '2026-12-31', true, 'regular', v_m_president),
    (v_assess_special, v_community_id, 'Pool Renovation Assessment', 'Special assessment for community pool renovation project', 60000, '2026-01-01', '2026-12-31', true, 'special', v_m_president);

  -- Update special assessment with installment info
  UPDATE assessments SET installments = 3, installment_start_date = '2026-03-01' WHERE id = v_assess_special;

  -- ============================================================
  -- 6. INVOICES (25)
  -- ============================================================

  -- Q1 invoices (due Jan 1) - mostly paid
  INSERT INTO invoices (id, community_id, unit_id, title, description, amount, due_date, status, amount_paid, assessment_id, paid_at, paid_by, late_fee_amount) VALUES
    (v_inv_101_q1, v_community_id, v_unit_101, 'Q1 2026 Dues',  'Quarterly dues', 45000, '2026-01-01', 'paid',    45000, v_assess_regular, now() - interval '60 days', v_m_president, 0),
    (v_inv_102_q1, v_community_id, v_unit_102, 'Q1 2026 Dues',  'Quarterly dues', 45000, '2026-01-01', 'paid',    45000, v_assess_regular, now() - interval '58 days', v_m_treasurer, 0),
    (v_inv_103_q1, v_community_id, v_unit_103, 'Q1 2026 Dues',  'Quarterly dues', 45000, '2026-01-01', 'paid',    45000, v_assess_regular, now() - interval '55 days', v_m_secretary, 0),
    (v_inv_104_q1, v_community_id, v_unit_104, 'Jan 2026 Dues',  'Monthly dues',  15000, '2026-01-01', 'paid',    15000, v_assess_regular, now() - interval '60 days', v_m_owner_104, 0),
    (v_inv_105_q1, v_community_id, v_unit_105, 'Q1 2026 Dues',  'Quarterly dues', 45000, '2026-01-01', 'paid',    45000, v_assess_regular, now() - interval '57 days', v_m_owner_105, 0),
    (v_inv_106_q1, v_community_id, v_unit_106, 'Q1 2026 Dues',  'Quarterly dues', 45000, '2026-01-01', 'paid',    45000, v_assess_regular, now() - interval '50 days', v_m_owner_106, 0),
    (v_inv_107_q1, v_community_id, v_unit_107, 'Q1 2026 Dues',  'Quarterly dues', 45000, '2026-01-01', 'waived',  0,     v_assess_regular, NULL, NULL, 0),
    (v_inv_108_q1, v_community_id, v_unit_108, 'H1 2026 Dues',  'Semi-annual dues',90000,'2026-01-01', 'paid',    90000, v_assess_regular, now() - interval '56 days', v_m_owner_108, 0),
    (v_inv_109_q1, v_community_id, v_unit_109, 'Q1 2026 Dues',  'Quarterly dues', 45000, '2026-01-01', 'paid',    45000, v_assess_regular, now() - interval '52 days', v_m_owner_109, 0),
    (v_inv_110_q1, v_community_id, v_unit_110, 'Q1 2026 Dues',  'Quarterly dues', 45000, '2026-01-01', 'overdue', 0,     v_assess_regular, NULL, NULL, 2500),
    (v_inv_111_q1, v_community_id, v_unit_111, '2026 Annual Dues','Annual dues',  180000, '2026-01-01', 'paid',   180000, v_assess_regular, now() - interval '59 days', v_m_owner_111, 0),
    (v_inv_112_q1, v_community_id, v_unit_112, 'Q1 2026 Dues',  'Quarterly dues', 45000, '2026-01-01', 'pending', 0,     v_assess_regular, NULL, NULL, 0),
    (v_inv_113_q1, v_community_id, v_unit_113, 'Q1 2026 Dues',  'Quarterly dues', 45000, '2026-01-01', 'partial', 20000, v_assess_regular, NULL, NULL, 0),
    (v_inv_114_q1, v_community_id, v_unit_114, 'Q1 2026 Dues',  'Quarterly dues', 45000, '2026-01-01', 'paid',    45000, v_assess_regular, now() - interval '53 days', v_m_owner_114, 0),
    (v_inv_115_q1, v_community_id, v_unit_115, 'Q1 2026 Dues',  'Quarterly dues', 45000, '2026-01-01', 'pending', 0,     v_assess_regular, NULL, NULL, 0);

  -- Q2 invoices (due Apr 1) - future, various statuses
  INSERT INTO invoices (id, community_id, unit_id, title, description, amount, due_date, status, amount_paid, assessment_id, paid_at, paid_by, late_fee_amount) VALUES
    (v_inv_101_q2, v_community_id, v_unit_101, 'Q2 2026 Dues', 'Quarterly dues', 45000, '2026-04-01', 'paid',    45000, v_assess_regular, now() - interval '2 days', v_m_president, 0),
    (v_inv_102_q2, v_community_id, v_unit_102, 'Q2 2026 Dues', 'Quarterly dues', 45000, '2026-04-01', 'pending', 0,     v_assess_regular, NULL, NULL, 0),
    (v_inv_103_q2, v_community_id, v_unit_103, 'Q2 2026 Dues', 'Quarterly dues', 45000, '2026-04-01', 'overdue', 0,     v_assess_regular, NULL, NULL, 2500),
    (v_inv_104_q2, v_community_id, v_unit_104, 'Feb 2026 Dues', 'Monthly dues',  15000, '2026-02-01', 'partial', 10000, v_assess_regular, NULL, NULL, 0),
    (v_inv_105_q2, v_community_id, v_unit_105, 'Q2 2026 Dues', 'Quarterly dues', 45000, '2026-04-01', 'pending', 0,     v_assess_regular, NULL, NULL, 0),
    (v_inv_106_q2, v_community_id, v_unit_106, 'Q2 2026 Dues', 'Quarterly dues', 45000, '2026-04-01', 'overdue', 0,     v_assess_regular, NULL, NULL, 2500),
    (v_inv_107_q2, v_community_id, v_unit_107, 'Q2 2026 Dues', 'Quarterly dues', 45000, '2026-04-01', 'pending', 0,     v_assess_regular, NULL, NULL, 0),
    (v_inv_108_q2, v_community_id, v_unit_108, 'H1 2026 Dues (voided)', 'Duplicate invoice voided', 90000, '2026-04-01', 'voided', 0, v_assess_regular, NULL, NULL, 0);

  -- Special assessment invoices
  INSERT INTO invoices (id, community_id, unit_id, title, description, amount, due_date, status, amount_paid, assessment_id, paid_at, paid_by, late_fee_amount) VALUES
    (v_inv_sp_101, v_community_id, v_unit_101, 'Pool Renovation - Installment 1', 'Special assessment installment', 20000, '2026-03-01', 'paid', 20000, v_assess_special, now() - interval '3 days', v_m_president, 0),
    (v_inv_sp_102, v_community_id, v_unit_102, 'Pool Renovation - Installment 1', 'Special assessment installment', 20000, '2026-03-01', 'pending', 0, v_assess_special, NULL, NULL, 0);

  -- Set waived invoice notes
  UPDATE invoices SET notes = 'Waived due to hardship exemption approved by board' WHERE id = v_inv_107_q1;
  UPDATE invoices SET notes = 'Voided: duplicate invoice created in error' WHERE id = v_inv_108_q2;

  -- ============================================================
  -- 7. PAYMENTS (10)
  -- ============================================================
  INSERT INTO payments (id, invoice_id, unit_id, amount, paid_by, created_at) VALUES
    (v_pay_101_q1, v_inv_101_q1, v_unit_101, 45000, v_m_president,  now() - interval '60 days'),
    (v_pay_101_q2, v_inv_101_q2, v_unit_101, 45000, v_m_president,  now() - interval '2 days'),
    (v_pay_102_q1, v_inv_102_q1, v_unit_102, 45000, v_m_treasurer,  now() - interval '58 days'),
    (v_pay_103_q1, v_inv_103_q1, v_unit_103, 45000, v_m_secretary,  now() - interval '55 days'),
    (v_pay_104_q1, v_inv_104_q1, v_unit_104, 15000, v_m_owner_104,  now() - interval '60 days'),
    (v_pay_104_q2_partial, v_inv_104_q2, v_unit_104, 10000, v_m_owner_104, now() - interval '10 days'),
    (v_pay_105_q1, v_inv_105_q1, v_unit_105, 45000, v_m_owner_105,  now() - interval '57 days'),
    (v_pay_106_q1, v_inv_106_q1, v_unit_106, 45000, v_m_owner_106,  now() - interval '50 days'),
    (v_pay_108_q1, v_inv_108_q1, v_unit_108, 92000, v_m_owner_108,  now() - interval '56 days'),  -- overpaid by $20
    (v_pay_109_q1, v_inv_109_q1, v_unit_109, 45000, v_m_owner_109,  now() - interval '52 days');

  -- ============================================================
  -- 8. WALLET TRANSACTIONS + BALANCE UPDATES
  -- ============================================================
  INSERT INTO wallet_transactions (unit_id, community_id, member_id, amount, type, reference_id, description, created_by) VALUES
    (v_unit_108, v_community_id, v_m_owner_108, 2000, 'overpayment', v_pay_108_q1, 'Overpayment on H1 2026 Dues', NULL),
    (v_unit_105, v_community_id, NULL, 5000, 'manual_credit', NULL, 'Board-approved credit for landscaping contribution', v_m_treasurer),
    (v_unit_110, v_community_id, NULL, -1500, 'manual_debit', NULL, 'Debit for unreturned pool key', v_m_treasurer),
    (v_unit_104, v_community_id, v_m_owner_104, 10000, 'deposit_return', v_res_1, 'Clubhouse deposit returned to wallet', v_m_treasurer);

  -- Update wallet balances
  UPDATE unit_wallets SET balance = 2000 WHERE unit_id = v_unit_108;
  UPDATE unit_wallets SET balance = 5000 WHERE unit_id = v_unit_105;
  UPDATE unit_wallets SET balance = -1500 WHERE unit_id = v_unit_110;
  UPDATE unit_wallets SET balance = 10000 WHERE unit_id = v_unit_104;

  -- ============================================================
  -- 9. AMENITIES (4)
  -- ============================================================
  INSERT INTO amenities (id, community_id, name, icon, description, public_description, capacity, fee, deposit, rules_text, operating_hours, auto_approve, requires_payment, reservable, booking_type, slot_duration_minutes, blocked_days, agreement_enabled, agreement_template, agreement_fields) VALUES
    (v_amenity_clubhouse, v_community_id, 'Clubhouse', 'building-2',
     'Community clubhouse available for private events and gatherings. Full kitchen, tables and chairs for 80.',
     'Beautiful clubhouse space available to residents for private events.',
     80, 15000, 25000,
     'No smoking indoors. All decorations must be removed after use. Noise must end by 10 PM. Renter is responsible for cleanup.',
     '{"monday": {"open": "08:00", "close": "22:00"}, "tuesday": {"open": "08:00", "close": "22:00"}, "wednesday": {"open": "08:00", "close": "22:00"}, "thursday": {"open": "08:00", "close": "22:00"}, "friday": {"open": "08:00", "close": "23:00"}, "saturday": {"open": "08:00", "close": "23:00"}, "sunday": {"open": "10:00", "close": "20:00"}}'::jsonb,
     false, true, true, 'full_day', NULL, '{}',
     true,
     'CLUBHOUSE RENTAL AGREEMENT\n\nI, {{signer_name}}, agree to the following terms:\n\n1. I will be responsible for any damages during my reservation.\n2. The space will be returned to its original condition.\n3. All guests will follow community rules.\n4. Maximum capacity of 80 persons will not be exceeded.\n5. Event type: {{event_type}}\n6. Estimated guests: {{guest_count}}\n\nSignature: {{signer_name}}\nDate: {{date}}',
     '[{"id": "event_type", "key": "event_type", "label": "Type of Event", "type": "select", "required": true, "options": ["Birthday Party", "Anniversary", "Meeting", "Holiday Gathering", "Other"]}, {"id": "guest_count", "key": "guest_count", "label": "Estimated Number of Guests", "type": "number", "required": true}, {"id": "alcohol", "key": "alcohol", "label": "Will alcohol be served?", "type": "yes_no", "required": true}]'::jsonb),

    (v_amenity_pool, v_community_id, 'Pool', 'waves',
     'Community swimming pool with lap lanes and wading area. Lifeguard on duty weekends only.',
     'Outdoor pool open seasonally from May through September.',
     40, 0, 0,
     'No glass containers. Children under 12 must be accompanied by an adult. No diving in shallow end. Pool hours strictly enforced.',
     '{"monday": {"open": "06:00", "close": "21:00"}, "tuesday": {"open": "06:00", "close": "21:00"}, "wednesday": {"open": "06:00", "close": "21:00"}, "thursday": {"open": "06:00", "close": "21:00"}, "friday": {"open": "06:00", "close": "22:00"}, "saturday": {"open": "08:00", "close": "22:00"}, "sunday": {"open": "08:00", "close": "20:00"}}'::jsonb,
     true, false, true, 'time_slot', 60, '{}',
     false, NULL, '[]'::jsonb),

    (v_amenity_tennis, v_community_id, 'Tennis Courts', 'circle-dot',
     'Two regulation tennis courts with lights for evening play. Equipment not provided.',
     'Two well-maintained tennis courts available for resident use.',
     4, 0, 0,
     'Proper tennis attire and shoes required. Courts must be swept after use. Maximum 90-minute sessions during peak hours.',
     '{"monday": {"open": "07:00", "close": "22:00"}, "tuesday": {"open": "07:00", "close": "22:00"}, "wednesday": {"open": "07:00", "close": "22:00"}, "thursday": {"open": "07:00", "close": "22:00"}, "friday": {"open": "07:00", "close": "22:00"}, "saturday": {"open": "07:00", "close": "22:00"}, "sunday": {"open": "07:00", "close": "20:00"}}'::jsonb,
     true, false, true, 'time_slot', 90, '{}',
     false, NULL, '[]'::jsonb),

    (v_amenity_pavilion, v_community_id, 'Pavilion', 'tent',
     'Covered outdoor pavilion with BBQ grills, picnic tables, and string lights. Great for cookouts and outdoor events.',
     'Covered pavilion with BBQ grills and seating for 30.',
     30, 5000, 10000,
     'Clean grills after use. Dispose of all trash. No open fires outside designated grills. Music must end by 9 PM.',
     '{"monday": {"open": "09:00", "close": "21:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "friday": {"open": "09:00", "close": "22:00"}, "saturday": {"open": "09:00", "close": "22:00"}, "sunday": {"open": "09:00", "close": "20:00"}}'::jsonb,
     false, true, true, 'both', 120, '{}',
     true,
     'PAVILION RENTAL AGREEMENT\n\nI, {{signer_name}}, agree to the following terms:\n\n1. I will clean all BBQ grills used during my reservation.\n2. All trash will be disposed of properly.\n3. Music and noise will end by 9 PM.\n4. Number of guests: {{guest_count}}\n\nSignature: {{signer_name}}\nDate: {{date}}',
     '[{"id": "guest_count", "key": "guest_count", "label": "Estimated Number of Guests", "type": "number", "required": true}, {"id": "grill_use", "key": "grill_use", "label": "Will you use the BBQ grills?", "type": "yes_no", "required": true}]'::jsonb);

  -- ============================================================
  -- 10. RESERVATIONS (8) - non-overlapping datetimes
  -- ============================================================
  INSERT INTO reservations (id, amenity_id, community_id, unit_id, reserved_by, start_datetime, end_datetime, status, purpose, guest_count, fee_amount, deposit_amount, deposit_paid, deposit_refunded, deposit_return_method, admin_notes, created_at) VALUES
    (v_res_1, v_amenity_clubhouse, v_community_id, v_unit_104, v_m_owner_104,
     (CURRENT_DATE + interval '7 days')::date::timestamp + time '10:00',
     (CURRENT_DATE + interval '7 days')::date::timestamp + time '18:00',
     'approved', 'Birthday party', 50, 15000, 25000, true, false, NULL, 'Approved. Decorations allowed.', now() - interval '5 days'),

    (v_res_2, v_amenity_pool, v_community_id, v_unit_105, v_m_owner_105,
     (CURRENT_DATE + interval '3 days')::date::timestamp + time '14:00',
     (CURRENT_DATE + interval '3 days')::date::timestamp + time '15:00',
     'approved', 'Swim lessons', 8, 0, 0, false, false, NULL, NULL, now() - interval '2 days'),

    (v_res_3, v_amenity_tennis, v_community_id, v_unit_109, v_m_owner_109,
     (CURRENT_DATE + interval '5 days')::date::timestamp + time '09:00',
     (CURRENT_DATE + interval '5 days')::date::timestamp + time '10:30',
     'pending', 'Tennis match', 4, 0, 0, false, false, NULL, NULL, now() - interval '1 day'),

    (v_res_4, v_amenity_pavilion, v_community_id, v_unit_108, v_m_owner_108,
     (CURRENT_DATE + interval '14 days')::date::timestamp + time '11:00',
     (CURRENT_DATE + interval '14 days')::date::timestamp + time '17:00',
     'approved', 'Family cookout', 25, 5000, 10000, true, false, NULL, 'Deposit received.', now() - interval '7 days'),

    (v_res_5, v_amenity_clubhouse, v_community_id, v_unit_110, v_m_owner_110,
     (CURRENT_DATE + interval '21 days')::date::timestamp + time '10:00',
     (CURRENT_DATE + interval '21 days')::date::timestamp + time '16:00',
     'denied', 'Large party', 120, 15000, 25000, false, false, NULL, 'Denied: guest count exceeds maximum capacity of 80.', now() - interval '3 days'),

    (v_res_6, v_amenity_pool, v_community_id, v_unit_113, v_m_owner_113,
     (CURRENT_DATE + interval '10 days')::date::timestamp + time '10:00',
     (CURRENT_DATE + interval '10 days')::date::timestamp + time '11:00',
     'cancelled', 'Pool party', 15, 0, 0, false, false, NULL, 'Cancelled by resident.', now() - interval '4 days'),

    (v_res_7, v_amenity_tennis, v_community_id, v_unit_101, v_m_president,
     (CURRENT_DATE + interval '2 days')::date::timestamp + time '17:00',
     (CURRENT_DATE + interval '2 days')::date::timestamp + time '18:30',
     'approved', 'Board tennis match', 4, 0, 0, false, false, NULL, NULL, now() - interval '1 day'),

    (v_res_8, v_amenity_pavilion, v_community_id, v_unit_115, v_m_owner_115,
     (CURRENT_DATE + interval '28 days')::date::timestamp + time '12:00',
     (CURRENT_DATE + interval '28 days')::date::timestamp + time '18:00',
     'pending', 'Neighborhood potluck', 30, 5000, 10000, false, false, NULL, NULL, now());

  -- ============================================================
  -- 11. SIGNED AGREEMENTS (2)
  -- ============================================================
  INSERT INTO signed_agreements (reservation_id, amenity_id, community_id, unit_id, signer_member_id, signer_name, filled_text, field_answers) VALUES
    (v_res_1, v_amenity_clubhouse, v_community_id, v_unit_104, v_m_owner_104, 'Sarah Johnson',
     'CLUBHOUSE RENTAL AGREEMENT\n\nI, Sarah Johnson, agree to the following terms:\n\n1. I will be responsible for any damages during my reservation.\n2. The space will be returned to its original condition.\n3. All guests will follow community rules.\n4. Maximum capacity of 80 persons will not be exceeded.\n5. Event type: Birthday Party\n6. Estimated guests: 50\n\nSignature: Sarah Johnson\nDate: ' || CURRENT_DATE::text,
     '{"event_type": "Birthday Party", "guest_count": "50", "alcohol": "No"}'::jsonb),

    (v_res_4, v_amenity_pavilion, v_community_id, v_unit_108, v_m_owner_108, 'Emily Davis',
     'PAVILION RENTAL AGREEMENT\n\nI, Emily Davis, agree to the following terms:\n\n1. I will clean all BBQ grills used during my reservation.\n2. All trash will be disposed of properly.\n3. Music and noise will end by 9 PM.\n4. Number of guests: 25\n\nSignature: Emily Davis\nDate: ' || CURRENT_DATE::text,
     '{"guest_count": "25", "grill_use": "Yes"}'::jsonb);

  -- ============================================================
  -- 12. EVENTS (12)
  -- ============================================================
  INSERT INTO events (id, community_id, title, description, location, amenity_id, start_datetime, end_datetime, visibility, blocks_amenity, created_by) VALUES
    -- Past events
    (v_event_1, v_community_id, 'New Year Celebration', 'Community New Year gathering with refreshments', 'Clubhouse', v_amenity_clubhouse,
     '2026-01-01 18:00:00', '2026-01-01 23:00:00', 'public', true, v_m_president),
    (v_event_2, v_community_id, 'January Board Meeting', 'Regular monthly board meeting', 'Clubhouse', v_amenity_clubhouse,
     '2026-01-15 19:00:00', '2026-01-15 21:00:00', 'public', true, v_m_president),
    (v_event_3, v_community_id, 'Winter Pool Maintenance', 'Annual pool winterization and maintenance', 'Pool', v_amenity_pool,
     '2026-01-20 08:00:00', '2026-01-22 17:00:00', 'public', true, v_m_treasurer),
    (v_event_4, v_community_id, 'February Board Meeting', 'Regular monthly board meeting', 'Clubhouse', v_amenity_clubhouse,
     '2026-02-19 19:00:00', '2026-02-19 21:00:00', 'public', true, v_m_president),
    (v_event_5, v_community_id, 'HOA Annual Meeting', 'Annual homeowner meeting and board election', 'Clubhouse', v_amenity_clubhouse,
     '2026-02-28 14:00:00', '2026-02-28 17:00:00', 'public', true, v_m_president),
    (v_event_6, v_community_id, 'Tennis Clinic', 'Free tennis clinic for residents', 'Tennis Courts', v_amenity_tennis,
     '2026-02-15 09:00:00', '2026-02-15 12:00:00', 'public', true, v_m_secretary),
    -- Future events
    (v_event_7, v_community_id, 'March Board Meeting', 'Regular monthly board meeting', 'Clubhouse', v_amenity_clubhouse,
     (CURRENT_DATE + interval '10 days')::date::timestamp + time '19:00',
     (CURRENT_DATE + interval '10 days')::date::timestamp + time '21:00',
     'public', true, v_m_president),
    (v_event_8, v_community_id, 'Spring Pool Opening', 'Pool opening day with food and music', 'Pool Area', v_amenity_pool,
     (CURRENT_DATE + interval '30 days')::date::timestamp + time '10:00',
     (CURRENT_DATE + interval '30 days')::date::timestamp + time '16:00',
     'public', true, v_m_treasurer),
    (v_event_9, v_community_id, 'Easter Egg Hunt', 'Community Easter egg hunt for kids', 'Pavilion & Grounds', v_amenity_pavilion,
     (CURRENT_DATE + interval '25 days')::date::timestamp + time '10:00',
     (CURRENT_DATE + interval '25 days')::date::timestamp + time '13:00',
     'public', true, v_m_secretary),
    (v_event_10, v_community_id, 'Board Strategy Session', 'Private board planning meeting', 'Clubhouse', v_amenity_clubhouse,
     (CURRENT_DATE + interval '15 days')::date::timestamp + time '10:00',
     (CURRENT_DATE + interval '15 days')::date::timestamp + time '14:00',
     'private', true, v_m_president),
    (v_event_11, v_community_id, 'Community Yard Sale', 'Annual neighborhood yard sale', 'Common Areas', NULL,
     (CURRENT_DATE + interval '35 days')::date::timestamp + time '08:00',
     (CURRENT_DATE + interval '35 days')::date::timestamp + time '14:00',
     'public', false, v_m_secretary),
    (v_event_12, v_community_id, 'Summer Tennis Tournament', 'Doubles tournament, sign up at the courts', 'Tennis Courts', v_amenity_tennis,
     (CURRENT_DATE + interval '45 days')::date::timestamp + time '08:00',
     (CURRENT_DATE + interval '45 days')::date::timestamp + time '18:00',
     'public', true, v_m_secretary);

  -- ============================================================
  -- 13. ANNOUNCEMENTS (6)
  -- ============================================================
  INSERT INTO announcements (community_id, title, body, priority, posted_by, is_public, created_at) VALUES
    (v_community_id, 'Welcome to DuesIQ!', 'We are excited to announce our transition to DuesIQ for HOA management. All residents can now log in to view invoices, make payments, reserve amenities, and stay up to date with community news. If you have not received your login credentials, please contact the board.', 'important', v_m_president, true, now() - interval '30 days'),
    (v_community_id, 'Pool Renovation Update', 'The pool renovation project is on track. Work is expected to begin in April and be completed by Memorial Day weekend. A special assessment has been issued to cover costs. Please check your invoices for details.', 'normal', v_m_treasurer, false, now() - interval '14 days'),
    (v_community_id, 'Parking Reminder', 'Please remember that overnight street parking is not permitted per community guidelines. Vehicles parked on the street between 2 AM and 6 AM may be towed at the owner''s expense. Use your garage or driveway.', 'normal', v_m_secretary, false, now() - interval '7 days'),
    (v_community_id, 'Water Main Repair - Temporary Shutoff', 'The city will be performing emergency water main repairs on March 10th from 8 AM to 2 PM. Water service will be temporarily interrupted for all units. Please plan accordingly and store water for essential needs.', 'urgent', v_m_president, false, now() - interval '3 days'),
    (v_community_id, 'Spring Landscaping Schedule', 'Our landscaping vendor Green Thumb will begin spring cleanup on March 15th. Services include lawn aeration, mulching, and tree trimming. Please remove personal items from common areas before that date.', 'normal', v_m_treasurer, false, now() - interval '1 day'),
    (v_community_id, 'Board Election Results', 'The 2026 board election has been certified. James Mitchell (President), Linda Chen (Treasurer), and Robert Garcia (Secretary) will continue serving for another term. Thank you to all who participated in the vote.', 'important', v_m_president, true, now() - interval '5 days');

  -- ============================================================
  -- 14. DOCUMENTS (12)
  -- ============================================================
  INSERT INTO documents (community_id, title, category, file_path, file_size, uploaded_by, is_public, created_at) VALUES
    (v_community_id, 'CC&Rs - Covenants, Conditions & Restrictions', 'rules', 'westwood6/documents/ccr-2026.pdf', 2456789, v_m_president, true, now() - interval '60 days'),
    (v_community_id, 'Community Bylaws', 'rules', 'westwood6/documents/bylaws-2026.pdf', 1234567, v_m_president, true, now() - interval '60 days'),
    (v_community_id, 'Architectural Guidelines', 'rules', 'westwood6/documents/arch-guidelines.pdf', 890123, v_m_secretary, true, now() - interval '45 days'),
    (v_community_id, '2026 Annual Budget', 'financial', 'westwood6/documents/budget-2026.pdf', 456789, v_m_treasurer, false, now() - interval '30 days'),
    (v_community_id, '2025 Year-End Financial Report', 'financial', 'westwood6/documents/financials-2025.pdf', 678901, v_m_treasurer, false, now() - interval '25 days'),
    (v_community_id, 'Reserve Study 2025', 'financial', 'westwood6/documents/reserve-study-2025.pdf', 3456789, v_m_treasurer, false, now() - interval '20 days'),
    (v_community_id, 'January 2026 Board Meeting Minutes', 'meeting_minutes', 'westwood6/documents/minutes-2026-01.pdf', 234567, v_m_secretary, false, now() - interval '45 days'),
    (v_community_id, 'February 2026 Board Meeting Minutes', 'meeting_minutes', 'westwood6/documents/minutes-2026-02.pdf', 245678, v_m_secretary, false, now() - interval '10 days'),
    (v_community_id, 'Annual Meeting Minutes - Feb 28', 'meeting_minutes', 'westwood6/documents/minutes-annual-2026.pdf', 345678, v_m_secretary, false, now() - interval '5 days'),
    (v_community_id, 'ARC Application Form', 'forms', 'westwood6/documents/arc-application.pdf', 123456, v_m_secretary, true, now() - interval '40 days'),
    (v_community_id, 'Amenity Reservation Request Form', 'forms', 'westwood6/documents/amenity-reservation-form.pdf', 98765, v_m_secretary, true, now() - interval '40 days'),
    (v_community_id, 'Pool Rules and Safety Guidelines', 'other', 'westwood6/documents/pool-rules.pdf', 156789, v_m_president, true, now() - interval '35 days');

  -- ============================================================
  -- 15. VENDORS (5)
  -- ============================================================
  INSERT INTO vendors (id, community_id, name, company, phone, email, category, license_number, insurance_expiry, notes, status) VALUES
    (v_vendor_landscape, v_community_id, 'Tom Green', 'Green Thumb Landscaping', '(512) 555-8001', 'tom@greenthumbatx.com', 'landscaping', 'LAN-2024-1234', '2027-06-30', 'Primary landscaping contractor. Weekly mowing, seasonal cleanup.', 'active'),
    (v_vendor_plumbing,  v_community_id, 'Mike Rivers', 'Rivers Plumbing Co.', '(512) 555-8002', 'mike@riversplumbing.com', 'plumbing', 'PLB-TX-5678', '2026-12-31', 'On-call plumber for common area issues.', 'active'),
    (v_vendor_electric,  v_community_id, 'Lisa Watts', 'Watts Electric Services', '(512) 555-8003', 'lisa@wattselectric.com', 'electrical', 'ELC-TX-9012', '2027-03-31', 'Handles lighting, outlet, and electrical panel work.', 'active'),
    (v_vendor_hvac,      v_community_id, 'Chris Cool', 'Cool Air HVAC', '(512) 555-8004', 'chris@coolairhvac.com', 'hvac', 'HVAC-TX-3456', '2026-09-30', 'Clubhouse and common area HVAC maintenance.', 'active'),
    (v_vendor_security,  v_community_id, 'Pat Shield', 'SecureGuard Services', '(512) 555-8005', 'pat@secureguard.com', 'security', 'SEC-TX-7890', '2027-01-31', 'Gate and camera system maintenance.', 'active');

  -- ============================================================
  -- 16. MAINTENANCE REQUESTS (10)
  -- ============================================================
  INSERT INTO maintenance_requests (id, community_id, unit_id, submitted_by, title, description, status, admin_notes, assigned_to, vendor_id, created_at) VALUES
    (v_maint_1, v_community_id, v_unit_104, v_m_owner_104, 'Broken sprinkler head on Lot 104', 'The sprinkler head near the front walkway is cracked and spraying water onto the sidewalk.', 'resolved', 'Replaced sprinkler head on 2/15.', v_m_treasurer, v_vendor_landscape, now() - interval '20 days'),
    (v_maint_2, v_community_id, v_unit_106, v_m_tenant_106, 'Common area light out', 'The street light between units 106 and 107 has been out for a week.', 'in_progress', 'Vendor scheduled for repair.', v_m_secretary, v_vendor_electric, now() - interval '5 days'),
    (v_maint_3, v_community_id, v_unit_108, v_m_owner_108, 'Clubhouse restroom leak', 'Faucet in the men''s restroom is dripping constantly.', 'open', NULL, NULL, NULL, now() - interval '2 days'),
    (v_maint_4, v_community_id, v_unit_101, v_m_president, 'Pool gate not closing', 'The self-closing mechanism on the pool gate is broken. Gate stays open.', 'in_progress', 'Parts ordered, repair scheduled next week.', v_m_president, v_vendor_security, now() - interval '4 days'),
    (v_maint_5, v_community_id, v_unit_109, v_m_owner_109, 'Dead tree in common area', 'Large dead oak tree between lots 109 and 110 is a hazard.', 'resolved', 'Tree removed on 2/20. Stump grinding completed.', v_m_treasurer, v_vendor_landscape, now() - interval '15 days'),
    (v_maint_6, v_community_id, v_unit_112, v_m_owner_112, 'Pavilion table damage', 'One of the picnic tables has a broken bench seat.', 'open', NULL, NULL, NULL, now() - interval '1 day'),
    (v_maint_7, v_community_id, v_unit_105, v_m_owner_105, 'Tennis court net sagging', 'The net on court 2 is sagging in the middle and needs tightening.', 'resolved', 'Net tension adjusted.', v_m_secretary, NULL, now() - interval '10 days'),
    (v_maint_8, v_community_id, v_unit_113, v_m_owner_113, 'Clubhouse AC not cooling', 'The clubhouse air conditioning seems to not be working. Very warm inside.', 'in_progress', 'HVAC vendor contacted.', v_m_treasurer, v_vendor_hvac, now() - interval '3 days'),
    (v_maint_9, v_community_id, v_unit_107, v_m_tenant_107, 'Mailbox cluster lock jammed', 'The lock on mailbox cluster B is jammed and cannot be opened.', 'open', NULL, NULL, NULL, now()),
    (v_maint_10, v_community_id, v_unit_114, v_m_owner_114, 'Irrigation timer malfunction', 'Common area irrigation is running at odd hours, watering at 2 PM in full sun.', 'closed', 'Timer reprogrammed by vendor.', v_m_treasurer, v_vendor_landscape, now() - interval '8 days');

  -- ============================================================
  -- 17. VIOLATIONS (6) + NOTICES (5)
  -- ============================================================
  INSERT INTO violations (id, community_id, unit_id, reported_by, category, title, description, status, severity, resolution_notes, resolved_at, created_at) VALUES
    (v_viol_1, v_community_id, v_unit_110, v_m_president, 'parking', 'Overnight street parking', 'Vehicle with license plate ABC-1234 parked on the street overnight on multiple occasions.', 'notice_sent', 'minor', NULL, NULL, now() - interval '14 days'),
    (v_viol_2, v_community_id, v_unit_113, v_m_secretary, 'trash', 'Trash cans left out past collection day', 'Trash cans have been left at the curb for 3+ days after collection.', 'resolved', 'warning', 'Homeowner moved bins after courtesy notice. No further issues.', now() - interval '5 days', now() - interval '10 days'),
    (v_viol_3, v_community_id, v_unit_106, v_m_president, 'architectural', 'Unapproved fence installation', 'A 6-foot privacy fence was installed without ARC approval. Fence exceeds height limits per CC&Rs.', 'under_review', 'major', NULL, NULL, now() - interval '7 days'),
    (v_viol_4, v_community_id, v_unit_115, v_m_secretary, 'noise', 'Repeated loud music after 10 PM', 'Multiple neighbors have complained about loud music from unit 115 after quiet hours.', 'notice_sent', 'minor', NULL, NULL, now() - interval '3 days'),
    (v_viol_5, v_community_id, v_unit_112, v_m_treasurer, 'maintenance', 'Lawn not maintained', 'Front lawn has not been mowed in over a month. Weeds are overgrown.', 'escalated', 'major', NULL, NULL, now() - interval '21 days'),
    (v_viol_6, v_community_id, v_unit_109, v_m_president, 'pets', 'Unleashed dog in common area', 'Dog was observed unleashed in the common area on two occasions. Community rules require leashes.', 'dismissed', 'warning', 'Homeowner was spoken to. Dog was in a fenced yard, not common area as initially reported.', now() - interval '1 day', now() - interval '8 days'));

  -- Violation notices
  INSERT INTO violation_notices (violation_id, notice_type, sent_at, sent_by, delivery_method, notes) VALUES
    (v_viol_1, 'courtesy', now() - interval '12 days', v_m_president, 'email', 'Initial courtesy notice sent via email.'),
    (v_viol_1, 'first_notice', now() - interval '5 days', v_m_president, 'both', 'Formal first notice. Vehicle still observed overnight.'),
    (v_viol_2, 'courtesy', now() - interval '8 days', v_m_secretary, 'email', 'Friendly reminder sent.'),
    (v_viol_4, 'courtesy', now() - interval '2 days', v_m_secretary, 'email', 'Courtesy notice about quiet hours policy.'),
    (v_viol_5, 'first_notice', now() - interval '14 days', v_m_treasurer, 'both', 'First notice: lawn maintenance required within 14 days.');

  -- ============================================================
  -- 18. ARC REQUESTS (3)
  -- ============================================================
  INSERT INTO arc_requests (id, community_id, unit_id, submitted_by, title, description, project_type, estimated_cost, status, conditions, reviewed_by, reviewed_at, expires_at, created_at) VALUES
    (v_arc_1, v_community_id, v_unit_105, v_m_owner_105, 'Replace front door', 'Replacing existing wooden front door with a fiberglass door. Color: dark walnut. Same dimensions as existing door.', 'other', 250000, 'approved', NULL, v_m_president, now() - interval '10 days', (CURRENT_DATE + interval '180 days')::date, now() - interval '20 days'),
    (v_arc_2, v_community_id, v_unit_109, v_m_owner_109, 'Install backyard patio', 'Adding a 12x16 stamped concrete patio in the backyard with a small retaining wall.', 'addition', 800000, 'submitted', NULL, NULL, NULL, NULL, now() - interval '3 days'),
    (v_arc_3, v_community_id, v_unit_114, v_m_owner_114, 'Solar panel installation', 'Installing 20 solar panels on south-facing roof. Using low-profile black panels to minimize visibility.', 'solar', 2500000, 'approved_with_conditions', 'Panels must be all black (no silver frames). Must be flush-mounted, not tilted. Installation must be completed by a licensed contractor.', v_m_president, now() - interval '5 days', (CURRENT_DATE + interval '365 days')::date, now() - interval '15 days'));

  -- ============================================================
  -- 19. BALLOTS + OPTIONS + ELIGIBILITY + VOTES + RESULTS
  -- ============================================================

  -- Ballot 1: Board Election (certified)
  INSERT INTO ballots (id, community_id, title, description, ballot_type, tally_method, is_secret_ballot, quorum_threshold, max_selections, opens_at, closes_at, status, certified_at, certified_by, results_published, results_published_at, created_by) VALUES
    (v_ballot_election, v_community_id, '2026 Board Election', 'Election for three board positions: President, Treasurer, and Secretary.', 'board_election', 'plurality', false, 0.2000, 3,
     '2026-02-20 08:00:00', '2026-02-28 17:00:00', 'certified',
     '2026-02-28 18:00:00', v_m_president, true, '2026-02-28 18:30:00', v_m_president);

  INSERT INTO ballot_options (id, ballot_id, label, description, display_order) VALUES
    (v_bo_election_alice, v_ballot_election, 'James Mitchell', 'Incumbent President. Serving since 2024.', 1),
    (v_bo_election_bob,   v_ballot_election, 'Linda Chen', 'Incumbent Treasurer. CPA with 10 years experience.', 2),
    (v_bo_election_carol, v_ballot_election, 'Robert Garcia', 'Incumbent Secretary. Active community volunteer.', 3);

  -- Eligibility for election (all 15 units, one voter per unit = the owner)
  INSERT INTO ballot_eligibility (ballot_id, unit_id, member_id, has_voted, voted_at) VALUES
    (v_ballot_election, v_unit_101, v_m_president,  true, '2026-02-21 10:00:00'),
    (v_ballot_election, v_unit_102, v_m_treasurer,  true, '2026-02-22 09:30:00'),
    (v_ballot_election, v_unit_103, v_m_secretary,  true, '2026-02-23 14:00:00'),
    (v_ballot_election, v_unit_104, v_m_owner_104,  true, '2026-02-24 11:00:00'),
    (v_ballot_election, v_unit_105, v_m_owner_105,  true, '2026-02-25 16:00:00'),
    (v_ballot_election, v_unit_106, v_m_owner_106,  true, '2026-02-26 10:00:00'),
    (v_ballot_election, v_unit_107, v_m_owner_107,  true, '2026-02-27 09:00:00'),
    (v_ballot_election, v_unit_108, v_m_owner_108,  true, '2026-02-21 15:00:00'),
    (v_ballot_election, v_unit_109, v_m_owner_109,  true, '2026-02-22 11:00:00'),
    (v_ballot_election, v_unit_110, v_m_owner_110,  false, NULL),
    (v_ballot_election, v_unit_111, v_m_owner_111,  true, '2026-02-24 08:00:00'),
    (v_ballot_election, v_unit_112, v_m_owner_112,  false, NULL),
    (v_ballot_election, v_unit_113, v_m_owner_113,  true, '2026-02-25 13:00:00'),
    (v_ballot_election, v_unit_114, v_m_owner_114,  true, '2026-02-26 17:00:00'),
    (v_ballot_election, v_unit_115, v_m_owner_115,  false, NULL);

  -- Votes for election (non-secret, 12 voters x up to 3 selections)
  INSERT INTO ballot_votes (ballot_id, unit_id, option_id, cast_by_member_id) VALUES
    (v_ballot_election, v_unit_101, v_bo_election_alice, v_m_president),
    (v_ballot_election, v_unit_101, v_bo_election_bob,   v_m_president),
    (v_ballot_election, v_unit_101, v_bo_election_carol, v_m_president),
    (v_ballot_election, v_unit_102, v_bo_election_alice, v_m_treasurer),
    (v_ballot_election, v_unit_102, v_bo_election_bob,   v_m_treasurer),
    (v_ballot_election, v_unit_102, v_bo_election_carol, v_m_treasurer),
    (v_ballot_election, v_unit_103, v_bo_election_alice, v_m_secretary),
    (v_ballot_election, v_unit_103, v_bo_election_bob,   v_m_secretary),
    (v_ballot_election, v_unit_103, v_bo_election_carol, v_m_secretary),
    (v_ballot_election, v_unit_104, v_bo_election_alice, v_m_owner_104),
    (v_ballot_election, v_unit_104, v_bo_election_bob,   v_m_owner_104),
    (v_ballot_election, v_unit_105, v_bo_election_alice, v_m_owner_105),
    (v_ballot_election, v_unit_105, v_bo_election_carol, v_m_owner_105),
    (v_ballot_election, v_unit_106, v_bo_election_alice, v_m_owner_106),
    (v_ballot_election, v_unit_106, v_bo_election_bob,   v_m_owner_106),
    (v_ballot_election, v_unit_106, v_bo_election_carol, v_m_owner_106),
    (v_ballot_election, v_unit_107, v_bo_election_alice, v_m_owner_107),
    (v_ballot_election, v_unit_107, v_bo_election_bob,   v_m_owner_107),
    (v_ballot_election, v_unit_108, v_bo_election_alice, v_m_owner_108),
    (v_ballot_election, v_unit_108, v_bo_election_bob,   v_m_owner_108),
    (v_ballot_election, v_unit_108, v_bo_election_carol, v_m_owner_108),
    (v_ballot_election, v_unit_109, v_bo_election_carol, v_m_owner_109),
    (v_ballot_election, v_unit_109, v_bo_election_alice, v_m_owner_109),
    (v_ballot_election, v_unit_111, v_bo_election_alice, v_m_owner_111),
    (v_ballot_election, v_unit_111, v_bo_election_bob,   v_m_owner_111),
    (v_ballot_election, v_unit_111, v_bo_election_carol, v_m_owner_111),
    (v_ballot_election, v_unit_113, v_bo_election_alice, v_m_owner_113),
    (v_ballot_election, v_unit_113, v_bo_election_bob,   v_m_owner_113),
    (v_ballot_election, v_unit_114, v_bo_election_alice, v_m_owner_114),
    (v_ballot_election, v_unit_114, v_bo_election_bob,   v_m_owner_114),
    (v_ballot_election, v_unit_114, v_bo_election_carol, v_m_owner_114);

  -- Results cache for election
  INSERT INTO ballot_results_cache (ballot_id, option_id, vote_count, vote_percentage, is_winner) VALUES
    (v_ballot_election, v_bo_election_alice, 12, 1.0000, true),
    (v_ballot_election, v_bo_election_bob,   10, 0.8333, true),
    (v_ballot_election, v_bo_election_carol,  9, 0.7500, true);

  -- Ballot 2: Budget Approval (closed, secret ballot)
  INSERT INTO ballots (id, community_id, title, description, ballot_type, tally_method, is_secret_ballot, quorum_threshold, opens_at, closes_at, status, created_by) VALUES
    (v_ballot_budget, v_community_id, '2026 Budget Approval', 'Vote to approve the proposed 2026 annual budget.', 'budget_approval', 'yes_no_abstain', true, 0.3000,
     '2026-02-15 08:00:00', '2026-02-25 17:00:00', 'closed', v_m_treasurer);

  INSERT INTO ballot_options (id, ballot_id, label, description, display_order) VALUES
    (v_bo_budget_yes,     v_ballot_budget, 'Yes',     'Approve the proposed budget', 1),
    (v_bo_budget_no,      v_ballot_budget, 'No',      'Reject the proposed budget', 2),
    (v_bo_budget_abstain, v_ballot_budget, 'Abstain', 'Abstain from voting', 3);

  INSERT INTO ballot_eligibility (ballot_id, unit_id, member_id, has_voted, voted_at) VALUES
    (v_ballot_budget, v_unit_101, v_m_president,  true, '2026-02-16 09:00:00'),
    (v_ballot_budget, v_unit_102, v_m_treasurer,  true, '2026-02-16 10:00:00'),
    (v_ballot_budget, v_unit_103, v_m_secretary,  true, '2026-02-17 11:00:00'),
    (v_ballot_budget, v_unit_104, v_m_owner_104,  true, '2026-02-18 14:00:00'),
    (v_ballot_budget, v_unit_105, v_m_owner_105,  true, '2026-02-19 10:00:00'),
    (v_ballot_budget, v_unit_106, v_m_owner_106,  false, NULL),
    (v_ballot_budget, v_unit_107, v_m_owner_107,  true, '2026-02-20 16:00:00'),
    (v_ballot_budget, v_unit_108, v_m_owner_108,  true, '2026-02-21 09:00:00'),
    (v_ballot_budget, v_unit_109, v_m_owner_109,  false, NULL),
    (v_ballot_budget, v_unit_110, v_m_owner_110,  false, NULL),
    (v_ballot_budget, v_unit_111, v_m_owner_111,  true, '2026-02-22 13:00:00'),
    (v_ballot_budget, v_unit_112, v_m_owner_112,  false, NULL),
    (v_ballot_budget, v_unit_113, v_m_owner_113,  true, '2026-02-23 11:00:00'),
    (v_ballot_budget, v_unit_114, v_m_owner_114,  true, '2026-02-24 15:00:00'),
    (v_ballot_budget, v_unit_115, v_m_owner_115,  false, NULL);

  -- Secret ballot votes (no member identity)
  INSERT INTO secret_ballot_votes (ballot_id, option_id) VALUES
    (v_ballot_budget, v_bo_budget_yes),
    (v_ballot_budget, v_bo_budget_yes),
    (v_ballot_budget, v_bo_budget_yes),
    (v_ballot_budget, v_bo_budget_yes),
    (v_ballot_budget, v_bo_budget_yes),
    (v_ballot_budget, v_bo_budget_yes),
    (v_ballot_budget, v_bo_budget_yes),
    (v_ballot_budget, v_bo_budget_no),
    (v_ballot_budget, v_bo_budget_no),
    (v_ballot_budget, v_bo_budget_abstain);

  INSERT INTO ballot_results_cache (ballot_id, option_id, vote_count, vote_percentage, is_winner) VALUES
    (v_ballot_budget, v_bo_budget_yes,     7, 0.7000, true),
    (v_ballot_budget, v_bo_budget_no,      2, 0.2000, false),
    (v_ballot_budget, v_bo_budget_abstain, 1, 0.1000, false);

  -- Ballot 3: Amendment (open, currently votable)
  INSERT INTO ballots (id, community_id, title, description, ballot_type, tally_method, is_secret_ballot, quorum_threshold, approval_threshold, opens_at, closes_at, status, created_by) VALUES
    (v_ballot_amendment, v_community_id, 'Amend Pet Policy', 'Proposal to update the community pet policy to allow up to 3 pets per household (currently limited to 2).', 'amendment', 'yes_no', false, 0.5000, 0.6667,
     (CURRENT_DATE - interval '2 days')::timestamp, (CURRENT_DATE + interval '12 days')::timestamp + time '17:00', 'open', v_m_secretary);

  INSERT INTO ballot_options (id, ballot_id, label, description, display_order) VALUES
    (v_bo_amend_yes, v_ballot_amendment, 'Yes', 'Approve the amendment to allow 3 pets', 1),
    (v_bo_amend_no,  v_ballot_amendment, 'No',  'Keep the current 2-pet limit', 2);

  INSERT INTO ballot_eligibility (ballot_id, unit_id, member_id, has_voted, voted_at) VALUES
    (v_ballot_amendment, v_unit_101, v_m_president,  true, (CURRENT_DATE - interval '1 day')::timestamp + time '10:00'),
    (v_ballot_amendment, v_unit_102, v_m_treasurer,  true, (CURRENT_DATE - interval '1 day')::timestamp + time '14:00'),
    (v_ballot_amendment, v_unit_103, v_m_secretary,  false, NULL),
    (v_ballot_amendment, v_unit_104, v_m_owner_104,  true, CURRENT_DATE::timestamp + time '09:00'),
    (v_ballot_amendment, v_unit_105, v_m_owner_105,  false, NULL),
    (v_ballot_amendment, v_unit_106, v_m_owner_106,  false, NULL),
    (v_ballot_amendment, v_unit_107, v_m_owner_107,  false, NULL),
    (v_ballot_amendment, v_unit_108, v_m_owner_108,  true, CURRENT_DATE::timestamp + time '11:00'),
    (v_ballot_amendment, v_unit_109, v_m_owner_109,  false, NULL),
    (v_ballot_amendment, v_unit_110, v_m_owner_110,  false, NULL),
    (v_ballot_amendment, v_unit_111, v_m_owner_111,  false, NULL),
    (v_ballot_amendment, v_unit_112, v_m_owner_112,  false, NULL),
    (v_ballot_amendment, v_unit_113, v_m_owner_113,  false, NULL),
    (v_ballot_amendment, v_unit_114, v_m_owner_114,  false, NULL),
    (v_ballot_amendment, v_unit_115, v_m_owner_115,  false, NULL);

  INSERT INTO ballot_votes (ballot_id, unit_id, option_id, cast_by_member_id) VALUES
    (v_ballot_amendment, v_unit_101, v_bo_amend_yes, v_m_president),
    (v_ballot_amendment, v_unit_102, v_bo_amend_yes, v_m_treasurer),
    (v_ballot_amendment, v_unit_104, v_bo_amend_no,  v_m_owner_104),
    (v_ballot_amendment, v_unit_108, v_bo_amend_yes, v_m_owner_108);

  -- Ballot 4: Pool Vote (draft, not yet open)
  INSERT INTO ballots (id, community_id, title, description, ballot_type, tally_method, is_secret_ballot, quorum_threshold, opens_at, closes_at, status, created_by) VALUES
    (v_ballot_pool, v_community_id, 'Pool Hours Extension', 'Vote on whether to extend pool hours to 10 PM on weekdays during summer months.', 'general', 'yes_no', false, 0.2000,
     (CURRENT_DATE + interval '14 days')::timestamp, (CURRENT_DATE + interval '28 days')::timestamp + time '17:00', 'draft', v_m_president);

  INSERT INTO ballot_options (id, ballot_id, label, description, display_order) VALUES
    (v_bo_pool_yes, v_ballot_pool, 'Yes', 'Extend pool hours to 10 PM on weekdays', 1),
    (v_bo_pool_no,  v_ballot_pool, 'No',  'Keep current pool hours', 2);

  -- Ballot 5: Survey (cancelled)
  INSERT INTO ballots (id, community_id, title, description, ballot_type, tally_method, is_secret_ballot, quorum_threshold, max_selections, opens_at, closes_at, status, created_by) VALUES
    (v_ballot_survey, v_community_id, 'Preferred Community Event', 'Survey: what type of community event would you most like to see?', 'general', 'plurality', false, 0.1000, 1,
     '2026-01-10 08:00:00', '2026-01-20 17:00:00', 'cancelled', v_m_secretary);

  INSERT INTO ballot_options (id, ballot_id, label, description, display_order) VALUES
    (v_bo_survey_opt1, v_ballot_survey, 'Summer BBQ', 'Large community barbecue at the pavilion', 1),
    (v_bo_survey_opt2, v_ballot_survey, 'Movie Night', 'Outdoor movie night on the lawn', 2),
    (v_bo_survey_opt3, v_ballot_survey, 'Holiday Party', 'End-of-year holiday celebration at the clubhouse', 3);

  -- ============================================================
  -- 20. PROXY AUTHORIZATIONS (2)
  -- ============================================================
  INSERT INTO proxy_authorizations (community_id, grantor_unit_id, grantor_member_id, grantee_member_id, ballot_id, status, authorized_at, expires_at) VALUES
    (v_community_id, v_unit_112, v_m_owner_112, v_m_owner_111, v_ballot_amendment, 'active', now() - interval '1 day', (CURRENT_DATE + interval '12 days')::timestamp + time '17:00'),
    (v_community_id, v_unit_115, v_m_owner_115, v_m_owner_114, v_ballot_election, 'expired', '2026-02-20 08:00:00', '2026-02-28 17:00:00');

  -- ============================================================
  -- 21. BULLETIN POSTS (10) + COMMENTS (15)
  -- ============================================================
  INSERT INTO bulletin_posts (id, community_id, title, body, posted_by, is_pinned, created_at) VALUES
    (v_post_1,  v_community_id, 'Welcome new neighbors!', 'Want to welcome the new family who just moved into unit 115. Stop by and say hello!', v_m_president, true, now() - interval '25 days'),
    (v_post_2,  v_community_id, 'Lost cat - orange tabby', 'Our orange tabby "Whiskers" got out last night. He''s friendly but shy. If you spot him around units 104-106, please let me know. He has a blue collar with a bell.', v_m_owner_104, false, now() - interval '20 days'),
    (v_post_3,  v_community_id, 'Free moving boxes', 'We have about 20 moving boxes in good condition. First come, first served. They''re stacked in front of unit 108.', v_m_owner_108, false, now() - interval '18 days'),
    (v_post_4,  v_community_id, 'Garage sale this Saturday', 'Having a garage sale this Saturday 8 AM to noon at unit 105. Furniture, toys, clothes, and kitchen items.', v_m_owner_105, false, now() - interval '15 days'),
    (v_post_5,  v_community_id, 'Babysitter recommendation?', 'Looking for a reliable babysitter for occasional weekend evenings. Any recommendations from the community?', v_m_owner_109, false, now() - interval '12 days'),
    (v_post_6,  v_community_id, 'Community Garden Interest', 'Would anyone be interested in starting a small community garden in the unused area behind the pavilion? I have gardening experience and would help organize it.', v_m_owner_113, true, now() - interval '8 days'),
    (v_post_7,  v_community_id, 'Dog walking group', 'Starting a morning dog walking group, meeting at the pavilion at 7 AM on weekdays. All friendly dogs welcome!', v_m_owner_111, false, now() - interval '6 days'),
    (v_post_8,  v_community_id, 'Plumber recommendation', 'Anyone have a good plumber they recommend? Have a slow drain that needs attention.', v_m_tenant_106, false, now() - interval '4 days'),
    (v_post_9,  v_community_id, 'Thank you for the pool party!', 'Just wanted to say thanks to everyone who came to the community pool gathering. It was a great turnout and the kids had a blast!', v_m_secretary, false, now() - interval '2 days'),
    (v_post_10, v_community_id, 'Book exchange box', 'I placed a little free library box near the mailboxes. Feel free to take a book or leave one. Let''s share some good reads!', v_m_owner_114, false, now() - interval '1 day');

  -- Comments
  INSERT INTO bulletin_comments (post_id, community_id, body, posted_by, created_at) VALUES
    (v_post_1, v_community_id, 'Welcome! We are happy to have you in the neighborhood.', v_m_owner_104, now() - interval '24 days'),
    (v_post_1, v_community_id, 'Welcome to Westwood! Let us know if you need anything.', v_m_treasurer, now() - interval '24 days'),
    (v_post_2, v_community_id, 'I think I saw an orange cat near the tennis courts yesterday evening!', v_m_owner_109, now() - interval '19 days'),
    (v_post_2, v_community_id, 'We will keep an eye out. Hope you find Whiskers soon!', v_m_owner_108, now() - interval '19 days'),
    (v_post_2, v_community_id, 'Update: Whiskers is home! Found him hiding under the pavilion. Thanks everyone!', v_m_owner_104, now() - interval '18 days'),
    (v_post_3, v_community_id, 'Grabbed a few for our garage. Thanks!', v_m_owner_112, now() - interval '17 days'),
    (v_post_4, v_community_id, 'We will stop by! Looking for a bookshelf.', v_m_owner_111, now() - interval '14 days'),
    (v_post_5, v_community_id, 'My daughter babysits. She is 16 and has her CPR certification. DM me for her number.', v_m_owner_104, now() - interval '11 days'),
    (v_post_5, v_community_id, 'We use a service called SitterCity. Highly recommend it.', v_m_owner_108, now() - interval '10 days'),
    (v_post_6, v_community_id, 'Count me in! I have been wanting to grow tomatoes and herbs.', v_m_owner_105, now() - interval '7 days'),
    (v_post_6, v_community_id, 'Great idea! I can contribute some tools and seeds.', v_m_owner_111, now() - interval '6 days'),
    (v_post_6, v_community_id, 'Love this idea. Let me check with the board about the space.', v_m_president, now() - interval '5 days'),
    (v_post_7, v_community_id, 'My golden retriever and I will be there! See you Monday.', v_m_owner_109, now() - interval '5 days'),
    (v_post_8, v_community_id, 'We use Rivers Plumbing. Mike is great and reasonably priced. His number is 512-555-8002.', v_m_owner_105, now() - interval '3 days'),
    (v_post_10, v_community_id, 'Love it! I just dropped off a few mystery novels.', v_m_owner_113, now() - interval '12 hours');

  -- ============================================================
  -- 22. NOTIFICATIONS (25+)
  -- ============================================================
  INSERT INTO notifications (community_id, member_id, type, title, body, reference_id, reference_type, read, created_at) VALUES
    -- Reservation notifications
    (v_community_id, v_m_owner_104, 'reservation_approved', 'Reservation Approved', 'Your clubhouse reservation has been approved.', v_res_1, 'reservation', true, now() - interval '4 days'),
    (v_community_id, v_m_owner_105, 'reservation_approved', 'Reservation Approved', 'Your pool reservation has been approved.', v_res_2, 'reservation', true, now() - interval '1 day'),
    (v_community_id, v_m_owner_110, 'reservation_denied', 'Reservation Denied', 'Your clubhouse reservation was denied due to capacity limits.', v_res_5, 'reservation', false, now() - interval '2 days'),
    (v_community_id, v_m_owner_109, 'reservation_created', 'New Reservation Request', 'A new tennis court reservation has been submitted.', v_res_3, 'reservation', false, now() - interval '1 day'),
    -- Board notifications for reservations
    (v_community_id, v_m_president, 'reservation_created', 'New Reservation Request', 'Unit 115 has requested a pavilion reservation.', v_res_8, 'reservation', false, now()),
    (v_community_id, v_m_treasurer, 'reservation_created', 'New Reservation Request', 'Unit 115 has requested a pavilion reservation.', v_res_8, 'reservation', false, now()),
    (v_community_id, v_m_secretary, 'reservation_created', 'New Reservation Request', 'Unit 115 has requested a pavilion reservation.', v_res_8, 'reservation', false, now()),
    -- Agreement notifications
    (v_community_id, v_m_president, 'agreement_signed', 'Agreement Signed', 'Sarah Johnson signed the clubhouse rental agreement for their upcoming reservation.', v_res_1, 'reservation', true, now() - interval '4 days'),
    (v_community_id, v_m_president, 'agreement_signed', 'Agreement Signed', 'Emily Davis signed the pavilion rental agreement.', v_res_4, 'reservation', true, now() - interval '6 days'),
    -- Ballot notifications
    (v_community_id, v_m_president, 'ballot_opened', 'Ballot Opened', 'The pet policy amendment ballot is now open for voting.', v_ballot_amendment, 'ballot', true, now() - interval '2 days'),
    (v_community_id, v_m_treasurer, 'ballot_opened', 'Ballot Opened', 'The pet policy amendment ballot is now open for voting.', v_ballot_amendment, 'ballot', true, now() - interval '2 days'),
    (v_community_id, v_m_owner_104, 'ballot_opened', 'Ballot Opened', 'The pet policy amendment ballot is now open for voting.', v_ballot_amendment, 'ballot', true, now() - interval '2 days'),
    (v_community_id, v_m_owner_105, 'ballot_opened', 'Ballot Opened', 'A new ballot is open for voting.', v_ballot_amendment, 'ballot', false, now() - interval '2 days'),
    (v_community_id, v_m_owner_106, 'ballot_opened', 'Ballot Opened', 'A new ballot is open for voting.', v_ballot_amendment, 'ballot', false, now() - interval '2 days'),
    (v_community_id, v_m_owner_107, 'ballot_opened', 'Ballot Opened', 'A new ballot is open for voting.', v_ballot_amendment, 'ballot', false, now() - interval '2 days'),
    (v_community_id, v_m_owner_108, 'ballot_opened', 'Ballot Opened', 'A new ballot is open for voting.', v_ballot_amendment, 'ballot', true, now() - interval '2 days'),
    -- Ballot results
    (v_community_id, v_m_president, 'ballot_results', 'Election Results Published', 'The 2026 Board Election results have been published.', v_ballot_election, 'ballot', true, now() - interval '5 days'),
    (v_community_id, v_m_treasurer, 'ballot_results', 'Election Results Published', 'The 2026 Board Election results have been published.', v_ballot_election, 'ballot', true, now() - interval '5 days'),
    -- Proxy notification
    (v_community_id, v_m_owner_111, 'proxy_granted', 'Proxy Granted', 'You have been granted proxy voting authority for unit 112.', NULL, 'proxy', true, now() - interval '1 day'),
    -- General notifications
    (v_community_id, v_m_owner_110, 'general', 'Overdue Invoice', 'Your Q1 2026 dues invoice is overdue. Please make payment as soon as possible.', v_inv_110_q1, 'invoice', false, now() - interval '10 days'),
    (v_community_id, v_m_owner_113, 'general', 'Partial Payment Received', 'A partial payment of $200.00 has been applied to your Q1 2026 dues.', v_inv_113_q1, 'invoice', true, now() - interval '8 days'),
    (v_community_id, v_m_owner_104, 'general', 'Wallet Credit', 'A deposit of $100.00 has been returned to your wallet.', NULL, 'wallet', true, now() - interval '3 days'),
    (v_community_id, v_m_president, 'general', 'New Maintenance Request', 'A new maintenance request has been submitted: Clubhouse restroom leak.', v_maint_3, 'maintenance', false, now() - interval '2 days'),
    (v_community_id, v_m_president, 'general', 'New Maintenance Request', 'A new maintenance request has been submitted: Mailbox cluster lock jammed.', v_maint_9, 'maintenance', false, now()),
    (v_community_id, v_m_owner_105, 'general', 'ARC Request Approved', 'Your ARC request to replace front door has been approved.', v_arc_1, 'arc_request', true, now() - interval '10 days'),
    (v_community_id, v_m_owner_114, 'general', 'ARC Request Approved with Conditions', 'Your solar panel installation request has been approved with conditions. Please review.', v_arc_3, 'arc_request', false, now() - interval '5 days');

  -- ============================================================
  -- 23. BUDGET + LINE ITEMS
  -- ============================================================
  INSERT INTO budgets (id, community_id, fiscal_year, total_income, total_expense, reserve_contribution, created_by) VALUES
    (v_budget_2026, v_community_id, 2026, 59220000, 48600000, 10620000, v_m_treasurer);

  INSERT INTO budget_line_items (budget_id, category, name, budgeted_amount, actual_amount, is_income, notes) VALUES
    -- Income
    (v_budget_2026, 'dues', 'Annual Dues (329 units x $1,800)', 59220000, 38700000, true, 'Based on 329 homes at $1,800/year'),
    (v_budget_2026, 'amenity_fees', 'Amenity Rental Fees', 1200000, 350000, true, 'Clubhouse and pavilion rentals'),
    (v_budget_2026, 'interest', 'Reserve Interest Income', 180000, 45000, true, 'Interest on reserve fund'),
    -- Expenses
    (v_budget_2026, 'landscaping', 'Landscaping Contract', 9600000, 4800000, false, 'Green Thumb Landscaping - monthly service'),
    (v_budget_2026, 'insurance', 'Community Insurance', 8400000, 8400000, false, 'Annual premium - paid in full'),
    (v_budget_2026, 'utilities', 'Common Area Utilities', 6000000, 2800000, false, 'Electric, water, internet for common areas'),
    (v_budget_2026, 'maintenance', 'General Maintenance', 7200000, 3100000, false, 'Repairs, supplies, misc maintenance'),
    (v_budget_2026, 'management', 'Management Fees', 4800000, 1200000, false, 'DuesIQ platform and management services'),
    (v_budget_2026, 'legal', 'Legal and Professional', 2400000, 800000, false, 'Legal counsel, audit, tax preparation'),
    (v_budget_2026, 'reserves', 'Reserve Fund Contribution', 10620000, 2655000, false, 'Annual reserve contribution per reserve study');

  -- ============================================================
  -- 24. CHART OF ACCOUNTS (function call)
  -- ============================================================
  PERFORM seed_default_chart_of_accounts(v_community_id);

  -- ============================================================
  -- 25. JOURNAL ENTRIES + LINES
  -- ============================================================

  -- Look up account IDs
  SELECT id INTO v_acct_ar FROM accounts WHERE community_id = v_community_id AND code = '1100' LIMIT 1;
  SELECT id INTO v_acct_cash FROM accounts WHERE community_id = v_community_id AND code = '1000' LIMIT 1;
  SELECT id INTO v_acct_dues_rev FROM accounts WHERE community_id = v_community_id AND code = '4000' LIMIT 1;
  SELECT id INTO v_acct_late_fees FROM accounts WHERE community_id = v_community_id AND code = '4100' LIMIT 1;
  SELECT id INTO v_acct_maint_exp FROM accounts WHERE community_id = v_community_id AND code = '5000' LIMIT 1;

  -- JE 1: Invoice created (debit AR, credit dues revenue)
  INSERT INTO journal_entries (id, community_id, entry_date, description, source, status, reference_type, reference_id, unit_id, created_by) VALUES
    (v_je_1, v_community_id, '2026-01-01', 'Q1 2026 Dues - Unit 101', 'invoice_created', 'posted', 'invoice', v_inv_101_q1, v_unit_101, v_m_treasurer);
  INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description) VALUES
    (v_je_1, v_acct_ar,       45000, 0, 'Accounts Receivable - Unit 101 Q1 Dues'),
    (v_je_1, v_acct_dues_rev, 0, 45000, 'Dues Revenue - Unit 101 Q1');

  -- JE 2: Payment received (debit cash, credit AR)
  INSERT INTO journal_entries (id, community_id, entry_date, description, source, status, reference_type, reference_id, unit_id, created_by) VALUES
    (v_je_2, v_community_id, CURRENT_DATE - interval '60 days', 'Payment received - Unit 101 Q1 Dues', 'payment_received', 'posted', 'payment', v_pay_101_q1, v_unit_101, v_m_treasurer);
  INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description) VALUES
    (v_je_2, v_acct_cash, 45000, 0, 'Cash - Payment from Unit 101'),
    (v_je_2, v_acct_ar,   0, 45000, 'Clear AR - Unit 101 Q1 payment');

  -- JE 3: Late fee applied
  INSERT INTO journal_entries (id, community_id, entry_date, description, source, status, reference_type, reference_id, unit_id, created_by) VALUES
    (v_je_3, v_community_id, CURRENT_DATE - interval '10 days', 'Late fee - Unit 110 Q1 Dues', 'late_fee_applied', 'posted', 'invoice', v_inv_110_q1, v_unit_110, NULL);
  INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description) VALUES
    (v_je_3, v_acct_ar,        2500, 0, 'AR - Late fee Unit 110'),
    (v_je_3, v_acct_late_fees, 0, 2500, 'Late fee revenue - Unit 110');

  -- JE 4: Manual journal entry
  INSERT INTO journal_entries (id, community_id, entry_date, description, source, status, memo, created_by) VALUES
    (v_je_4, v_community_id, CURRENT_DATE - interval '5 days', 'Common area landscaping payment', 'manual', 'posted', 'Monthly landscaping invoice from Green Thumb', v_m_treasurer);
  INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description) VALUES
    (v_je_4, v_acct_maint_exp, 80000, 0, 'Landscaping expense - March'),
    (v_je_4, v_acct_cash,      0, 80000, 'Cash payment to Green Thumb');

  -- JE 5: Wallet credit
  INSERT INTO journal_entries (id, community_id, entry_date, description, source, status, reference_type, unit_id, created_by) VALUES
    (v_je_5, v_community_id, CURRENT_DATE - interval '3 days', 'Wallet credit - Unit 105 landscaping contribution', 'wallet_credit', 'posted', 'wallet', v_unit_105, v_m_treasurer);
  INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description) VALUES
    (v_je_5, v_acct_maint_exp, 5000, 0, 'Expense offset - landscaping credit'),
    (v_je_5, v_acct_ar,        0, 5000, 'Wallet credit to Unit 105');

  -- ============================================================
  -- 26. SIGNUP REQUESTS (2)
  -- ============================================================
  INSERT INTO signup_requests (community_id, email, first_name, last_name, phone, unit_number, status, reviewed_by, reviewed_at) VALUES
    (v_community_id, 'newresident@example.com', 'Taylor', 'Swift', '(512) 555-9001', '116', 'pending', NULL, NULL),
    (v_community_id, 'denied@example.com', 'John', 'Doe', '(512) 555-9002', '999', 'denied', v_m_president, now() - interval '3 days');

  -- ============================================================
  -- 27. EMAIL PREFERENCES
  -- ============================================================
  -- Insert default preferences for all members with email (most enabled, a few disabled for variety)
  INSERT INTO email_preferences (member_id, community_id, category, enabled)
  SELECT m.id, m.community_id, c.category, true
  FROM members m
  CROSS JOIN (
    VALUES
      ('payment_confirmation'::email_category),
      ('payment_reminder'::email_category),
      ('announcement'::email_category),
      ('maintenance_update'::email_category),
      ('voting_notice'::email_category),
      ('reservation_update'::email_category),
      ('weekly_digest'::email_category),
      ('system'::email_category),
      ('violation_notice'::email_category)
  ) AS c(category)
  WHERE m.community_id = v_community_id
    AND m.email IS NOT NULL;

  -- Disable some preferences for variety
  UPDATE email_preferences SET enabled = false
  WHERE member_id = v_m_owner_110 AND category IN ('weekly_digest', 'announcement');

  UPDATE email_preferences SET enabled = false
  WHERE member_id = v_m_tenant_106 AND category = 'voting_notice';

  UPDATE email_preferences SET enabled = false
  WHERE member_id = v_m_owner_112 AND category = 'weekly_digest';

  RAISE NOTICE 'Seed data for westwood6 inserted successfully!';
END $$;
