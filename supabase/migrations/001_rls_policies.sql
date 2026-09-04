-- =============================================================================
-- NihongoQuest — Migration 001: Row Level Security (RLS) Policies
-- =============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- What this does:
--   1. Enables RLS on all 5 tables
--   2. Creates granular per-table policies (SELECT / INSERT / UPDATE / DELETE)
--   3. Grants minimum necessary privileges to `anon` and `authenticated` roles
--   4. Creates performance indexes for common query patterns
--
-- Design Principle:
--   - Users can ONLY see their own data (study_sessions, study_results, profiles)
--   - flashcards are read-only for all authenticated users (shared vocabulary)
--   - ai_explanation_cache is readable by all authenticated users (shared cache)
--   - NO UPDATE or DELETE on append-only tables (study_sessions, study_results)
--   - Service role bypasses RLS (for seed scripts and admin operations)
-- =============================================================================

-- ── 0. ENUMS (create if not already created by Drizzle migration) ─────────────
DO $$ BEGIN
  CREATE TYPE jlpt_level    AS ENUM ('N5', 'N4', 'N3', 'N2', 'N1');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE grade_result  AS ENUM ('CORRECT', 'INCORRECT', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 1. TABLE: profiles
-- =============================================================================
-- Extension of auth.users. Auto-created on first login via trigger (see migration 002).

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can insert their own profile (happens via trigger, but guard anyway)
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can update their own profile (display_name, target_level)
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- DELETE is FORBIDDEN — no policy = implicit deny

-- =============================================================================
-- 2. TABLE: flashcards
-- =============================================================================
-- Read-only vocabulary. Admin/service role inserts via seed script.

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read flashcards (shared vocabulary data)
CREATE POLICY "flashcards_select_authenticated"
  ON public.flashcards
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT / UPDATE / DELETE → service role bypasses RLS automatically
-- No explicit policy = anon/authenticated users CANNOT write

-- =============================================================================
-- 3. TABLE: study_sessions  ⚠️ APPEND-ONLY
-- =============================================================================

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read ONLY their own sessions
CREATE POLICY "sessions_select_own"
  ON public.study_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert sessions where user_id matches their auth ID
-- Prevents one user from creating sessions on behalf of another
CREATE POLICY "sessions_insert_own"
  ON public.study_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE → FORBIDDEN (append-only ledger)
-- DELETE → FORBIDDEN (append-only ledger)

-- =============================================================================
-- 4. TABLE: study_results  ⚠️ APPEND-ONLY
-- =============================================================================

ALTER TABLE public.study_results ENABLE ROW LEVEL SECURITY;

-- Users can read ONLY their own results
CREATE POLICY "results_select_own"
  ON public.study_results
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert results only for themselves
-- Also validates the session belongs to the user (prevents cross-user injection)
CREATE POLICY "results_insert_own"
  ON public.study_results
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.study_sessions s
      WHERE s.id = session_id
        AND s.user_id = auth.uid()
    )
  );

-- UPDATE → FORBIDDEN
-- DELETE → FORBIDDEN

-- =============================================================================
-- 5. TABLE: ai_explanation_cache
-- =============================================================================
-- Shared cache: all authenticated users can read, only service role can write.

ALTER TABLE public.ai_explanation_cache ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the cache (cache hit path)
CREATE POLICY "ai_cache_select_authenticated"
  ON public.ai_explanation_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT → service role only (no policy for authenticated = implicit deny)
-- UPDATE → service role only (hit_count increment)
-- DELETE → FORBIDDEN

-- =============================================================================
-- 6. PERFORMANCE INDEXES
-- =============================================================================

-- flashcards: filter by JLPT level (most common query)
CREATE INDEX IF NOT EXISTS idx_flashcards_level
  ON public.flashcards (level);

-- study_sessions: user's history, latest first
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_started
  ON public.study_sessions (user_id, started_at DESC);

-- study_sessions: progress per level
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_level
  ON public.study_sessions (user_id, level);

-- study_results: all results for a session
CREATE INDEX IF NOT EXISTS idx_study_results_session
  ON public.study_results (session_id);

-- study_results: accuracy calculation per user
CREATE INDEX IF NOT EXISTS idx_study_results_user_result
  ON public.study_results (user_id, result);

-- ai_explanation_cache: cache lookup by hash key
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_cache_key
  ON public.ai_explanation_cache (cache_key);

-- =============================================================================
-- 7. PRIVILEGE GRANTS
-- =============================================================================
-- Minimum necessary privileges for each role.

-- anon: can read flashcards only (for the landing page demo, if needed)
GRANT SELECT ON public.flashcards TO anon;

-- authenticated: can read/write within RLS constraints
GRANT SELECT, INSERT ON public.profiles           TO authenticated;
GRANT UPDATE (display_name, target_level, updated_at) ON public.profiles TO authenticated;
GRANT SELECT ON public.flashcards                 TO authenticated;
GRANT SELECT, INSERT ON public.study_sessions     TO authenticated;
GRANT SELECT, INSERT ON public.study_results      TO authenticated;
GRANT SELECT ON public.ai_explanation_cache       TO authenticated;

-- =============================================================================
-- END OF MIGRATION 001
-- =============================================================================
