// src/features/achievements/AchievementsService.ts
// BUSINESS LOGIC ONLY — pure functions, no DB imports, no HTTP calls.
// Input: AchievementStats (from AchievementsRepository)
// Output: Achievement[] with progress and unlock status
//
// ADR-011 (2026-09-04): Now also exposes evaluateAndPersistUnlocks() which
// calls AchievementsRepository to INSERT newly-earned badges after each session.

import type {
  Achievement,
  AchievementId,
  AchievementMeta,
  AchievementStats,
  AchievementsResponse,
} from '@/types/achievements.types';
import { AchievementsRepository } from './AchievementsRepository';

// ─── Static Achievement Metadata ─────────────────────────────────────────────
// Defined here (not in DB) — never changes at runtime.

const ACHIEVEMENT_META: Record<AchievementId, AchievementMeta> = {
  first_session: {
    id: 'first_session',
    tier: 'bronze',
    titleEn: 'First Steps',
    titleJa: '一歩を踏み出す',
    descriptionEn: 'Every master was once a beginner. You\'ve taken the first step on the path to Japanese.',
    descriptionJa: '千里の道も一歩から。最初のセッションを終えました。',
    icon: 'Sprout',
    targetCount: 1,
  },
  streak_3: {
    id: 'streak_3',
    tier: 'bronze',
    titleEn: '3-Day Streak',
    titleJa: '三日坊主を超えた',
    descriptionEn: 'They say habits die in 3 days. You proved them wrong.',
    descriptionJa: '三日坊主にならず、3日連続で学習を続けました。',
    icon: 'Flame',
    targetCount: 3,
  },
  streak_7: {
    id: 'streak_7',
    tier: 'silver',
    titleEn: 'Week Warrior',
    titleJa: '七転び八起き',
    descriptionEn: 'A full week of daily study. Your brain is forming real neural pathways.',
    descriptionJa: '七転び八起き — 7日間、毎日学習を続けました。',
    icon: 'Zap',
    targetCount: 7,
  },
  perfect_score: {
    id: 'perfect_score',
    tier: 'silver',
    titleEn: 'Perfect Score',
    titleJa: '満点',
    descriptionEn: 'Zero mistakes in a session. 完璧 (kanpeki) — truly flawless.',
    descriptionJa: '一問も間違えずにセッションをクリアしました。完璧！',
    icon: 'Star',
    targetCount: 1,
  },
  n5_complete: {
    id: 'n5_complete',
    tier: 'bronze',
    titleEn: 'N5 Graduate',
    titleJa: 'N5卒業',
    descriptionEn: '5 N5 sessions done. You know your 挨拶 from your 食べ物.',
    descriptionJa: 'N5のセッションを5回完了。日常会話の基礎を築きました。',
    icon: 'BookOpen',
    targetCount: 5,
  },
  n4_complete: {
    id: 'n4_complete',
    tier: 'silver',
    titleEn: 'N4 Graduate',
    titleJa: 'N4卒業',
    descriptionEn: '5 N4 sessions cleared. Manga without furigana? Getting there.',
    descriptionJa: 'N4セッションを5回完了。ふりがななしの漫画も夢じゃない。',
    icon: 'GraduationCap',
    targetCount: 5,
  },
  hundred_cards: {
    id: 'hundred_cards',
    tier: 'gold',
    titleEn: 'Century Scholar',
    titleJa: '百戦錬磨',
    descriptionEn: '100 flashcards reviewed. 百 (hyaku) — the number of mastery.',
    descriptionJa: '百戦錬磨 — フラッシュカードを100枚学習しました。',
    icon: 'Library',
    targetCount: 100,
  },
  speed_demon: {
    id: 'speed_demon',
    tier: 'gold',
    titleEn: 'Speed Demon',
    titleJa: '疾風の勉強家',
    descriptionEn: '10 cards in under 3 minutes. Your fingers know the readings before your brain does.',
    descriptionJa: '疾風の如く — 3分以内に10枚以上のカードを完了しました。',
    icon: 'Timer',
    targetCount: 1,
  },
};

// ─── Progress Extractors ──────────────────────────────────────────────────────
// Map each AchievementId to a function that extracts current progress from stats.


const progressExtractors: Record<AchievementId, (s: AchievementStats) => number> = {
  first_session:  (s) => Math.min(1, s.totalSessionsCount),
  streak_3:       (s) => Math.min(3, s.maxStreakInDays),
  streak_7:       (s) => Math.min(7, s.maxStreakInDays),
  perfect_score:  (s) => Math.min(1, s.perfectSessionsCount),
  n5_complete:    (s) => Math.min(5, s.n5SessionsCount),
  n4_complete:    (s) => Math.min(5, s.n4SessionsCount),
  hundred_cards:  (s) => Math.min(100, s.totalCardsCount),
  speed_demon:    (s) => s.hasSpeedDemonSession ? 1 : 0,
};

// ─── Session Summary ──────────────────────────────────────────────────────────
// Passed into evaluateAndPersistUnlocks() after a study session completes.

