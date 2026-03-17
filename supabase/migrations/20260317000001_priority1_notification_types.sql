-- Add Priority 1 notification types for missing communications
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'payment_failed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'invoice_created';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'arc_request_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'arc_request_denied';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'maintenance_request_updated';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'maintenance_request_completed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'deposit_returned';
