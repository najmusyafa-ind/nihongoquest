// src/types/achievements.types.ts — Achievement system type definitions
// Read-only system: evaluates existing study_sessions + study_results data.
// No new DB tables required.

// ─── Achievement IDs ────────────────────────────────────────────────────────

export type AchievementId =
  | 'first_session'   // Complete your first study session
  | 'streak_3'        // Study 3 days in a row
  | 'streak_7'        // Study 7 days in a row
  | 'perfect_score'   // 100% accuracy in a single session
  | 'n5_complete'     // Complete 5 N5 sessions
  | 'n4_complete'     // Complete 5 N4 sessions
  | 'hundred_cards'   // Study 100 cards total (across all sessions)
  | 'speed_demon';    // Complete a session with 10+ cards in under 3 minutes

// ─── Achievement Tiers ──────────────────────────────────────────────────────

export type AchievementTier = 'bronze' | 'silver' | 'gold';

// ─── Single Achievement ──────────────────────────────────────────────────────

export interface Achievement {
  id: AchievementId;
  /** ISO 8601 timestamp when unlocked, or null if not yet unlocked */
  unlockedAt: string | null;
  /** Current progress toward the target (e.g. sessions completed) */
  progressCount: number;
  /** Target to reach for unlock */
  targetCount: number;
  /** Percentage 0–100 */
  progressInPercent: number;
  tier: AchievementTier;
}

// ─── Achievement Metadata (static, not stored in DB) ────────────────────────

export interface AchievementMeta {
  id: AchievementId;
  tier: AchievementTier;
  titleEn: string;
  titleJa: string;
  descriptionEn: string;
  descriptionJa: string;
  icon: string; // Lucide icon name
  targetCount: number;
}

// ─── Raw stats queried from DB by AchievementsRepository ────────────────────

export interface AchievementStats {
  /** Total number of completed sessions */
  totalSessionsCount: number;
  /** Total cards studied across all sessions */
  totalCardsCount: number;
  /** Maximum consecutive study days (streak) */
  maxStreakInDays: number;
  /** Number of sessions with 100% accuracy */
  perfectSessionsCount: number;
  /** Count of completed N5 sessions */
  n5SessionsCount: number;
  /** Count of completed N4 sessions */
  n4SessionsCount: number;
  /** Whether user has completed any session with 10+ cards in under 3 minutes */
  hasSpeedDemonSession: boolean;
}

// ─── API Response ────────────────────────────────────────────────────────────

export interface AchievementsResponse {
  achievements: Achievement[];
  unlockedCount: number;
  totalCount: number;
  _demo?: boolean;
}
