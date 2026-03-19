-- Add source tracking to checks table for statement-discovered checks
ALTER TABLE checks ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
  CHECK (source IN ('manual', 'statement_ai', 'print'));

COMMENT ON COLUMN checks.source IS 'How this check record was created: manual (board entered), statement_ai (discovered from bank statement), print (printed from system)';