export interface SessionSummary {
  userId: string;
  stats: AchievementStats;
  isClockAnomalous: boolean;
}

// ─── Service API ──────────────────────────────────────────────────────────────

export const AchievementsService = {
  /**
   * Evaluate all achievements based on raw stats from AchievementsRepository.
   * Pure function: same input → same output. No side effects.
   *
   * @param stats - Raw aggregated stats from the DB
   * @param unlockedTimestamps - Map of achievementId → ISO date string (from a future
   *                             achievements_unlocked table, currently derived from stats).
   */
  evaluateAchievements(
    stats: AchievementStats,
    persistedTimestamps?: Map<string, string>
  ): AchievementsResponse {
    const achievementIds = Object.keys(ACHIEVEMENT_META) as AchievementId[];

    const achievements: Achievement[] = achievementIds.map((id) => {
      const meta     = ACHIEVEMENT_META[id];
      const extract  = progressExtractors[id];
      const progress = extract(stats);
      const isUnlocked = progress >= meta.targetCount;

      return {
        id,
        tier:              meta.tier,
        progressCount:     progress,
        targetCount:       meta.targetCount,
        progressInPercent: Math.round((progress / meta.targetCount) * 100),
        // unlockedAt is populated from achievements_unlocked table (ADR-011).
        // The GET /api/achievements path passes persistedTimestamps for this.
        unlockedAt: isUnlocked ? (persistedTimestamps?.get(id) ?? null) : null,
      } satisfies Achievement;
    });

    // Sort: unlocked first (by tier: gold > silver > bronze), then locked by progress %
    const tierOrder: Record<string, number> = { gold: 3, silver: 2, bronze: 1 };
    achievements.sort((a, b) => {
      if (a.unlockedAt && !b.unlockedAt) return -1;
      if (!a.unlockedAt && b.unlockedAt) return 1;
      if (a.unlockedAt && b.unlockedAt) {
        return (tierOrder[b.tier] ?? 0) - (tierOrder[a.tier] ?? 0);
      }
      return b.progressInPercent - a.progressInPercent;
    });

    const unlockedCount = achievements.filter(a => a.unlockedAt !== null).length;

    return {
      achievements,
      unlockedCount,
      totalCount: achievements.length,
    };
  },

  /**
   * Returns a seeded demo response for unauthenticated / no-DB environments.
   */
  getDemoAchievements(): AchievementsResponse {
    const demoStats: AchievementStats = {
      totalSessionsCount:   3,
      totalCardsCount:      45,
      maxStreakInDays:       3,
      perfectSessionsCount: 1,
      n5SessionsCount:      3,
      n4SessionsCount:      0,
      hasSpeedDemonSession: false,
    };
    const result = AchievementsService.evaluateAchievements(demoStats);
    return { ...result, _demo: true };
  },

  /**
   * Evaluates which achievements are newly earned after a session completes
   * and persists them to achievements_unlocked via AchievementsRepository.
   *
   * IDEMPOTENT: ON CONFLICT DO NOTHING guarantees this is safe to call multiple times.
   * NON-BLOCKING: Errors are caught and logged — never cause the session save to fail.
   *
   * @param summary - userId, stats snapshot, and clock anomaly flag from POST /api/sessions
   * @returns Array of achievement IDs that were newly unlocked this call (empty if all were already stored)
   */
  async evaluateAndPersistUnlocks(summary: SessionSummary): Promise<string[]> {
    const { userId, stats, isClockAnomalous } = summary;
    const achievementIds = Object.keys(ACHIEVEMENT_META) as AchievementId[];
    const newlyUnlocked: string[] = [];

    for (const id of achievementIds) {
      const meta    = ACHIEVEMENT_META[id];
      const extract = progressExtractors[id];
      const progress = extract(stats);
      const isEarned = progress >= meta.targetCount;

      if (!isEarned) continue;

      // Snapshot the stats at the moment of unlock — prevents retroactive changes
      const metaSnapshot = JSON.stringify({
        sessionsCount:    stats.totalSessionsCount,
        cardsCount:       stats.totalCardsCount,
        maxStreak:        stats.maxStreakInDays,
        n5Sessions:       stats.n5SessionsCount,
        n4Sessions:       stats.n4SessionsCount,
        perfectSessions:  stats.perfectSessionsCount,
        evaluatedAt:      new Date().toISOString(),
      });

      try {
        const inserted = await AchievementsRepository.insertUnlock({
          userId,
          achievementId: id,
          metaJson: metaSnapshot,
          isAnomalous: isClockAnomalous,
        });
        // insertUnlock returns undefined if already exists (ON CONFLICT DO NOTHING)
        if (inserted !== undefined) {
          newlyUnlocked.push(id);
        }
      } catch {
        // Non-blocking: achievement persistence failure must NEVER crash the session save.
        // The next session completion will retry (idempotent).
      }
    }

    return newlyUnlocked;
  },
};

