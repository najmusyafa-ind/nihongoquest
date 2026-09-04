-- =============================================================================
-- Migration: 0002_quiz_results_achievements
-- NihongoQuest — ADR-010 (Quiz Results) + ADR-011 (Achievements Event-Driven)
-- Author: ultimate-fullstack-dev v8.4
-- Date: 2026-09-04
-- =============================================================================
-- RISK ASSESSMENT:
--   Destructive?             NO — all changes are additive
--   Backfill needed?         YES — source_mode backfill (safe UPDATE)
--   Zero-downtime strategy?  YES — ALTER ADD NULL column is instant in Postgres 12+
--   Row count estimate:      < 10k (new project) — auto-approved
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- PART 1: study_results — Support Quiz mode (ADR-010)
-- -----------------------------------------------------------------------------

-- 1a. Make flashcard_id nullable
ALTER TABLE study_results
  ALTER COLUMN flashcard_id DROP NOT NULL;

-- 1b. Add source_mode column
ALTER TABLE study_results
  ADD COLUMN IF NOT EXISTS source_mode text NOT NULL DEFAULT 'FLASHCARD';

-- 1c. Add vocab_key for Quiz mode
ALTER TABLE study_results
  ADD COLUMN IF NOT EXISTS vocab_key text;

-- 1d. Backfill existing rows
UPDATE study_results
  SET source_mode = 'FLASHCARD'
  WHERE source_mode IS NULL;

-- 1e. Weak Words Analytics index
CREATE INDEX IF NOT EXISTS idx_study_results_user_incorrect
  ON study_results (user_id, result, source_mode);

-- -----------------------------------------------------------------------------
-- PART 2: achievements_unlocked — ADR-011
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS achievements_unlocked (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id),
  achievement_id  text NOT NULL,
  unlocked_at     timestamp NOT NULL DEFAULT now(),
  meta_json       text,
  is_anomalous    boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_achievement
  ON achievements_unlocked (user_id, achievement_id);

CREATE INDEX IF NOT EXISTS idx_achievements_user_id
  ON achievements_unlocked (user_id, unlocked_at DESC);

-- -----------------------------------------------------------------------------
-- PART 3: RLS Policies for achievements_unlocked
-- -----------------------------------------------------------------------------

ALTER TABLE achievements_unlocked ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON achievements_unlocked FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can insert achievements"
  ON achievements_unlocked FOR INSERT
  WITH CHECK (user_id = auth.uid());

COMMIT;

-- ROLLBACK BLOCK:
-- BEGIN;
-- DROP TABLE IF EXISTS achievements_unlocked;
-- ALTER TABLE study_results DROP COLUMN IF EXISTS vocab_key;
-- ALTER TABLE study_results DROP COLUMN IF EXISTS source_mode;
-- ALTER TABLE study_results ALTER COLUMN flashcard_id SET NOT NULL;
-- DROP INDEX IF EXISTS idx_study_results_user_incorrect;
-- COMMIT;
