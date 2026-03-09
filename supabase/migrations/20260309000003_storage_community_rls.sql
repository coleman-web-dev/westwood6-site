-- Tighten storage bucket RLS to scope document downloads by community.
-- Previously, any approved member from ANY community could download documents
-- from any other community. Now members can only access documents whose
-- storage path starts with their own community_id.

-- Drop the old overly-permissive SELECT policy
DROP POLICY IF EXISTS "Members can download documents" ON storage.objects;

-- Create a new community-scoped SELECT policy.
-- Storage paths follow the pattern: {community_id}/...
-- We extract the community_id prefix from the object name and verify
-- the authenticated user is an approved member of that community.
CREATE POLICY "Members can download own community documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'hoa-documents'
    AND EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid()
        AND is_approved = true
        AND community_id::text = split_part(name, '/', 1)
    )
  );
