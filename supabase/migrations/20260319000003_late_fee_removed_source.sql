-- Add late_fee_removed to journal_source enum
ALTER TYPE journal_source ADD VALUE IF NOT EXISTS 'late_fee_removed';
