-- Add violation_created notification type
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'violation_created';

-- Allow residents to INSERT violations in their community
DROP POLICY IF EXISTS violations_resident_insert ON violations;
CREATE POLICY violations_resident_insert ON violations
  FOR INSERT WITH CHECK (community_id = get_my_community_id());
