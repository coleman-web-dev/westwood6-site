-- ============================================================
-- AI-POWERED TRANSACTION CATEGORIZATION
-- Adds AI match method, confidence metadata, and cross-community
-- learning memory table for improving categorization over time.
-- ============================================================

-- Add 'ai' to the match_method enum
ALTER TYPE match_method ADD VALUE IF NOT EXISTS 'ai';

-- Add AI metadata columns to bank_transactions
ALTER TABLE bank_transactions
  ADD COLUMN IF NOT EXISTS ai_confidence REAL,
  ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;

-- ─── Cross-Community Learning Memory ─────────────────────────────
-- Stores anonymized categorization patterns shared across all HOAs.
-- Uses account_code (e.g. "5100") not UUID since codes are consistent.

CREATE TABLE IF NOT EXISTS ai_categorization_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_name TEXT NOT NULL,
  account_code TEXT NOT NULL,
  account_type account_type NOT NULL,
  confirmation_count INTEGER NOT NULL DEFAULT 1,
  correction_count INTEGER NOT NULL DEFAULT 0,
  derived_confidence REAL NOT NULL DEFAULT 1.0,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_memory_entry UNIQUE (normalized_name, account_code)
);

CREATE INDEX IF NOT EXISTS idx_ai_memory_name
  ON ai_categorization_memory(normalized_name);
CREATE INDEX IF NOT EXISTS idx_ai_memory_confidence
  ON ai_categorization_memory(derived_confidence DESC);

-- RLS enabled but no user policies: only accessible via admin client
ALTER TABLE ai_categorization_memory ENABLE ROW LEVEL SECURITY;

-- Auto-update derived_confidence on insert/update
CREATE OR REPLACE FUNCTION update_ai_memory_confidence()
RETURNS TRIGGER AS $$
BEGIN
  NEW.derived_confidence := NEW.confirmation_count::REAL /
    GREATEST(NEW.confirmation_count + NEW.correction_count, 1)::REAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ai_memory_confidence
  BEFORE INSERT OR UPDATE ON ai_categorization_memory
  FOR EACH ROW EXECUTE FUNCTION update_ai_memory_confidence();

-- ─── RPC: Upsert a confirmed categorization into memory ──────────
CREATE OR REPLACE FUNCTION upsert_ai_memory(
  p_normalized_name TEXT,
  p_account_code TEXT,
  p_account_type account_type
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ai_categorization_memory (normalized_name, account_code, account_type, confirmation_count, last_confirmed_at)
  VALUES (p_normalized_name, p_account_code, p_account_type, 1, now())
  ON CONFLICT (normalized_name, account_code) DO UPDATE SET
    confirmation_count = ai_categorization_memory.confirmation_count + 1,
    last_confirmed_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── RPC: Record an AI correction (wrong mapping) ────────────────
CREATE OR REPLACE FUNCTION record_ai_correction(
  p_normalized_name TEXT,
  p_wrong_account_code TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE ai_categorization_memory
  SET correction_count = correction_count + 1
  WHERE normalized_name = p_normalized_name
    AND account_code = p_wrong_account_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
