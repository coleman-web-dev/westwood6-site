-- ============================================================
-- DuesIQ - Import Westwood Community Six Real Data
-- ============================================================
-- Generated: 2026-03-06
--
-- Source files:
--   housholds-Cory.csv  (329 households)
--   Members-Cory.csv    (348 members)
--
-- Run AFTER cleanup-seed-data.sql has cleared test data.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_community_id UUID;
  v_unit_id UUID;
BEGIN
  -- Get the existing Westwood 6 community
  SELECT id INTO v_community_id FROM communities WHERE slug = 'westwood6';

  IF v_community_id IS NULL THEN
    RAISE EXCEPTION 'Community westwood6 not found. Create the community first.';
  END IF;

  RAISE NOTICE 'Importing Westwood 6 data for community: %', v_community_id;
  RAISE NOTICE 'Creating 329 units and 348 members...';

  -- ================================================================
  -- Unit 329-27: Hereaux (Owner)
  -- 10306 NW 80th Drive, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '329-27', '10306 NW 80th Drive, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Lourdes', 'Hereaux', 'l.hereaux87@gmail.com', '305-775-8128', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 336-03: Pollard (Owner)
  -- 8005 NW 108th Ave, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '336-03', '8005 NW 108th Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Yannick', 'Pollard', 'tan_gotoy@yahoo.com', '954-661-9784', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 336-04: Luong (Owner)
  -- 8007 NW 108th Ave, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '336-04', '8007 NW 108th Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Kent', 'Luong', 'kentneekevin@gmail.com', '954-850-5368', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-01: Nicolas (Owner)
  -- 8302 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-01', '8302 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Nancy', 'Nicolas', 'demoiselle328@yahoo.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-02: Mclean (Owner)
  -- 8300 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-02', '8300 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Suzette', 'McLean', 'suzettem0925@gmail.com', '954-657-3402', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-03: Campbell (Owner)
  -- 8206 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 0
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-03', '8206 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;


  -- ================================================================
  -- Unit 350-04: Franco (Owner)
  -- 8204 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-04', '8204 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Patricia', 'Franco', 'pafrancober@yahoo.es', '754-368-0156', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-05: Villiers-Montalvo (Owner)
  -- 8202 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-05', '8202 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Marcia', 'Villiers-Montalvo', 'marciavrkv@gmail.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-06: Thompson (Owner)
  -- 8200 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-06', '8200 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Anthonio', 'Thompson', 'anth383@outlook.com', '954-383-8383', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-07: Ruiz (Owner)
  -- 8116 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-07', '8116 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Nina', 'Ruiz', 'pjblatz@gmail.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-08: Heller (Owner)
  -- 8114 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-08', '8114 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Elizabeth', 'Heller', 'elizabeth.heller91@gmail.com', '954-918-7533', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-09: Mcgrath (Owner)
  -- 10009 NW 81st Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-09', '10009 NW 81st Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Sandra', 'McGrath', 'sandy.emc50@gmail.com', '954-604-0430', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-10: DCI FAM Trust (Renter)
  -- 10007 NW  81st Court, Tamarac, FL 33321
  -- Mailing: 1526 NW 121 Drive, Coral Springs, FL 33071
  -- Members: 0
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-10', '10007 NW  81st Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;


  -- ================================================================
  -- Unit 350-11: Mancilla (Owner)
  -- 10006 NW 81st Court, Tamarac, FL 33321
  -- Members: 0
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-11', '10006 NW 81st Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;


  -- ================================================================
  -- Unit 350-12: Kaye (Owner)
  -- 10008 NW 81st Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-12', '10008 NW 81st Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Matthew & Merry', 'Kaye', 'mermat9196@bellsouth.net', '754-224-6447', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-13: Medina (Owner)
  -- 10010 NW 81st Court, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-13', '10010 NW 81st Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Claudia', 'Medina', 'cayism@gmail.com', '954-608-3748', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Aline', 'Zullino', 'aline.zullino@dlattylaw.com', '954-562-1919', 'member', 'resident', true);

  -- ================================================================
  -- Unit 350-14: Benacia (Owner)
  -- 8108 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 0
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-14', '8108 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;


  -- ================================================================
  -- Unit 350-15: Eric (Owner)
  -- 8106 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-15', '8106 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Kelly Ann', 'Asbury', 'kelley.asbury@yahoo.com', '619-651-0321', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-16: Handy (Owner)
  -- 8104 NW 100 Terrace, Tamarac, FL 33321
  -- Payment: annual
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-16', '8104 NW 100 Terrace, Tamarac, FL 33321', 'active', 'annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Simone', 'Handy', 'simonehandy15@gmail.com', NULL, 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Octavius', 'Handy', 'ohandy27@gmail.com', '786-259-7678', 'member', 'resident', true);

  -- ================================================================
  -- Unit 350-17: Fonseca (Owner)
  -- 8102 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-17', '8102 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Luis', 'Ramirez', 'luisalbertor68@live.com', '954-667-2342', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-18: Tho (Owner)
  -- 8100 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-18', '8100 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Phirun', 'Tho', 'andytho401@yahoo.com', '401-497-9179', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-19: Scott (Owner)
  -- 8022 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-19', '8022 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Alisa', 'Scott', 'astscott@msn.com', '954-675-1655', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-20: Heaton (Owner)
  -- 8020 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 0
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-20', '8020 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;


  -- ================================================================
  -- Unit 350-21: Sanchez (Owner)
  -- 8018 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-21', '8018 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Martha', 'Sanchez', 'marthasanchez63@hotmail.com', '786-487-7378', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-22: Kauffman (Owner)
  -- 8016 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-22', '8016 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Alba', 'Kauffman', 'karlba2@hotmail.com', '954-756-5932', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-23: Boening (Owner)
  -- 8014 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-23', '8014 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Lisa', 'Boening', 'msluvforlife@hotmail.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-24: Godoy (Owner)
  -- 8012 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-24', '8012 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Marilyn', 'Godoy', 'mari_23_91@icloud.com', '786-660-6760', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-25: Bendetowles (Owner)
  -- 8010 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-25', '8010 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Elsa', 'Bendetowies', 'cotik@att.net', '954-721-9890', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-26: Nguyen (Owner)
  -- 8008 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-26', '8008 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Trung', 'Nguyen', 'johnng@site321.com', '954-673-4244', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-27: Hosein (Owner)
  -- 8006 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-27', '8006 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Sean', 'Hosein', 'shelleyhosein@gmail.com', '954-254-4484', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-28: Herrera (Owner)
  -- 8004 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-28', '8004 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'German', 'Herrera', 'germanhg1219@gmail.com', '786-488-6422', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-29: Lockhart (Owner)
  -- 8002 NW 102nd Lane, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-29', '8002 NW 102nd Lane, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jeffrey', 'Lockhart', 'jefflockhart83@gmail.com', '754-368-2319', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-30: Versteeg (Owner)
  -- 8000 NW 102nd Lane, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-30', '8000 NW 102nd Lane, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Eric', 'Versteeg', 'eric.versteeg@gmail.com', '954-551-2847', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-31: Escobar (Owner)
  -- 10210 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-31', '10210 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'John', 'Escobar', 'esco802003@yahoo.com', '954-260-6279', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-32: Levy (Owner)
  -- 10212 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-32', '10212 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Glenford', 'Levy', 'glen.levy@aol.com', '954-378-1092', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-33: Alfonso (Owner)
  -- 10214 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-33', '10214 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Robert', 'Alfonso', 'rob@appsoft.us', '954-296-0180', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-34: Sordia (Owner)
  -- 10216 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-34', '10216 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Laura', 'Sordia Aguiar', 'laurasordia88@gmail.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-35: Cruz (Owner)
  -- 10218 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-35', '10218 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Lisette', 'Cruz', 'lisettec@tamarac.org', '954-383-9137', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-36: Anton (Owner)
  -- 10220 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-36', '10220 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Luis', 'Anton', 'sala12166768@gmail.com', '754-245-3628', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 350-37: Mansour (Owner)
  -- 10222 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '350-37', '10222 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Maher', 'Mansour', 'maher.mansour@gmail.com', '561-207-0647', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 351-01: Waggoner (Owner)
  -- 8100 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-01', '8100 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Matthew', 'Waggoner', 'mrwbuckeye@comcast.net', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 351-02: Paret (Owner)
  -- 8102 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-02', '8102 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Danick', 'Paret', 'danickparet26@outlook.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 351-03: Mercado (Owner)
  -- 8104 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-03', '8104 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Luz', 'Mercado', 'mercardoww6@yahoo.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 351-04: Mondesir (Owner)
  -- 8106 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-04', '8106 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Davelaine', 'Mondesir', 'davelainebox@gmail.com', '754-366-6651', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 351-05: Roberts (Owner)
  -- 8108 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-05', '8108 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jason', 'Roberts', 'jroberts8016@gmail.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 351-06: Marchetti (Owner)
  -- 8110 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-06', '8110 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Gino', 'Marchetti', 'gmarch49@gmail.com', '561-419-3650', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 351-07: Smith (Owner)
  -- 8112 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-07', '8112 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Anthony', 'Weisler', 'anthony.weisler@gmail.com', '954-461-1227', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 351-08: Alfonsetti (Owner)
  -- 8114 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-08', '8114 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Caroline', 'Alfonsetti', 'calfonsetti70@gmail.com', '954-829-2204', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 351-09: Marois (Owner)
  -- 8200 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-09', '8200 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Raymond & Brenda', 'Marois', 'raymarois@gmail.com', '786-300-9183', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 351-10: Barbosa (Owner)
  -- 8202 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-10', '8202 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Daniel Echeverria', 'Barbosa', 'paolita8618@hotmail.com', '954-842-8939', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Daniel', 'Echeverria', 'team300hpsubaru@hotmail.com', '954-248-0236', 'member', 'resident', true);

  -- ================================================================
  -- Unit 351-11: Rincon (Owner)
  -- 8204 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-11', '8204 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Yesenia', 'Fernandez-Vivas', 'yeseafv@gmail.com', '561-417-1565', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 351-12: Ramirez (Owner)
  -- 8206 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-12', '8206 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Dinamarie', 'Ramirez', 'dinamarieramirez@gmail.com', '954-540-7961', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 351-13: Culver (Owner)
  -- 8207 NW 100 Terrace, Tamarac, FL 33321
  -- Payment: annual
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-13', '8207 NW 100 Terrace, Tamarac, FL 33321', 'active', 'annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Tiffany Rose', 'Epps Culver', 'tiffanyrculver@gmail.com', '954-464-1207', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 351-14: Pettus (Owner)
  -- 8205 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-14', '8205 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Kayla', 'Pettus', 'munerakayla@yahoo.com', '904-537-8327', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Shane Christopher', 'Pettus', 'spettus3@gmail.com', '954-562-3432', 'member', 'resident', true);

  -- ================================================================
  -- Unit 351-15: Taub (Renter)
  -- 8203 NW 100 Terrace, Tamarac, FL 33321
  -- Payment: annual
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-15', '8203 NW 100 Terrace, Tamarac, FL 33321', 'active', 'annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'CHANOCH Eric', 'TAUB', 'erictaub@bellsouth.net', NULL, 'tenant', 'resident', true);

  -- ================================================================
  -- Unit 351-16: Laguerre (Owner)
  -- 8201 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-16', '8201 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Wesly', 'Laguerre', 'wesly_laguerre@yahoo.com', '954-471-4620', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 351-17: Fleischer (Owner)
  -- 8117 NW 100 Terrace, Tamarac, FL 33321
  -- Payment: annual
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-17', '8117 NW 100 Terrace, Tamarac, FL 33321', 'active', 'annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Kenneth', 'Fleischer', 'kenf11@comcast.net', '954-254-0580', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Heather', 'Fleischer', 'hlheffernan@gmail.com', NULL, 'member', 'resident', true);

  -- ================================================================
  -- Unit 351-18: Panades (Owner)
  -- 8115 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-18', '8115 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Steven', 'Panades', 'steven2545@gmail.com', '786-427-5551', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 351-19: Ramirez (Owner)
  -- 8113 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-19', '8113 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Anthony', 'Ramirez', 'zerimarcorporation@gmail.com', '954-394-9506', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Frank', 'Molino', 'frankmo5488@gmail.com', '954-993-8206', 'member', 'resident', true);

  -- ================================================================
  -- Unit 351-20: Prestano (Owner)
  -- 8111 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-20', '8111 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Meryl', 'Prestano', 'blades1751@bellsouth.net', '954-552-5436', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 351-21: Montoya (Owner)
  -- 8109 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-21', '8109 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Julian', 'Montoya', 'julian82772000@yahoo.com', '954-592-2368', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 351-22: Delgado (Owner)
  -- 8107 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-22', '8107 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Susana', 'Delgado', 'kmeyocks@yahoo.com', '786-398-2354', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 351-23: Santana (Owner)
  -- 8105 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-23', '8105 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Carlos', 'Santana', 'santanasfamily@att.net', '305-318-2193', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 351-24: Sub LLC (Renter)
  -- 8103 NW 100 Terrace, Tamarac, FL 33321
  -- Mailing: 5020 Lyndon B Johnson Hwy. #600, Dallas TX 75240
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-24', '8103 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'SRP Sub LLC', 'LLC Conservice', 'hoaeast@invitationhomes.com', '480-362-9706', 'tenant', 'resident', true);

  -- ================================================================
  -- Unit 351-25: Escobar-Euse (Owner)
  -- 8101 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '351-25', '8101 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Bonnye', 'Escobar-Euse', 'bonnye.giraldo@gmail.com', '954-604-0968', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-01: Enzinna (Owner)
  -- 10222 NW 80th Drive, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-01', '10222 NW 80th Drive, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Samuel', 'Enzinna', 'samuelenzinnaww6@yahoo.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-02: Whitehead (Owner)
  -- 10220 NW 80th Drive, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-02', '10220 NW 80th Drive, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'James', 'Whitehead', 'ajjmw91@yahoo.com', '610-428-7662', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-03: Coney (Owner)
  -- 10218 NW 80th Drive, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-03', '10218 NW 80th Drive, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Elsie', 'Coney', 'ceconey66@gmail.com', '786-301-4968', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-04: Baker (Owner)
  -- 10216 NW 80th Drive, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-04', '10216 NW 80th Drive, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Annette', 'Baker', 'nanny0125@gmail.com', '954-425-2662', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-05: Pizza (Owner)
  -- 10214 NW 80th Drive, Tamarac, FL 33321
  -- Payment: annual
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-05', '10214 NW 80th Drive, Tamarac, FL 33321', 'active', 'annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Louis', 'Pizza', 'louispizza309@gmail.com', '954-722-1193', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-06: Fitzgerald (Owner)
  -- 10212 NW 80th Drive, Tamarac, FL 33321
  -- Payment: annual
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-06', '10212 NW 80th Drive, Tamarac, FL 33321', 'active', 'annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Barbara', 'Fitzgerald', 'jfbfdf@aol.com', '954-726-9358', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-07: Beltran (Owner)
  -- 8008 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-07', '8008 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Andres', 'Beltran', 'andresbeltran25@live.com', '954-864-2749', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Cindy', 'Vazquez', 'cindyvasquez@live.com', '954-864-2693', 'member', 'resident', true);

  -- ================================================================
  -- Unit 352-08: Griffin (Owner)
  -- 8010 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-08', '8010 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Nancy', 'Griffin', 'nancy327@live.com', '954-394-9503', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-09: Amador (Owner)
  -- 8012 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-09', '8012 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Handher', 'Amador', 'handher@yahoo.com', '786-393-8769', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-10: Toro (Owner)
  -- 8014 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-10', '8014 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Julian', 'Toro', 'jtoro3164@outlook.com', '786-503-4721', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-11: Dennis (Owner)
  -- 8016 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-11', '8016 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Caroline', 'Dennis', 'carolinedennis2018@yahoo.com', '954-822-9847', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-12: Schwerdt (Owner)
  -- 8018 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-12', '8018 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'John', 'Schwerdt', 'john@schwerdtfamily.com', '954-270-9885', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-13: Lothbrok (McEnvoy) (Owner)
  -- 8020 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-13', '8020 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jonathan', 'McEvoy', 'jmcevoy1988@gmail.com', '754-368-6697', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-14: Casolari (Owner)
  -- 8019 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-14', '8019 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Linda', 'Casolari', 'lcasolari@bellsouth.net', '954-444-1257', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-15: Baubien (Owner)
  -- 8017 NW 100 Terrace, Tamarac, FL 33321
  -- Payment: annual
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-15', '8017 NW 100 Terrace, Tamarac, FL 33321', 'active', 'annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Gibson', 'Baubien', 'beaubiengibson@gmail.com', '754-281-4409', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-16: Valmyr (Owner)
  -- 8015 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-16', '8015 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Wilna', 'Valmyr', 'wilnavalmyr06@gmail.com', '305-586-6477', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Patrick', 'Valmyr', 'patrickvalmyr@yahoo.com', '305-586-6477', 'member', 'resident', true);

  -- ================================================================
  -- Unit 352-17: Garnick (Owner)
  -- 8013 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-17', '8013 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Beverly', 'Garnick', 'bsg1942@att.net', '954-718-9365', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-18: Vasquez (Owner)
  -- 8011 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-18', '8011 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Denice', 'Vasquez', 'denden2307@yahoo.com', '516-376-3594', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-19: Dookhan (Owner)
  -- 8009 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 0
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-19', '8009 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;


  -- ================================================================
  -- Unit 352-20: Radulic (Owner)
  -- 8007 NW 100 Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-20', '8007 NW 100 Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Rachel', 'Radulic', 'rachelradulic@gmail.com', '954-232-9190', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-21: Hernandez REV Trust (Renter)
  -- 8005 NW 100 Terrace, Tamarac, FL 33321
  -- Payment: annual
  -- Mailing: 8204 NW 59th Street, Tamarac FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-21', '8005 NW 100 Terrace, Tamarac, FL 33321', 'active', 'annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Margarita', 'Hernandez', 'margaritahernandezrealtor@gmail.com', '954-557-4672', 'tenant', 'resident', true);

  -- ================================================================
  -- Unit 352-22: Escoffery (Owner)
  -- 10211 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-22', '10211 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Meisha', 'Escoffery', 'meishaescoffery@aol.com', '954-614-7611', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-23: Thomas (Owner)
  -- 10213 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-23', '10213 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Satura', 'Thomas', 'satura00@yahoo.com', '754-224-0214', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-24: Maldonado (Owner)
  -- 10215 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-24', '10215 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Richard', 'Maldonado', 'santiagoshaina2@gmail.com', '954-505-1497', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-25: Filiberto (Owner)
  -- 10217 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-25', '10217 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'FILIBERTO', 'DONALD', 'filibertodonald@yahoo.com', '786-256-9767', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-26: Tomas (Owner)
  -- 10219 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-26', '10219 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Daryl', 'Tomas', 'cyberguitarist@gmail.com', '954-328-3685', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 352-27: Gordon (Owner)
  -- 10221 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '352-27', '10221 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Joyce', 'Gordon', 'joycehinds1@gmail.com', '954-708-8958', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 353-01: Martin (Owner)
  -- 8008 NW 102nd Way, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '353-01', '8008 NW 102nd Way, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Querline', 'Martin', 'querlinemartinww6@yahoo.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 353-02: Smith-Davis (Owner)
  -- 8010 NW 102nd Way, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '353-02', '8010 NW 102nd Way, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Gabrielle', 'Smith-Davis', 'gabrielle.smith011@gmail.com', '954-665-1340', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Phillip', 'Davis', 'pdavis06@yahoo.com', '954-589-8383', 'member', 'resident', true);

  -- ================================================================
  -- Unit 353-03: Espeut (Owner)
  -- 8012 NW 102nd Way, Tamarac, FL 33321
  -- Payment: annual
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '353-03', '8012 NW 102nd Way, Tamarac, FL 33321', 'active', 'annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Sean', 'Espeut', 'sean.esqeut@beckman.com', '954-591-0509', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jo Ann', 'Espeut', 'joannieespeut@bellsouth.net', '954-591-0509', 'member', 'resident', true);

  -- ================================================================
  -- Unit 353-04: Artuso (Owner)
  -- 8100 NW 102nd Terrace, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '353-04', '8100 NW 102nd Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jill', 'Artuso', 'jilldraper1976@icloud.com', '954-673-8179', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jill', 'Artuso', 'chebella5@yahoo.com', '954-673-8179', 'member', 'resident', true);

  -- ================================================================
  -- Unit 353-05: Caldera (Owner)
  -- 8102 NW 102nd Terrace, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '353-05', '8102 NW 102nd Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Elsie', 'Caldera', 'elsie.caldera1230@gmail.com', '954-376-9857', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Carlos', 'Caldera', 'carlos.caldera1230@gmail.com', '954-376-9857', 'member', 'resident', true);

  -- ================================================================
  -- Unit 353-06: Shaw (Owner)
  -- 8104 NW 102nd Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '353-06', '8104 NW 102nd Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Melissa', 'Shaw', 'mshawkitty@hotmail.com', '954-899-2274', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 353-07: Cronin (Owner)
  -- 8106 NW 102nd Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '353-07', '8106 NW 102nd Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Georgette', 'Cronin', 'missyfaccia@yahoo.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 353-08: Hersey (Owner)
  -- 8108 NW 102nd Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '353-08', '8108 NW 102nd Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Margot', 'Hersey', 'margot.mirabal@staples.com', '954-234-3105', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 353-09: Marrero (Owner)
  -- 10200 NW 82nd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '353-09', '10200 NW 82nd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Natalie', 'Alonso', 'naty1019@yahoo.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 353-10: Carro (Owner)
  -- 10106 NW 82nd Street, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '353-10', '10106 NW 82nd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Dylan', 'Carro', 'carrodylan85@gmail.com', '954-665-1142', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Samantha', 'Sindone', 'samantha710@att.net', '561-221-5783', 'member', 'resident', true);

  -- ================================================================
  -- Unit 353-11: Mcfarlaine (Owner)
  -- 10104 NW 82nd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '353-11', '10104 NW 82nd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Sachonia', 'McFarlaine', 'mcfarlainess.sm@gmail.com', '954-348-7695', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 353-12: Billig (Owner)
  -- 8105 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '353-12', '8105 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Anita', 'Billig', 'anitabillig@hotmail.com', '954-369-8609', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 353-13: Bartlett (Owner)
  -- 8103 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '353-13', '8103 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Corey', 'Bartlett', 'bartlett.westwood24@gmail.com', '954-303-1268', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 353-14: Brown (Owner)
  -- 8101 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '353-14', '8101 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Clarissa', 'Brown', 'clar13brown@gmail.com', NULL, 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Tamarsha', 'Brown-Martin', 'btamarsha@yahoo.com', '754-242-3809', 'member', 'resident', true);

  -- ================================================================
  -- Unit 353-15: Pons (Owner)
  -- 8021 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '353-15', '8021 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Miguel', 'Pons', 'mep.filos@gmail.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 353-16: Cuna (Owner)
  -- 8019 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '353-16', '8019 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Dario', 'Cuna', 'dcnegro82@hotmail.com', '561-584-2717', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 353-17: Mateus (Owner)
  -- 8017 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '353-17', '8017 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Cheryl', 'Mateus', 'cherylannmateus@gmail.com', '954-687-5574', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 354-01: Kallmann (Owner)
  -- 8008 NW 103rd Ave, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '354-01', '8008 NW 103rd Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'KIM', 'KALLMANN', 'kkallmann333@yahoo.com', '954-806-0083', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 354-02: Desamours (Owner)
  -- 8010 NW 103rd Ave, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '354-02', '8010 NW 103rd Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Ashley', 'Desamours', 'fiona_305@yahoo.com', '305-896-2431', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 354-03: Pryor (Owner)
  -- 8012 NW 103rd Ave, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '354-03', '8012 NW 103rd Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Keith', 'Pryor', 'keith.pryor@mac.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 354-04: De Leon (Owner)
  -- 8013 NW 102nd Way, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '354-04', '8013 NW 102nd Way, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jordan', 'De Leon', 'jordanhdeleon@gmail.com', '954-881-5104', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 354-05: Am (Owner)
  -- 8011 NW 102nd Way, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '354-05', '8011 NW 102nd Way, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Sokear', 'Am', 'kkenny401@live.com', '401-660-0882', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 354-06: Millien (Owner)
  -- 8009 NW 102nd Way, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '354-06', '8009 NW 102nd Way, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Kerly', 'Milien', 'milienk.2015@gmail.com', '954-816-5032', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 354-07: Garcia (Owner)
  -- 8007 NW 102nd Way, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '354-07', '8007 NW 102nd Way, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Daniel', 'Garcia', 'danielgarcia1002@gmail.com', '954-638-0329', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 354-08: Brooks (Owner)
  -- 10215 NW 80th Drive, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '354-08', '10215 NW 80th Drive, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Cleavone', 'Brooks', 'depbmb@yahoo.com', NULL, 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Esperanza', 'Caridad', 'caridadesperanza489@gmail.com', NULL, 'member', 'resident', true);

  -- ================================================================
  -- Unit 354-09: Millan (Owner)
  -- 10217 NW 80th Drive, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '354-09', '10217 NW 80th Drive, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'sergio', 'jaramillo', 'sergiojaramillo1@hotmail.com', '954-448-1324', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 355-01: Palen (Owner)
  -- 10218 NW 82nd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '355-01', '10218 NW 82nd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Marie', 'Palen', 'msapper17@gmail.com', '321-948-5615', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 355-02: Lopez (Owner)
  -- 10216 NW 82nd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '355-02', '10216 NW 82nd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'George', 'Lopez', 'jorgeivan15@yahoo.com', '954-600-1346', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 355-03: Rajappan (Renter)
  -- 10214 NW 82nd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '355-03', '10214 NW 82nd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Velmurugan', 'Rajappan', 'morganprathi@yahoo.com', '786-261-8810', 'tenant', 'resident', true);

  -- ================================================================
  -- Unit 355-04: Harbin (Owner)
  -- 10212 NW 82nd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '355-04', '10212 NW 82nd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Zunilda', 'Harbin', 'zzeeulater@aol.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 355-05: Clavert (Owner)
  -- 8105 NW 102nd Terrace, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '355-05', '8105 NW 102nd Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jason', 'Clavert', 'jason.calbros@att.net', NULL, 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Staci', 'Calvert', 'staci8105@gmail.com', '954-651-1570', 'member', 'resident', true);

  -- ================================================================
  -- Unit 355-06: Rodriguez (Owner)
  -- 8103 NW 102nd Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '355-06', '8103 NW 102nd Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jerrilyn', 'Rodriguez', 'jerrilynm2212@gmail.com', '954-651-4914', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 355-07: Fernandez (Renter)
  -- 10213 NW 81st St, Tamarac, FL 33321
  -- Payment: annual
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '355-07', '10213 NW 81st St, Tamarac, FL 33321', 'active', 'annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Henry', 'Fernandez', 'crzyfth@aol.com', '954-325-2963', 'tenant', 'resident', true);

  -- ================================================================
  -- Unit 355-08: Tansy (Owner)
  -- 10215 NW 81st Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '355-08', '10215 NW 81st Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Laurie', 'Tansy', 'lauriev0912@gmail.com', '954-445-3956', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 355-09: Guzman (Owner)
  -- 10217 NW 81st Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '355-09', '10217 NW 81st Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Karina', 'Rodriguez', 'krg99994@gmail.com', '954-376-0408', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 355-10: Martell (Owner)
  -- 10219 NW 81st Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '355-10', '10219 NW 81st Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Cindie', 'Sciortino-Martell', 'cindiemartell@gmail.com', '954-608-1787', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 356-01: Johnson (Owner)
  -- 10218 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '356-01', '10218 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Rashidia', 'Sanderson', 'rashysandy@gmail.com', '754-235-6970', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 356-02: Fouquet (Owner)
  -- 10216 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '356-02', '10216 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'June', 'Fouquet', 'bugfouqua@gmail.com', '954-232-2823', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 356-18: Residential Borrower (Renter)
  -- 10103 NW 82nd Street, Tamarac, FL 33321
  -- Mailing: POB 4090, Scottsdale, AZ 85261
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '356-18', '10103 NW 82nd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Residential', 'Borrower', 'residentialborrowerww6@yahoo.com', NULL, 'tenant', 'resident', true);

  -- ================================================================
  -- Unit 356-19: Gordon (Owner)
  -- 10105 NW 82nd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '356-19', '10105 NW 82nd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Daryl', 'Gordon', 'lyssettgordon@bellsouth.net', '954-309-9412', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 356-20: Roman (Owner)
  -- 10107 NW 82nd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '356-20', '10107 NW 82nd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Germania', 'Roman', 'germaniaroman@bellsouth.net', '954-600-6864', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 356-21: Herrera (Owner)
  -- 10201 NW 82nd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '356-21', '10201 NW 82nd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Christina', 'Herrera', 'plucky0031@yahoo.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 356-22: Boloix (Owner)
  -- 10203 NW 82nd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '356-22', '10203 NW 82nd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'William', 'Boloix', 'gonzalez.will5@gmail.com', '786-569-8482', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 356-23: Shashaty (Owner)
  -- 10205 NW 82nd Street, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '356-23', '10205 NW 82nd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Tiras', 'Shashaty', 'tirasshashaty@gmail.com', '954-614-0738', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Javan', 'Shashaty', 'javandlis@gmail.com', '954-560-3988', 'member', 'resident', true);

  -- ================================================================
  -- Unit 356-24: Bickler (Renter)
  -- 10207 NW 82nd Street, Tamarac, FL 33321
  -- Mailing: 5227 NW 96th Drive, Coral Springs, FL 33076
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '356-24', '10207 NW 82nd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Beth', 'Bickler', 'bethb17@bellsouth.net', '561-901-1263', 'tenant', 'resident', true);

  -- ================================================================
  -- Unit 356-25: Nunes (Owner)
  -- 10209 NW 82nd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '356-25', '10209 NW 82nd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Nicole', 'Nunes', 'nickel132@hotmail.com', '754-281-6706', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 356-26: Monzon (Owner)
  -- 10211 NW 82nd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '356-26', '10211 NW 82nd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Guillermo', 'Monzon', 'gemonzon@yahoo.com', '954-336-5806', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 356-27: Beiss (Owner)
  -- 10213 NW 82nd Street, Tamarac,, FL 33321
  -- Payment: semi_annual
  -- Mailing: Made email
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '356-27', '10213 NW 82nd Street, Tamarac,, FL 33321', 'active', 'semi_annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Ludwig', 'Beiss', 'beissludwig26@gmail.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 356-28: Gomez (Owner)
  -- 10215 NW 82nd Street, Tamarac, FL 33321
  -- Payment: semi_annual
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '356-28', '10215 NW 82nd Street, Tamarac, FL 33321', 'active', 'semi_annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jorge', 'Gomez', 'dollyjor@yahoo.com', '954-540-4346', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 356-29: Smith (Owner)
  -- 10217 NW 82nd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '356-29', '10217 NW 82nd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Andrew', 'Smith', 'andrew_smith8291@yahoo.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 356-30: Meo (Owner)
  -- 10219 NW 82nd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '356-30', '10219 NW 82nd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Cassandra Michele', 'Meo', 'cassisolari@gmail.com', '954-997-0532', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-01: Montoya (Owner)
  -- 10219 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-01', '10219 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Paula', 'Montoya', 'paulamontoya79@gmail.com', '954-600-2542', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-02: Welch (Owner)
  -- 10217 NW 83rd Street, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-02', '10217 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Rebeca', 'Welch', 'vianwelch@yahoo.com', '954-319-8362', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Cherin', 'Welch', 'cherinwelch@yahoo.com', '954-658-0360', 'member', 'resident', true);

  -- ================================================================
  -- Unit 357-03B: Montero (Owner)
  -- 10215 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-03B', '10215 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Roxana', 'Montero', 'rmontero3080@yahoo.com', '786-344-8736', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-03A: Orozco (Owner)
  -- 10214 NW 83rd Street, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-03A', '10214 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Juan Pablo', 'Orozco', 'jmoc2002@gmail.com', '954-274-9236', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jane', 'Roman-Martinez', 'mrsjanemua@gmail.com', '954-849-2921', 'member', 'resident', true);

  -- ================================================================
  -- Unit 357-04B: McManus (Owner)
  -- 10213 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-04B', '10213 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Barbara', 'McManus', 'shelbygram@att.net', '954-778-5683', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-04A: Munoz (Owner)
  -- 10212 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-04A', '10212 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jaime', 'Munoz', 'jamsa61@gmail.com', '954-383-0545', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-05A: Lerner (Owner)
  -- 10210 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-05A', '10210 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Tammy', 'Minor', 'tlerner188@gmail.com', '516-967-5840', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-05B: Tobon (Owner)
  -- 10211 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-05B', '10211 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Yolanda', 'Tobon', 'ytobon15@gmail.com', '754-276-4317', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-06B: Brunson (Owner)
  -- 10209 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-06B', '10209 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Janice', 'Brunson', 'jmbrunson1@hotmail.com', '954-465-5489', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-06A: Bothwell (Owner)
  -- 10208 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-06A', '10208 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Maria', 'Bothwell', 'mbothwell@ymail.com', '561-809-3205', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-07B: Bhondoe (Owner)
  -- 10207 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-07B', '10207 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Laxminarain', 'Nooniwala', 'laxmi123usa@gmail.com', '954-798-7571', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-07A: Sanchez (Owner)
  -- 10206 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-07A', '10206 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Marcela', 'Sanchez', 'geremiasjb@yahoo.com', '954-937-3164', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-08A: Darqui (Owner)
  -- 10204 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-08A', '10204 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Alex', 'Darqui', 'darqui48@gmail.com', '954-232-6220', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-08B: Alvarez (Owner)
  -- 10205 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-08B', '10205 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Juan', 'Alvarez', 'juanmario40@yahoo.com', '786-521-7021', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-09B: Wallace (Owner)
  -- 10203 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-09B', '10203 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Akilah', 'Wallace', 'akilahw423@gmail.com', '954-822-9542', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-09A: Htay (Owner)
  -- 10202 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-09A', '10202 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Myo', 'Htet', 'myohtet1991@gmail.com', '954-778-7235', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-10A: Tejada (Owner)
  -- 10200 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-10A', '10200 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Margarita', 'Tejada', 'tejadamargarita@yahoo.com', '954-328-6533', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-10B: Clarke (Owner)
  -- 10201 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-10B', '10201 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Theodore', 'Clarke', 'ted_roc@hotmail.com', '954-867-4055', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-11B: Castillo (Owner)
  -- 10109 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-11B', '10109 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Michelle', 'Castillo', 'mcas7608@gmail.com', '954-274-2142', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-11A: Delmour (Owner)
  -- 10108 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-11A', '10108 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Angena', 'Agenor', 'angenaagenor@gmail.com', '954-297-3265', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-12A: Estoque (Owner)
  -- 10106 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-12A', '10106 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Eugene', 'Estoque', 'bjaestoque@gmail.com', '954-234-3919', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-12B: Chiarella (Owner)
  -- 10107 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-12B', '10107 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Alexandra', 'Chiarella', 'dariadani@bellsouth.net', '954-642-6561', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-13A: Korenic (Owner)
  -- 10104 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-13A', '10104 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Allyson', 'Korenic', 'allyoop28@gmail.com', '954-551-9174', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-13B: Zullino (Owner)
  -- 10105 NW 83rd Street, Tamarac, FL 33321
  -- Members: 0
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-13B', '10105 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;


  -- ================================================================
  -- Unit 357-14A: Chau (Owner)
  -- 10102 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-14A', '10102 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Ky VI', 'Chau', 'kychau1961@gmail.com', '954-599-4381', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-14B: Rodriguez (Owner)
  -- 10103 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-14B', '10103 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Juan', 'Rodriguez', 'juanmiguelr32@gmail.com', '786-546-6869', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-15A: Benenson (Owner)
  -- 10100 NW 83rd Street, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-15A', '10100 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jay', 'Benenson', 'bigump18@gmail.com', '954-778-8271', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'SUE', 'KESSEN', 'sue.kessen@gmail.com', '908-962-7000', 'member', 'resident', true);

  -- ================================================================
  -- Unit 357-15B: Shev (Owner)
  -- 10101 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-15B', '10101 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Melissa', 'Shev', 'shevyservicesllc@gmail.com', '954-803-9091', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-16A: Gomez (Owner)
  -- 8203 NW 101st Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-16A', '8203 NW 101st Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Juan', 'Gomez', 'juanpgomez@bellsouth.net', '954-296-5312', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-16B: Gehret (Owner)
  -- 10015 NW 83rd Street, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-16B', '10015 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Patrick', 'Gehret', 'pjgehret@bellsouth.net', '904-553-4425', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Natalie & Patrick', 'Gehret', 'gehretww6@yahoo.com', NULL, 'member', 'resident', true);

  -- ================================================================
  -- Unit 357-17A: Smith (Owner)
  -- 8201 NW 101st Avenue, Tamarac, FL 33321
  -- Payment: annual
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-17A', '8201 NW 101st Avenue, Tamarac, FL 33321', 'active', 'annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Alissa', 'Smith', 'alissaellensmith@gmail.com', '954-540-0586', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-17B: Goodwin (Owner)
  -- 10013 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-17B', '10013 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Eve', 'Goodwin', 'evegoodwin32@gmail.com', '954-732-5357', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-18: Overfelt (Owner)
  -- 10011 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-18', '10011 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'WILLIAM', 'OVERFELT, JR', 'wcojr1@gmail.com', '954-531-4286', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 357-19: Ciervo (Owner)
  -- 10009 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '357-19', '10009 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Debra', 'Ciervo', 'debrc62@gmail.com', '954-864-3952', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 358-01: Baar (Owner)
  -- 10301 NW 80th Drive, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-01', '10301 NW 80th Drive, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Margaret', 'Baar', 'bar.gor5446@gmail.com', '954-647-3492', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 358-02: Friedenstab Jr (Owner)
  -- 10303 NW 80th Drive, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-02', '10303 NW 80th Drive, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Darryl', 'Friedenstab', 'darryl.friedenstab@yahoo.com', '440-822-6206', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Rachel', 'Parker', 'parker282015@gmail.com', '954-608-0776', 'member', 'resident', true);

  -- ================================================================
  -- Unit 358-03: Daisy (Owner)
  -- 8012 NW 104th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-03', '8012 NW 104th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Mayzara', 'Garcia', 'mayzara.garcia@gmail.com', '786-260-8498', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 358-04: Macrew-Marin (Owner)
  -- 8100 NW 104th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-04', '8100 NW 104th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Patricia', 'Macrew-Martin', 'macrel2000@yahoo.com', '754-281-1303', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 358-05: Novoa (Owner)
  -- 8102 NW 104th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-05', '8102 NW 104th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Javier', 'Novoa', 'rosangelandjavier@gmail.com', '786-380-0849', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 358-06: John (Owner)
  -- 8104 NW 104th Avenue, Tamarac, FL 33321
  -- Mailing: 872 Troy Street, Elmont, NY 11003
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-06', '8104 NW 104th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'David', 'John', 'jandbmanagement1@gmail.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 358-07: Vargas (Owner)
  -- 8106 NW 104th Avenue, Tamarac, FL 33321
  -- Payment: annual
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-07', '8106 NW 104th Avenue, Tamarac, FL 33321', 'active', 'annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Sergio', 'Vargas', 't23vargas@gmail.com', '818-935-9447', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jocelyn', 'Vargas', 'jocelyn.westwood24@gmail.com', '818-430-5782', 'member', 'resident', true);

  -- ================================================================
  -- Unit 358-08: Sacks (Owner)
  -- 8200 NW 104th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-08', '8200 NW 104th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Rhona', 'Sacks', 'rhonasacks@comcast.net', '954-419-7280', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 358-09: Arillo (Owner)
  -- 8202 NW 104th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-09', '8202 NW 104th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jeffrey', 'Arillo', 'jeffreyarillo11@gmail.com', '954-296-0144', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 358-10: Bouthillette (Owner)
  -- 8204 NW 104th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-10', '8204 NW 104th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Lorna', 'Bouthillette', 'marcbouthillette@hotmail.com', '954-722-5528', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 358-11: Penso (Owner)
  -- 8206 NW 104th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-11', '8206 NW 104th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Duo&David', 'Penso', 'dpenso1@outlook.com', '347-351-8575', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 358-12: Nielsen (Owner)
  -- 8207 NW 103rd Ave, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-12', '8207 NW 103rd Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Michael', 'Nielsen', 'phdmike1@gmail.com', '954-394-6483', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 358-13: Gebert (Owner)
  -- 8205 NW 103rd Ave, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-13', '8205 NW 103rd Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Scott', 'Gebert', 'scottpgebert@gmail.com', '954-726-1341', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 358-14: Gurgel (Owner)
  -- 8203 NW 103rd Ave, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-14', '8203 NW 103rd Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Ana', 'DE ANDRADE', 'aandrade0514@gmail.com', '925-586-2520', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 358-15: Lainez (Owner)
  -- 8201 NW 103rd Ave, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-15', '8201 NW 103rd Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'LUIS', 'LAINEZ', 'lainezlyn03@hotmail.com', '954-391-2458', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 358-16: Harrity (Owner)
  -- 8107 NW 103rd Ave, Tamarac, FL 33321
  -- Members: 0
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-16', '8107 NW 103rd Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;


  -- ================================================================
  -- Unit 358-17: Michael (Owner)
  -- 8105 NW 103rd Ave, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-17', '8105 NW 103rd Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Constance', 'Michael', 'conniemichael1013@gmail.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 358-18: Coyle (Owner)
  -- 8103 NW 103rd Ave, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-18', '8103 NW 103rd Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'William', 'Coyle', 'williamfcoyle@gmail.com', '908-601-7710', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 358-19: Rosado (Owner)
  -- 8101 NW 103rd Ave, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-19', '8101 NW 103rd Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jonathan', 'Rosado', 'rosadoguitar@gmail.com', '305-439-9547', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 358-20: Head (Owner)
  -- 8013 NW 103rd Ave, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '358-20', '8013 NW 103rd Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'John', 'Head', 'jhead@hillyork.com', '954-547-1602', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-01: Carlos (Owner)
  -- 10301 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-01', '10301 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Juan', 'Carlos', 'jmnunez82@hotmail.com', '305-968-7212', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-02: Parker (Owner)
  -- 10303 NW 80th Court, Tamarac, FL 33321
  -- Members: 0
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-02', '10303 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;


  -- ================================================================
  -- Unit 359-03: Valentine (Owner)
  -- 10401 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-03', '10401 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Yen', 'Valentine', 'yen.valentine@yahoo.com', '954-918-2526', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-04: Taylor (Owner)
  -- 10403 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-04', '10403 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Leonard', 'Taylor', 'leonardtaylorww6@yahoo.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-05: Barber (Owner)
  -- 8006 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-05', '8006 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Renee', 'Barber', 'rpkb99@aol.com', '954-358-7143', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-06: Gonzalez (Owner)
  -- 8008 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-06', '8008 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Walter', 'Gonzalez', 'walter1125@bellsouth.net', '954-865-0012', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-07: Bosco (Owner)
  -- 8010 NW 105th Avenue, Tamarac, FL 33321
  -- Payment: annual
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-07', '8010 NW 105th Avenue, Tamarac, FL 33321', 'active', 'annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Christine', 'Bosco', 'mcmsc741@att.net', '954-801-9778', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'MJ', 'Bosco', 'mjbosco@butters.com', '954-729-1154', 'member', 'resident', true);

  -- ================================================================
  -- Unit 359-08: Selchan (Owner)
  -- 8012 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-08', '8012 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Cory', 'Selchan', 'cselchan4186@bellsouth.net', '954-778-6605', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-09: Parajon-Pena (Renter)
  -- 8100 NW 105th Avenue, Tamarac, FL 33321
  -- Mailing: 1142 SE 11th Street, North Bend, WA 93045
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-09', '8100 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Parajon-Pena', 'Soris', 'parajonww6@gmail.com', NULL, 'tenant', 'resident', true);

  -- ================================================================
  -- Unit 359-10: Garcia-Hernandez (Owner)
  -- 8102 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-10', '8102 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jessica', 'Garcia', 'jessica.jette@yahoo.com', '954-495-6085', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-11: Laverde (Owner)
  -- 8104 NW 105th Avenue, Tamarac, FL 33321
  -- Payment: annual
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-11', '8104 NW 105th Avenue, Tamarac, FL 33321', 'active', 'annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Adriana', 'Laverde', 'adriida@yahoo.com', '954-667-4587', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-12: Rocheford (Owner)
  -- 8106 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-12', '8106 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Ariel', 'Rocheford', 'aerocheford1@gmail.com', '954-549-8808', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-13: Penevolpe (Owner)
  -- 8200 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-13', '8200 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Anthony', 'Penevolpe', 'ant.pene@gmail.com', '954-818-4364', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-14: Polo (Owner)
  -- 8202 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-14', '8202 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Katherine', 'Bell', 'kbell10451@gmail.com', '786-230-0712', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-15: Valle (Owner)
  -- 8204 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-15', '8204 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Natalie', 'Rivero', 'natalierivero2527@gmail.com', '305-342-3004', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-16: Simon (Owner)
  -- 8206 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-16', '8206 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Loudrige', 'Simon', 'loudrige@yahoo.com', '954-496-4060', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-17: Bianco (Owner)
  -- 8207 NW 104th Avenue, Tamarac, FL 33321
  -- Payment: semi_annual
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-17', '8207 NW 104th Avenue, Tamarac, FL 33321', 'active', 'semi_annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Marilyn', 'Bianco', 'mbian9@aol.com', '954-612-2973', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-18: Braica (Owner)
  -- 8205 NW 104th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-18', '8205 NW 104th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Daniel', 'Braica', 'db74.2007@gmail.com', '561-252-1961', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-19: Molino (Owner)
  -- 8203 NW 104th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-19', '8203 NW 104th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Kaitlin', 'Molino', 'kaitlin_bondi@yahoo.com', '754-368-9820', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-20: Noriega (Owner)
  -- 8201 NW 104th Avenue, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-20', '8201 NW 104th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Christian', 'Noriega', 'coyland1@icloud.com', '954-547-3648', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Gale', 'Noriega', 'coyland@hotmail.com', '954-547-3767', 'member', 'resident', true);

  -- ================================================================
  -- Unit 359-21: Harper (Owner)
  -- 8107 NW 104th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-21', '8107 NW 104th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'ROBIN E & JOHN W', 'HARPER', 'robinharper129@hotmail.com', '954-629-7454', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-22: Perrone (Owner)
  -- 8105 NW 104th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-22', '8105 NW 104th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Karen', 'Perrone', 'quinju@aol.com', '954-592-6889', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-23: Loftman (Owner)
  -- 8103 NW 104th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-23', '8103 NW 104th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Marika', 'Holness', 'marika_h26@yahoo.com', '954-648-6150', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-24: Sarduy (Owner)
  -- 8101 NW 104th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-24', '8101 NW 104th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Ivan & Mercedes', 'Sarduy', 'ivanmercy@yahoo.com', '954-801-6128', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-25: Osvaldo (Renter)
  -- 8013 NW 104th Avenue, Tamarac, FL 33321
  -- Mailing: 305 NW 118th Ave, Coral Springs, FL 33071
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-25', '8013 NW 104th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Bermundez', 'Osvaldo', 'osvadiana@yahoo.com', '954-591-9379', 'tenant', 'resident', true);

  -- ================================================================
  -- Unit 359-26: Lavandier (Owner)
  -- 8011 NW 104th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-26', '8011 NW 104th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Nilda', 'Lavandier', 'chealavandier@yahoo.com', '954-304-4314', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-28: Blank (Owner)
  -- 10304 NW 80th Drive, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-28', '10304 NW 80th Drive, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Ralph', 'Blank', 'blankrc@aol.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 359-29: Hurst (Owner)
  -- 10302 NW 80th Drive, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '359-29', '10302 NW 80th Drive, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Mark', 'Hurst', 'goats99@comcast.net', '954-649-4599', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 360-01: Foster (Owner)
  -- 10506 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '360-01', '10506 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Autumn', 'Foster Hernandez', 'manmzfoster@gmail.com', '941-730-5956', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 360-02: Fisher (Owner)
  -- 10504 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '360-02', '10504 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jonathan', 'Fisher', 'jonfisher7@yahoo.com', '754-317-8026', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 360-03: James (Owner)
  -- 10502 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '360-03', '10502 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Tabitha', 'James', 'tabithasjames88@gmail.com', '305-339-0225', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 360-04: Lamontagne (Owner)
  -- 10500 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '360-04', '10500 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Arthur', 'Lamontagne', 'art06246310500@gmail.com', '954-775-4798', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 360-05: Eltine (Owner)
  -- 10404 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '360-05', '10404 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Wildlly', 'Eltine', 'widlyeltine@gmail.com', '954-533-6639', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 360-06: Mirander (Owner)
  -- 10402 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '360-06', '10402 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'valerie', 'Mirander', 'vmirander@hotmail.com', '954-560-7747', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 360-07: Doan (Owner)
  -- 10400 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '360-07', '10400 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Shauna', 'Doan', 'sdoan89@gmail.com', '954-268-3740', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 360-08: Dilaconi (Owner)
  -- 10302 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '360-08', '10302 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Joseph', 'DiIaconi', 'jdiiaconi@gmail.com', '561-305-4413', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 360-09: Esposito (Owner)
  -- 10300 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '360-09', '10300 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jaziel', 'Exposito', 'jazielexposito@gmail.com', '786-663-8344', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 361-01: Derenoncourt (Owner)
  -- 8008 NW 106th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-01', '8008 NW 106th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Rony', 'Derenoncourt', 'jolie258@hotmail.com', '954-857-7720', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 361-02: Martinez (Owner)
  -- 8010 NW 106th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-02', '8010 NW 106th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'ERLY', 'GONZALEZ', 'erlygonzalez11@gmail.com', '813-344-6347', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 361-03: Caffaratti (Owner)
  -- 8012 NW 106th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-03', '8012 NW 106th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Marina', 'Caffaratti', 'copefriends@hotmail.com', '786-390-4190', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 361-04: Ortiz (Owner)
  -- 8100 NW 106th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-04', '8100 NW 106th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Carmelina', 'Ortiz', 'riodulce7@gmail.com', '954-348-1377', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 361-05: Hul Su (Owner)
  -- 8102 NW 106th Avenue, Tamarac, FL 33321
  -- Payment: annual
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-05', '8102 NW 106th Avenue, Tamarac, FL 33321', 'active', 'annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Su', 'Chao', 'chaoq8990@gmail.com', '813-570-1576', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 361-06: Singh (Owner)
  -- 8104 NW 106th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-06', '8104 NW 106th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Sherry Nabbie', 'Singh', 'sherrynabbie@gmail.com', '954-224-8652', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 361-07: Richardson (Owner)
  -- 8106 NW 106th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-07', '8106 NW 106th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Thamarra', 'Richardson', 'tst.louis@yahoo.com', '904-521-3253', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 361-08: Ball (Owner)
  -- 8200 NW 106th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-08', '8200 NW 106th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'David', 'Ball', 'tiamb@comcast.net', '954-600-8591', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 361-09: Sub LLC (Renter)
  -- 8202 NW 106th Avenue, Tamarac, FL 33321
  -- Mailing: 5020 Lyndon B Johnson Hwy. 600, Dallas, TX 75240
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-09', '8202 NW 106th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'SRP Sub', 'LLC', 'inquiries@invitationhomes.com', '800-339-7368', 'tenant', 'resident', true);

  -- ================================================================
  -- Unit 361-10: Mendivil (Owner)
  -- 8204 NW 106th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-10', '8204 NW 106th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Raul', 'Mendivil', 'raulmendivil1981@gmail.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 361-11: Chavez (Owner)
  -- 8206 NW 106th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-11', '8206 NW 106th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Luis', 'Chavez', 'luischavez75@gmail.com', '305-434-6648', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 361-12: Metayer (Owner)
  -- 8207 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-12', '8207 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jacqueline', 'Metayer', 'jackiemetayer@gmail.com', '954-650-0141', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 361-13: Smith (Owner)
  -- 8205 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-13', '8205 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Ashley', 'Smith', 'ashleyrbrookins@gmail.com', '305-332-3203', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Kenneth', 'Brookins', 'buddah7544@aol.com', '305-332-3203', 'member', 'resident', true);

  -- ================================================================
  -- Unit 361-14: Gibson (Owner)
  -- 8203 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-14', '8203 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Glenn', 'Gibson', 'gibsonsfort@gmail.com', '954-657-3780', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 361-15: Cabrera (Owner)
  -- 8201 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-15', '8201 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Kenia Marley', 'Cabrera', 'neneperez0824@hotmail.com', '954-225-6479', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 361-16: Govea (Owner)
  -- 8107 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-16', '8107 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jesus', 'Govea', 'jesusg.garcia@hotmail.com', '305-742-5492', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 361-17: Gill (Owner)
  -- 8105 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 0
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-17', '8105 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;


  -- ================================================================
  -- Unit 361-18: Alberto (Owner)
  -- 8103 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-18', '8103 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Francisco', 'Azuri', 'fazuri.azuri1@gmail.com', '786-266-1713', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 361-19: Sands (Owner)
  -- 8101 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-19', '8101 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jerilynn', 'Sands', 'jhsands66@gmail.com', '786-910-0629', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 361-20: Chavez (Owner)
  -- 8013 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-20', '8013 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Christian', 'Chaves', 'chaves_christian11@yahoo.com', '786-768-4728', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 361-21: Lugo (Owner)
  -- 8011 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-21', '8011 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Warren', 'Lugo', 'misifus55@outlook.com', '944-531-8089', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 361-22: Lopez (Owner)
  -- 8009 NW 105th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '361-22', '8009 NW 105th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Alan', 'Lopez', 'alanrlopez@outlook.com', '786-277-2526', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 362-01: Bloom (Owner)
  -- 10301 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '362-01', '10301 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Augusta', 'Burgos', 'augustabrgos@gmail.com', '754-246-5085', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 362-02: Ella (Owner)
  -- 10303 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '362-02', '10303 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Joseph and April', 'D''Elia', 'thenewdelias@gmail.com', '305-764-1067', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 362-03: Mulet (Owner)
  -- 10305 NW 83rd Street, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '362-03', '10305 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Laura', 'Mulet', 'lmulet14@gmail.com', '954-203-8125', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Yosbel', 'Mulet', 'yosbei_11@yahoo.com', NULL, 'member', 'resident', true);

  -- ================================================================
  -- Unit 362-04: Hirsch (Owner)
  -- 10307 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '362-04', '10307 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Michelle', 'Vaghari', 'mmvaghari@gmail.com', '512-423-7119', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 362-05: Frith (Owner)
  -- 10401 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '362-05', '10401 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Mark', 'Frith', 'mdotbluekap@gmail.com', '718-812-6496', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 362-06: Cortez (Owner)
  -- 10403 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '362-06', '10403 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jesus Alberto', 'Cortes', 'cfresnedas@gmail.com', '754-366-0178', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 362-07: Lind (Owner)
  -- 10405 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '362-07', '10405 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Tammy', 'Lind', 'tammylind66@gmail.com', '954-867-6108', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 362-08: Phillips (Owner)
  -- 10407 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '362-08', '10407 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Charlie', 'Phillips', 'jamie.michaels11@gmail.com', '954-829-1700', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 362-09: Petit (Owner)
  -- 10501 NW 83rd Street, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '362-09', '10501 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Serge', 'Petit', 'rolinappolon@gmail.com', '954-865-8630', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Cerena', 'Petit', 'cerenapetit13@gmail.com', '954-440-9185', 'member', 'resident', true);

  -- ================================================================
  -- Unit 362-10: Marin (Owner)
  -- 10503 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '362-10', '10503 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Katherine', 'Marin', 'viterikat@hotmail.com', '754-252-4203', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 362-11: Ruiz (Owner)
  -- 10505 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '362-11', '10505 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jose L.', 'Ruiz', 'joseruizjr@gmail.com', '954-226-7904', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 362-12: Dacres (Owner)
  -- 10507 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '362-12', '10507 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Leonie', 'Dacres', 'leoniedacres2264@comcast.net', '954-242-1949', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 362-13: Morales (Owner)
  -- 10601 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '362-13', '10601 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Karla', 'Morales', 'karlamorales77@yahoo.com', '786-616-0568', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 362-14: Rodriguez (Owner)
  -- 10603 NW 83rd Street, Tamarac, FL 33321
  -- Mailing: 3404 Telegraph Station Hoop, Dymfries, VA 22026
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '362-14', '10603 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Ruth', 'Rodriguez', 'rrodz0077@gmail.com', '954-610-9308', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 362-15: Coronel (Owner)
  -- 10605 NW 83rd Street, Tamarac, FL 33321
  -- Members: 0
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '362-15', '10605 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;


  -- ================================================================
  -- Unit 362-16: Chase (Owner)
  -- 10607 NW 83rd Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '362-16', '10607 NW 83rd Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Reese', 'Chase', 'reesechase99@gmail.com', '954-494-6845', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 363-01: Dickson (Owner)
  -- 8102 NW 107th Avenue, Tamarac, FL 33321
  -- Payment: annual
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '363-01', '8102 NW 107th Avenue, Tamarac, FL 33321', 'active', 'annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Gary', 'Dickson', 'gary@oxfordtax.net', '954-895-5798', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 363-02: Khan (Owner)
  -- 8104 NW 107th Avenue, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '363-02', '8104 NW 107th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Rahim', 'Khan', 'redsonja726@gmail.com', '954-529-8931', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Sonja', 'Khan', 'sonja.c.khan@gmail.com', NULL, 'member', 'resident', true);

  -- ================================================================
  -- Unit 363-03: Arria (Owner)
  -- 8200 NW 107th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '363-03', '8200 NW 107th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Francy', 'Arria', 'francyarria@gmail.com', '954-701-3348', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 363-04: Soberon (Owner)
  -- 8202 NW 107th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '363-04', '8202 NW 107th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Concepcion', 'Soberon', 'ivettesoberon@gmail.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 363-05: Kenegen (Owner)
  -- 8204 NW 107th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '363-05', '8204 NW 107th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Judith', 'Kenagen', 'jkenagen@gmail.com', '954-294-8183', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 363-06: Vela (Owner)
  -- 8206 NW 107th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '363-06', '8206 NW 107th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Genaro', 'Vela', 'suycard@hotmail.com', '954-993-8918', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 363-07: Dollar-Johns (Owner)
  -- 8207 NW 106th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '363-07', '8207 NW 106th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Carol', 'Dollar-Johns', 'davcarnic@comcast.net', '954-850-1591', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 363-08: Diaz (Owner)
  -- 8205 NW 106th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '363-08', '8205 NW 106th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Rachel', 'Diaz', 'rachelc.129@gmail.com', '504-701-8839', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 363-09: Valles (Owner)
  -- 8203 NW 106th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '363-09', '8203 NW 106th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Phillip', 'Valles', 'retmosny.bx@gmail.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 363-10: Wilson (Owner)
  -- 8201 NW 106th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '363-10', '8201 NW 106th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Angela', 'Wilson', 'wilsonangela94@gmail.com', '964-773-4411', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 363-11: Gaiardo (Owner)
  -- 8105 NW 106th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '363-11', '8105 NW 106th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Pablo -susana', 'gaiardo', 'susi5262@hotmail.com', '305-962-3561', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 363-12: Roberts (Owner)
  -- 8103 NW 106th Avenue, Tamarac, FL 33321
  -- Payment: semi_annual
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '363-12', '8103 NW 106th Avenue, Tamarac, FL 33321', 'active', 'semi_annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Paula', 'Roberts', 'mishrob2@bellsouth.net', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 364-01: Perez (Owner)
  -- 8008 NW 107th Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '364-01', '8008 NW 107th Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Estanislao', 'Perez Jr', 'eperez928@yahoo.com', '954-937-7847', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 364-02: Zalaf (Owner)
  -- 8010 NW 107th Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '364-02', '8010 NW 107th Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Javier Odriozola', 'Zalof', 'zalafjavier@gmail.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 364-03: Nava (Owner)
  -- 8012 NW 107th Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '364-03', '8012 NW 107th Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Patricia', 'Nava', 'patyvic09@yahoo.com', '954-260-2085', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 364-04: Hernandez (Owner)
  -- 10700 NW 81st Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '364-04', '10700 NW 81st Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Ramses', 'Hernandez', 'ramsesponce1@yahoo.es', '786-757-3724', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 364-05: Dudich (Owner)
  -- 10606 NW 81st Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '364-05', '10606 NW 81st Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Allyson', 'Dudich', 'allyson.dudich@gmail.com', '754-234-5154', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 364-06: Melo (Owner)
  -- 10604 NW 81st Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '364-06', '10604 NW 81st Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Carlos', 'Melo', 'carlosmelo10604@gmail.com', '754-422-7427', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 364-07: Sukhwa (Owner)
  -- 10602 NW 81st Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '364-07', '10602 NW 81st Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Davica', 'Sukhwa', 'stefan.sukhwa@gmail.com', '954-802-7629', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 364-08: Mule (Owner)
  -- 10600 NW 81st Street, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '364-08', '10600 NW 81st Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Antanette', 'Mule', 'antanettemule@yahoo.com', '954-734-3282', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'David', 'Mule', 'mule74@msn.com', '954-699-8927', 'member', 'resident', true);

  -- ================================================================
  -- Unit 364-09: Bui (Owner)
  -- 10601 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '364-09', '10601 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Tuan', 'Bui', 'abcbui12345@gmail.com', '954-598-2093', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 364-10: Hiebert (Owner)
  -- 10603 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '364-10', '10603 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Jeffrey', 'Hiebert', 'jeffreyhiebert@gmail.com', '757-619-4622', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 364-11: Dieti (Owner)
  -- 10605 NW 80th Court, Tamarac, FL 33321
  -- Payment: annual
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '364-11', '10605 NW 80th Court, Tamarac, FL 33321', 'active', 'annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Christopher & Erik', 'Dietl-Friedli', 'chris.westwood24@gmail.com', '954-651-7324', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 364-12: Samuels (Renter)
  -- 10701 NW 80th Ct, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '364-12', '10701 NW 80th Ct, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Dornette', 'Samuels', 'dornettesamuelsww6@yahoo.com', NULL, 'tenant', 'resident', true);

  -- ================================================================
  -- Unit 365-01: Alfonso (Owner)
  -- 8000 NW 108th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '365-01', '8000 NW 108th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Tania', 'Alfonso', 'affacorporation@bellsouth.net', '954-790-2845', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 365-02: Adolphus (Owner)
  -- 8002 NW 108th Avenue, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '365-02', '8002 NW 108th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Phyllis', 'Albert', 'pva3232@gmail.com', '954-818-5026', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Dorell', 'Arjun', 'arjunflo2@gmail.com', '954-592-0188', 'member', 'resident', true);

  -- ================================================================
  -- Unit 365-03: Lamour (Owner)
  -- 8004 NW 108th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '365-03', '8004 NW 108th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Genese', 'Lamour', 'sandycassi@icloud.com', '407-577-8396', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 365-04: Davy (Owner)
  -- 8006 NW 108th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '365-04', '8006 NW 108th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Christopher', 'Davy', 'folrig@gmail.com', '850-543-2431', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 365-05: Gnage (Owner)
  -- 8008 NW 108th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '365-05', '8008 NW 108th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Eric', 'Gnage', 'egnage@aol.com', '954-614-6398', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 365-06: Correa (Owner)
  -- 8010 NW 108th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '365-06', '8010 NW 108th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Lady', 'Correa', 'ladycomez@hotmail.com', '954-397-3595', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 365-07: Hussey (Owner)
  -- 8012 NW 108th Avenue, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '365-07', '8012 NW 108th Avenue, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Sandra', 'Hussey', 'sandyhsandya@yahoo.com', '954-257-3561', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 365-08: Noguera (Owner)
  -- 8011 NW 107th Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '365-08', '8011 NW 107th Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Alejandro Chirino', 'Noguera', 'alejandro.j.chirino@gmail.com', '786-503-3831', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 365-09: Barbosa (Owner)
  -- 8009 NW 107th Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '365-09', '8009 NW 107th Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Nora', 'Barbosa', 'cancersti@hotmail.com', '954-643-8255', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 365-10: Calvo (Owner)
  -- 8007 NW 107th Terrace, Tamarac, FL 33321
  -- Members: 2
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '365-10', '8007 NW 107th Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Gary', 'Calvo', 'gcalfaa@gmail.com', '954-324-6079', 'owner', 'resident', true);
  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Charles', 'Calvo', 'gcalvo111@gmail.com', '954-324-6079', 'member', 'resident', true);

  -- ================================================================
  -- Unit 365-11: Giraldo (Owner)
  -- 8005 NW 107th Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '365-11', '8005 NW 107th Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Juliette', 'Vanegas', 'juliettevanegas@gmail.com', '401-601-0540', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 365-12: Apolaya (Owner)
  -- 8003 NW 107th Terrace, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '365-12', '8003 NW 107th Terrace, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Ingrid', 'Sattler', 'sattler68@yahoo.com', '954-934-3037', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 365-13: Navarrete (Owner)
  -- 10704 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '365-13', '10704 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Samantha', 'Navarrete', 'samanthanavarrete2@yahoo.com', '954-865-3337', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 365-14: Cordero (Owner)
  -- 10702 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '365-14', '10702 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Evelyn', 'Cordero', 'cordero32793@gmail.com', '786-879-6318', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 365-15: Gambino (Renter)
  -- 10700 NW 80th Ct, Tamarac, FL 33321
  -- Mailing: 2106 Shinnecock Hills Way, Coral Springs, FL 33071
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '365-15', '10700 NW 80th Ct, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Natale', 'Gambino', 'usmarine100@yahoo.com', '954-647-9118', 'tenant', 'resident', true);

  -- ================================================================
  -- Unit 365-16: Morgenstern (Owner)
  -- 10604 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '365-16', '10604 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Kathleen', 'Morgenstern', 'flamom80@gmail.com', '954-614-3548', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 365-17: Beckfort-Bazil (Owner)
  -- 10602 NW 80th Court, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '365-17', '10602 NW 80th Court, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Halia', 'Beckford-Bazil', 'haliadbb@gmail.com', '646-382-6335', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 365-18: Burn (Owner)
  -- 10600 NW 80th Court, Tamarac, FL 33321
  -- Payment: semi_annual
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '365-18', '10600 NW 80th Court, Tamarac, FL 33321', 'active', 'semi_annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Larraine', 'Burn', 'lburn81484@aol.com', '954-722-4254', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 366-01: Buitron (Owner)
  -- 8001 NW 108th Ave, Tamarac, FL 33321
  -- Members: 0
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '366-01', '8001 NW 108th Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;


  -- ================================================================
  -- Unit 366-02: Witmer (Renter)
  -- 8003 NW 108th Ave, Tamarac, FL 33321
  -- Mailing: 250 NE 20th Street, 521, Boca Raton, FL 33431
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '366-02', '8003 NW 108th Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Diana', 'Witmer', 'dianawitmerww6@yahoo.com', NULL, 'tenant', 'resident', true);

  -- ================================================================
  -- Unit 366-05: Sherbacoff (Owner)
  -- 8009 NW 108th Ave, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '366-05', '8009 NW 108th Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Noah', 'Sherbacoff', 'nsherbacoff@gmail.com', '954-482-2012', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 366-06: Chaves (Owner)
  -- 8011 NW 108th Ave, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '366-06', '8011 NW 108th Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Luis', 'Chaves', 'luischavescostarica@yahoo.com', '954-588-7506', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 366-07: Albert (Owner)
  -- 8013 NW 108th Ave, Tamarac, FL 33321
  -- Members: 0
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '366-07', '8013 NW 108th Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;


  -- ================================================================
  -- Unit 366-08: Anglade (Owner)
  -- 8015 NW 108th Ave, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '366-08', '8015 NW 108th Ave, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Sara', 'Anglade', 'cange.sara@yahoo.com', '954-225-7556', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 366-09: Wong (Owner)
  -- 10715 NW 81st Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '366-09', '10715 NW 81st Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'YUE MEE', 'WONG', 'wong14008@gmail.com', '954-913-7848', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 366-10: Colandrea (Owner)
  -- 10713 NW 81st Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '366-10', '10713 NW 81st Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'MaryPat', 'Colandrea', 'barbini722@comcast.net', '954-806-8761', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 366-11: Scola (Owner)
  -- 10711 NW 81st Street, Tamarac, FL 33321
  -- Payment: semi_annual
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '366-11', '10711 NW 81st Street, Tamarac, FL 33321', 'active', 'semi_annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'NATHALIE', 'SCOLA', 'nathalie.sco15@yahoo.com', '954-829-6480', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 366-12: St. Fort (Owner)
  -- 10709 NW 81st Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '366-12', '10709 NW 81st Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Claudy', 'St.Fort', 'marnery08@gmail.com', '646-246-7393', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 366-13: Caldwell (Owner)
  -- 10707 NW 81st Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '366-13', '10707 NW 81st Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Nannette', 'Caldwell', 'kittync8@yahoo.com', '561-271-3240', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 366-14: Zimmer (Owner)
  -- 10705 NW 81st Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '366-14', '10705 NW 81st Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Joseph', 'Zimmer', 'jzimmer223@gmail.com', '561-756-0242', 'owner', 'resident', true);

  -- ================================================================
  -- Unit 366-15: Duque (Owner)
  -- 10703 NW 81st Street, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '366-15', '10703 NW 81st Street, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Hernando', 'Duque', 'herduque21@gmail.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 366-16: Depasque (Owner)
  -- 10701 NW 81st Street, Tamarac, FL 33321
  -- Payment: annual
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '366-16', '10701 NW 81st Street, Tamarac, FL 33321', 'active', 'annual')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Maria', 'DePasque', 'med9893@gmail.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- Unit 559-30: Godek (Owner)
  -- 10300 NW 80th Drive, Tamarac, FL 33321
  -- Members: 1
  -- ================================================================
  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)
  VALUES (gen_random_uuid(), v_community_id, '559-30', '10300 NW 80th Drive, Tamarac, FL 33321', 'active', 'monthly')
  RETURNING id INTO v_unit_id;

  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)
  VALUES (gen_random_uuid(), v_community_id, v_unit_id, 'Thomas', 'Godek', 'tgodek16@gmail.com', NULL, 'owner', 'resident', true);

  -- ================================================================
  -- IMPORT SUMMARY
  -- ================================================================
  -- Total units created:   329
  -- Total members created: 348
  -- Unmatched members:     0
  -- Units without members: 13
  -- Duplicate lot pairs:   15
  -- ================================================================

  RAISE NOTICE 'Import complete!';
  RAISE NOTICE '  Units created:   329';
  RAISE NOTICE '  Members created: 348';

END $$;

COMMIT;
