-- Migration: Add unique constraint on progress(user_id, vocab_id)
--
-- The progress table tracks per-user SRS state for each vocabulary word.
-- A user should never have more than one progress row per word.
--
-- This constraint is REQUIRED by the upsert operations in:
--   - app/actions/vocab.ts  (upsertWordProgress)
--
-- Apply via Supabase SQL Editor or psql:
--   psql $DATABASE_URL -f migrations/001_add_progress_unique_constraint.sql

-- First, remove any duplicate rows (keep the most recently updated)
WITH dedup AS (
  SELECT ctid,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, vocab_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn
  FROM progress
)
DELETE FROM progress
WHERE ctid IN (SELECT ctid FROM dedup WHERE rn > 1);

-- Add the unique constraint
ALTER TABLE progress
  ADD CONSTRAINT progress_user_vocab_unique
  UNIQUE (user_id, vocab_id);

-- Add index for fast lookup (if not already present)
CREATE INDEX IF NOT EXISTS idx_progress_user_vocab
  ON progress (user_id, vocab_id);
