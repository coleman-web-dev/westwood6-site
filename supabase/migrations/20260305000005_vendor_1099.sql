-- Vendor 1099 Reporting: add tax info, W-9 tracking, and link vendors to accounting

-- Add tax/W-9 fields to vendors
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS w9_on_file BOOLEAN DEFAULT false;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS w9_document_path TEXT;

-- Add vendor_payment to journal_source enum
ALTER TYPE journal_source ADD VALUE IF NOT EXISTS 'vendor_payment';

-- Add vendor_id to journal_entries
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_vendor_id ON journal_entries(vendor_id) WHERE vendor_id IS NOT NULL;

-- Add vendor_id to bank_transactions (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_transactions') THEN
    ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);
    CREATE INDEX IF NOT EXISTS idx_bank_transactions_vendor_id ON bank_transactions(vendor_id) WHERE vendor_id IS NOT NULL;
  END IF;
END $$;
