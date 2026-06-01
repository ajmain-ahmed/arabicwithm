-- Migration: Add review_logs audit table and restore learning_step to progress
--
-- This migration introduces the two-table SRS design:
--   - progress: current state snapshot (mutable)
--   - review_logs: append-only audit trail (immutable)

-- ── 1. Restore learning_step on progress ──────────────────────────────
-- learning_step tracks where a card is in the learning loop:
--   0 = graduated / not in learning
--   1, 2, 3 = active learning steps ( graduate at step 3 )

ALTER TABLE progress
  ADD COLUMN IF NOT EXISTS learning_step int DEFAULT 0;

UPDATE progress
  SET learning_step = 0
  WHERE learning_step IS NULL;

-- ── 2. Create review_logs audit table ─────────────────────────────────

CREATE TABLE IF NOT EXISTS review_logs (
  id            bigserial PRIMARY KEY,
  user_id       uuid NOT NULL,
  vocab_id      int NOT NULL,
  rating        text NOT NULL CHECK (rating IN ('again','hard','good','easy')),
  queue_type    text NOT NULL CHECK (queue_type IN ('new','learning','review')),
  interval_days_old  int,
  interval_days_new  int,
  ease_factor_old    decimal(4,2),
  ease_factor_new    decimal(4,2),
  learning_step_old  int,
  learning_step_new  int,
  created_at    timestamptz DEFAULT now()
);

-- Indexes for fast daily-count lookups and session queries
CREATE INDEX IF NOT EXISTS idx_review_logs_user_created
  ON review_logs (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_review_logs_user_queue_date
  ON review_logs (user_id, queue_type, created_at);

-- Index for per-card history lookups
CREATE INDEX IF NOT EXISTS idx_review_logs_user_vocab
  ON review_logs (user_id, vocab_id);
