-- Add notification types for ARC and maintenance request submissions
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'arc_request_submitted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'maintenance_request_submitted';
