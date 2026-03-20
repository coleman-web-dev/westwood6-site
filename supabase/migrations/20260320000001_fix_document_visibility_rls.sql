-- Fix document visibility RLS policy
-- The multi-community migration (20260312000001) overwrote the visibility-aware
-- policy with one that only checks community membership, making all documents
-- (including private ones) visible to all community members.
-- This restores the visibility check so private documents are board-only.

DROP POLICY IF EXISTS "Members can view documents" ON documents;
CREATE POLICY "Members can view documents"
  ON documents FOR SELECT
  USING (
    is_my_community(community_id)
    AND (visibility IN ('community', 'public') OR is_board_member_of(community_id))
  );
