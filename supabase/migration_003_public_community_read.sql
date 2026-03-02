-- Allow unauthenticated users to read community info by slug.
-- Needed for the public community landing page at /{slug}.
-- Community data (name, address, logo, theme config) is not sensitive.
CREATE POLICY "Anyone can view community by slug"
  ON communities FOR SELECT
  USING (true);
