-- Replace hardcoded vendor_category ENUM with a per-community vendor_categories table
-- Allows board members to add, edit, and remove categories.

-- 1. Create vendor_categories table
CREATE TABLE IF NOT EXISTS vendor_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_community_category_slug UNIQUE (community_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_vendor_categories_community ON vendor_categories(community_id);
CREATE INDEX IF NOT EXISTS idx_vendor_categories_community_order ON vendor_categories(community_id, display_order);

-- 2. RLS
ALTER TABLE vendor_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendor_categories_board_all ON vendor_categories
  FOR ALL USING (community_id = get_my_community_id() AND is_board_member());

CREATE POLICY vendor_categories_member_select ON vendor_categories
  FOR SELECT USING (community_id = get_my_community_id());

-- 3. Seed function
CREATE OR REPLACE FUNCTION seed_default_vendor_categories(p_community_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM vendor_categories WHERE community_id = p_community_id LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO vendor_categories (community_id, name, slug, display_order, is_system) VALUES
    (p_community_id, 'Legal/Professional',  'legal-professional',   10, false),
    (p_community_id, 'Advertising',         'advertising',          20, false),
    (p_community_id, 'Cleaning/Maintenance','cleaning-maintenance', 30, false),
    (p_community_id, 'Utilities',           'utilities',            40, false),
    (p_community_id, 'General',             'general',              50, true),
    (p_community_id, 'Other',               'other',                60, true);
END;
$$;

-- 4. Auto-seed on new community creation
CREATE OR REPLACE FUNCTION auto_seed_vendor_categories()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM seed_default_vendor_categories(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_vendor_categories
  AFTER INSERT ON communities
  FOR EACH ROW EXECUTE FUNCTION auto_seed_vendor_categories();

-- 5. Seed all existing communities
DO $$
DECLARE
  comm RECORD;
BEGIN
  FOR comm IN SELECT id FROM communities LOOP
    PERFORM seed_default_vendor_categories(comm.id);
  END LOOP;
END $$;

-- 6. Add category_id column to vendors
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS category_id UUID;

-- 7. For existing communities, create category rows for any legacy ENUM values in use
-- that are not already covered by the defaults
DO $$
DECLARE
  comm RECORD;
  legacy_cats TEXT[] := ARRAY['landscaping', 'plumbing', 'electrical', 'hvac', 'painting', 'roofing', 'security'];
  cat TEXT;
  max_order INTEGER;
BEGIN
  FOR comm IN SELECT id FROM communities LOOP
    SELECT COALESCE(MAX(display_order), 60) INTO max_order
    FROM vendor_categories WHERE community_id = comm.id;

    FOREACH cat IN ARRAY legacy_cats LOOP
      IF EXISTS (
        SELECT 1 FROM vendors
        WHERE community_id = comm.id AND category::TEXT = cat
      ) THEN
        max_order := max_order + 10;
        INSERT INTO vendor_categories (community_id, name, slug, display_order)
        VALUES (comm.id, INITCAP(cat), cat, max_order)
        ON CONFLICT (community_id, slug) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 8. Populate category_id from old ENUM
UPDATE vendors v
SET category_id = vc.id
FROM vendor_categories vc
WHERE vc.community_id = v.community_id
  AND vc.slug = CASE
    WHEN v.category::TEXT = 'cleaning' THEN 'cleaning-maintenance'
    ELSE v.category::TEXT
  END;

-- Fallback: any unmatched vendors get 'general'
UPDATE vendors v
SET category_id = vc.id
FROM vendor_categories vc
WHERE v.category_id IS NULL
  AND vc.community_id = v.community_id
  AND vc.slug = 'general';

-- 9. Add FK and NOT NULL
ALTER TABLE vendors
  ADD CONSTRAINT fk_vendors_category FOREIGN KEY (category_id) REFERENCES vendor_categories(id);

ALTER TABLE vendors ALTER COLUMN category_id SET NOT NULL;

-- 10. Drop old column and ENUM
ALTER TABLE vendors DROP COLUMN category;
DROP TYPE IF EXISTS vendor_category;
