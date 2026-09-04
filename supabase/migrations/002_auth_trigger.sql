-- =============================================================================
-- NihongoQuest — Migration 002: Auth Trigger (Auto-create Profile on Signup)
-- =============================================================================
-- Run AFTER migration 001.
--
-- What this does:
--   When a user signs up via Google SSO (or email), automatically creates a row
--   in public.profiles so the app always has a profile for every auth.users row.
--
-- Security: SECURITY DEFINER runs as the function owner (postgres/service role),
--   bypassing RLS — needed because the trigger fires BEFORE the user has a
--   session cookie that RLS could validate.
-- =============================================================================

-- ── Function: handle_new_user ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, target_level, created_at, updated_at)
  VALUES (
    NEW.id,
    -- Google SSO provides full_name; email/password signup uses email prefix
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    'N5',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- idempotent: safe to re-run

  RETURN NEW;
END;
$$;

-- ── Trigger: on_auth_user_created ─────────────────────────────────────────────
-- Fires AFTER INSERT on auth.users (Supabase internal table)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- END OF MIGRATION 002
-- =============================================================================
