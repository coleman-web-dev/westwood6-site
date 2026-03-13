-- ─── COMMUNITY ARCHIVE SUPPORT ──────────────────────────────────────────────
-- Adds soft-delete (archive) capability to communities.
-- Archived communities are preserved for data retrieval but hidden from normal access.

-- Add archived_at column
ALTER TABLE communities ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient filtering of active communities
CREATE INDEX idx_communities_archived ON communities(archived_at) WHERE archived_at IS NULL;

-- Update public read policy to exclude archived communities
DROP POLICY IF EXISTS "Anyone can view community by slug" ON communities;
CREATE POLICY "Anyone can view community by slug"
  ON communities FOR SELECT
  USING (archived_at IS NULL);
