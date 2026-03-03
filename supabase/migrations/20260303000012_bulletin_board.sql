-- ============================================================
-- Migration: Community Bulletin Board
-- Tables: bulletin_posts, bulletin_comments
-- ============================================================

-- =========================
-- TABLES
-- =========================

CREATE TABLE IF NOT EXISTS bulletin_posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  posted_by   UUID NOT NULL REFERENCES members(id),
  is_pinned   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bulletin_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES bulletin_posts(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  posted_by   UUID NOT NULL REFERENCES members(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- INDEXES
-- =========================

CREATE INDEX idx_bulletin_posts_community
  ON bulletin_posts(community_id);

CREATE INDEX idx_bulletin_posts_pinned_created
  ON bulletin_posts(community_id, is_pinned DESC, created_at DESC);

CREATE INDEX idx_bulletin_comments_post
  ON bulletin_comments(post_id, created_at ASC);

CREATE INDEX idx_bulletin_comments_community
  ON bulletin_comments(community_id);

-- =========================
-- TRIGGERS
-- =========================

CREATE OR REPLACE FUNCTION update_bulletin_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_bulletin_posts_updated_at ON bulletin_posts;
CREATE TRIGGER trigger_bulletin_posts_updated_at
  BEFORE UPDATE ON bulletin_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_bulletin_posts_updated_at();

-- =========================
-- RLS
-- =========================

ALTER TABLE bulletin_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletin_comments ENABLE ROW LEVEL SECURITY;

-- Posts: all community members can read
DROP POLICY IF EXISTS "Members can view bulletin posts" ON bulletin_posts;
CREATE POLICY "Members can view bulletin posts"
  ON bulletin_posts FOR SELECT
  USING (community_id = get_my_community_id());

-- Posts: approved community members can insert
-- (application layer enforces the board_only / all_households posting setting)
DROP POLICY IF EXISTS "Members can create bulletin posts" ON bulletin_posts;
CREATE POLICY "Members can create bulletin posts"
  ON bulletin_posts FOR INSERT
  WITH CHECK (community_id = get_my_community_id());

-- Posts: board can update/delete any post
DROP POLICY IF EXISTS "Board can manage bulletin posts" ON bulletin_posts;
CREATE POLICY "Board can manage bulletin posts"
  ON bulletin_posts FOR UPDATE
  USING (community_id = get_my_community_id() AND is_board_member());

DROP POLICY IF EXISTS "Board can delete bulletin posts" ON bulletin_posts;
CREATE POLICY "Board can delete bulletin posts"
  ON bulletin_posts FOR DELETE
  USING (community_id = get_my_community_id() AND is_board_member());

-- Posts: authors can update/delete their own posts
DROP POLICY IF EXISTS "Authors can update own bulletin posts" ON bulletin_posts;
CREATE POLICY "Authors can update own bulletin posts"
  ON bulletin_posts FOR UPDATE
  USING (
    community_id = get_my_community_id()
    AND posted_by = (SELECT id FROM members WHERE user_id = auth.uid() AND community_id = get_my_community_id() LIMIT 1)
  );

DROP POLICY IF EXISTS "Authors can delete own bulletin posts" ON bulletin_posts;
CREATE POLICY "Authors can delete own bulletin posts"
  ON bulletin_posts FOR DELETE
  USING (
    community_id = get_my_community_id()
    AND posted_by = (SELECT id FROM members WHERE user_id = auth.uid() AND community_id = get_my_community_id() LIMIT 1)
  );

-- Comments: all community members can read
DROP POLICY IF EXISTS "Members can view bulletin comments" ON bulletin_comments;
CREATE POLICY "Members can view bulletin comments"
  ON bulletin_comments FOR SELECT
  USING (community_id = get_my_community_id());

-- Comments: approved community members can insert
-- (application layer enforces the board_only / all_households commenting setting)
DROP POLICY IF EXISTS "Members can create bulletin comments" ON bulletin_comments;
CREATE POLICY "Members can create bulletin comments"
  ON bulletin_comments FOR INSERT
  WITH CHECK (community_id = get_my_community_id());

-- Comments: board can update/delete any comment
DROP POLICY IF EXISTS "Board can manage bulletin comments" ON bulletin_comments;
CREATE POLICY "Board can manage bulletin comments"
  ON bulletin_comments FOR UPDATE
  USING (community_id = get_my_community_id() AND is_board_member());

DROP POLICY IF EXISTS "Board can delete bulletin comments" ON bulletin_comments;
CREATE POLICY "Board can delete bulletin comments"
  ON bulletin_comments FOR DELETE
  USING (community_id = get_my_community_id() AND is_board_member());

-- Comments: authors can update/delete their own comments
DROP POLICY IF EXISTS "Authors can update own bulletin comments" ON bulletin_comments;
CREATE POLICY "Authors can update own bulletin comments"
  ON bulletin_comments FOR UPDATE
  USING (
    community_id = get_my_community_id()
    AND posted_by = (SELECT id FROM members WHERE user_id = auth.uid() AND community_id = get_my_community_id() LIMIT 1)
  );

DROP POLICY IF EXISTS "Authors can delete own bulletin comments" ON bulletin_comments;
CREATE POLICY "Authors can delete own bulletin comments"
  ON bulletin_comments FOR DELETE
  USING (
    community_id = get_my_community_id()
    AND posted_by = (SELECT id FROM members WHERE user_id = auth.uid() AND community_id = get_my_community_id() LIMIT 1)
  );
