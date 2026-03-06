-- ============================================================
-- ROLE-BASED PERMISSIONS
-- Adds role_template_id to members for fine-grained permission assignment.
-- Role templates themselves are stored in communities.theme JSONB.
-- ============================================================

-- Add role_template_id column to members
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS role_template_id TEXT;

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_members_role_template
  ON members(role_template_id)
  WHERE role_template_id IS NOT NULL;

-- ─── Seed default role_templates into existing communities ───
-- This ensures communities that already exist get the default
-- templates available immediately.

UPDATE communities
SET theme = jsonb_set(
  COALESCE(theme, '{}'),
  '{role_templates}',
  '[
    {
      "id": "full_admin",
      "name": "Full Admin",
      "description": "Full read and write access to all features",
      "is_default": true,
      "permissions": {
        "payments": {"read": true, "write": true},
        "announcements": {"read": true, "write": true},
        "documents": {"read": true, "write": true},
        "amenities": {"read": true, "write": true},
        "events": {"read": true, "write": true},
        "maintenance": {"read": true, "write": true},
        "bulletin_board": {"read": true, "write": true},
        "voting": {"read": true, "write": true},
        "violations": {"read": true, "write": true},
        "arc_requests": {"read": true, "write": true},
        "vendors": {"read": true, "write": true},
        "accounting": {"read": true, "write": true},
        "checks": {"read": true, "write": true},
        "budget": {"read": true, "write": true},
        "reports": {"read": true, "write": true},
        "members": {"read": true, "write": true},
        "settings": {"read": true, "write": true},
        "banking": {"read": true, "write": true}
      }
    },
    {
      "id": "president",
      "name": "President",
      "description": "Full access to all community features",
      "is_default": true,
      "permissions": {
        "payments": {"read": true, "write": true},
        "announcements": {"read": true, "write": true},
        "documents": {"read": true, "write": true},
        "amenities": {"read": true, "write": true},
        "events": {"read": true, "write": true},
        "maintenance": {"read": true, "write": true},
        "bulletin_board": {"read": true, "write": true},
        "voting": {"read": true, "write": true},
        "violations": {"read": true, "write": true},
        "arc_requests": {"read": true, "write": true},
        "vendors": {"read": true, "write": true},
        "accounting": {"read": true, "write": true},
        "checks": {"read": true, "write": true},
        "budget": {"read": true, "write": true},
        "reports": {"read": true, "write": true},
        "members": {"read": true, "write": true},
        "settings": {"read": true, "write": true},
        "banking": {"read": true, "write": true}
      }
    },
    {
      "id": "treasurer",
      "name": "Treasurer",
      "description": "Financial management focus with read access to all areas",
      "is_default": true,
      "permissions": {
        "payments": {"read": true, "write": true},
        "announcements": {"read": true, "write": false},
        "documents": {"read": true, "write": false},
        "amenities": {"read": true, "write": false},
        "events": {"read": true, "write": false},
        "maintenance": {"read": true, "write": false},
        "bulletin_board": {"read": true, "write": false},
        "voting": {"read": true, "write": false},
        "violations": {"read": true, "write": false},
        "arc_requests": {"read": true, "write": false},
        "vendors": {"read": true, "write": true},
        "accounting": {"read": true, "write": true},
        "checks": {"read": true, "write": true},
        "budget": {"read": true, "write": true},
        "reports": {"read": true, "write": true},
        "members": {"read": true, "write": false},
        "settings": {"read": true, "write": false},
        "banking": {"read": true, "write": true}
      }
    },
    {
      "id": "secretary",
      "name": "Secretary",
      "description": "Communications and records management",
      "is_default": true,
      "permissions": {
        "payments": {"read": true, "write": false},
        "announcements": {"read": true, "write": true},
        "documents": {"read": true, "write": true},
        "amenities": {"read": true, "write": false},
        "events": {"read": true, "write": true},
        "maintenance": {"read": true, "write": false},
        "bulletin_board": {"read": true, "write": true},
        "voting": {"read": true, "write": true},
        "violations": {"read": true, "write": false},
        "arc_requests": {"read": true, "write": false},
        "vendors": {"read": true, "write": false},
        "accounting": {"read": true, "write": false},
        "checks": {"read": true, "write": false},
        "budget": {"read": true, "write": false},
        "reports": {"read": true, "write": false},
        "members": {"read": true, "write": true},
        "settings": {"read": true, "write": false},
        "banking": {"read": true, "write": false}
      }
    },
    {
      "id": "board_member",
      "name": "Board Member",
      "description": "Standard board member access",
      "is_default": true,
      "permissions": {
        "payments": {"read": true, "write": true},
        "announcements": {"read": true, "write": true},
        "documents": {"read": true, "write": true},
        "amenities": {"read": true, "write": true},
        "events": {"read": true, "write": true},
        "maintenance": {"read": true, "write": true},
        "bulletin_board": {"read": true, "write": true},
        "voting": {"read": true, "write": true},
        "violations": {"read": true, "write": true},
        "arc_requests": {"read": true, "write": true},
        "vendors": {"read": true, "write": true},
        "accounting": {"read": true, "write": false},
        "checks": {"read": true, "write": false},
        "budget": {"read": true, "write": true},
        "reports": {"read": true, "write": true},
        "members": {"read": true, "write": false},
        "settings": {"read": true, "write": false},
        "banking": {"read": true, "write": false}
      }
    },
    {
      "id": "property_manager",
      "name": "Property Manager",
      "description": "Day-to-day operations management",
      "is_default": true,
      "permissions": {
        "payments": {"read": true, "write": false},
        "announcements": {"read": true, "write": true},
        "documents": {"read": true, "write": true},
        "amenities": {"read": true, "write": true},
        "events": {"read": true, "write": true},
        "maintenance": {"read": true, "write": true},
        "bulletin_board": {"read": true, "write": true},
        "voting": {"read": true, "write": false},
        "violations": {"read": true, "write": true},
        "arc_requests": {"read": true, "write": true},
        "vendors": {"read": true, "write": true},
        "accounting": {"read": true, "write": false},
        "checks": {"read": true, "write": false},
        "budget": {"read": true, "write": false},
        "reports": {"read": true, "write": false},
        "members": {"read": true, "write": false},
        "settings": {"read": true, "write": false},
        "banking": {"read": true, "write": false}
      }
    }
  ]'::jsonb
)
WHERE theme IS NULL OR NOT (theme ? 'role_templates');

-- ─── Auto-assign existing board/manager members to Full Admin ───
-- This ensures existing users keep their full access after the migration.
-- New board members added later will default to read-only until assigned.
UPDATE members
SET role_template_id = 'full_admin'
WHERE system_role IN ('board', 'manager')
  AND role_template_id IS NULL;
