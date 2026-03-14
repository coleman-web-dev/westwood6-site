-- ─── 3-Tier Document Visibility ──────────────────────────────────────────────
-- Replace binary is_public with a visibility column: private, community, public.
-- Private = board/admin only. Community = all community members. Public = landing page.

-- 1. Add visibility column
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'community';

-- 2. Migrate existing data
UPDATE documents SET visibility = 'public' WHERE is_public = true;
UPDATE documents SET visibility = 'community' WHERE is_public = false;

-- 3. Update RLS policies for visibility-aware access

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can view public documents metadata" ON documents;
DROP POLICY IF EXISTS "Members can view documents" ON documents;

-- Members can see community + public docs; board can see all (including private)
CREATE POLICY "Members can view documents"
  ON documents FOR SELECT
  USING (
    community_id = get_my_community_id()
    AND (visibility IN ('community', 'public') OR is_board_member())
  );

-- Unauthenticated visitors can see public docs only
CREATE POLICY "Anyone can view public documents metadata"
  ON documents FOR SELECT
  USING (visibility = 'public');
