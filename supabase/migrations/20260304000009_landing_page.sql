-- Landing page support: public flags, board titles, community-assets bucket

-- 1. Add is_public to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- 2. Add board_title to members
ALTER TABLE members ADD COLUMN IF NOT EXISTS board_title TEXT;

-- 3. Add is_public to announcements
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- 4. Create community-assets storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-assets', 'community-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 5. RLS policies for public document access (unauthenticated visitors)
CREATE POLICY "Anyone can view public documents metadata"
  ON documents FOR SELECT
  USING (is_public = true);

-- 6. RLS policies for public announcement access (unauthenticated visitors)
CREATE POLICY "Anyone can view public announcements"
  ON announcements FOR SELECT
  USING (is_public = true);

-- 7. Storage policies for community-assets bucket
CREATE POLICY "Anyone can view community assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-assets');

CREATE POLICY "Board members can upload community assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'community-assets'
    AND is_board_member()
  );

CREATE POLICY "Board members can delete community assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'community-assets'
    AND is_board_member()
  );
