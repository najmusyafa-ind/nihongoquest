// src/features/achievements/AchievementsRepository.ts
// Repository: achievements_unlocked table — append-only badge ledger (ADR-011)
// RULE: Only this file speaks to achievements_unlocked. No DB access from Service or Components.
// RULE: Append-only — no UPDATE, no DELETE.

import { db } from "@/lib/db";
import { achievementsUnlocked, studySessions } from "../../../db/schema";
import type { AchievementUnlocked, NewAchievementUnlocked } from "../../../db/schema";
import type { AchievementStats } from "@/types/achievements.types";
import { eq, desc, and } from "drizzle-orm";
import { childLogger } from "@/lib/logger";

const log = childLogger("achievements-repository");

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface InsertUnlockParams {
  userId: string;
  achievementId: string;
  metaJson?: string;
  isAnomalous?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all achievements unlocked by a user, newest first.
 * LIMIT 50 — users typically have < 20 badges. Prevents unbounded scan.
 */
async function getAllByUser(userId: string): Promise<AchievementUnlocked[]> {
  try {
    return await db
      .select()
      .from(achievementsUnlocked)
      .where(eq(achievementsUnlocked.userId, userId))
      .orderBy(desc(achievementsUnlocked.unlockedAt))
      .limit(50);
  } catch (error) {
    log.error("[AchievementsRepository] getAllByUser failed:", { error, userId });
    throw error;
  }
}

/**
 * Returns a Map of achievementId → ISO unlock timestamp for a user.
 * Used by evaluateAchievements() to populate real unlockedAt from persisted records.
 */
async function getUnlockedTimestamps(userId: string): Promise<Map<string, string>> {
  const rows = await getAllByUser(userId);
  return new Map(
    rows.map((r) => [r.achievementId, r.unlockedAt.toISOString()])
  );
}

/**
 * Aggregates all achievement-relevant stats for a user from study_sessions
 * and study_results in 2 queries.
 *
 * Query 1: session-level aggregates (counts, accuracy, speed)
 * Query 2: total cards from study_results (sum of totalCards per session)
 *
 * Streak algorithm: JS date-gap calculation on sorted session dates.
 * Correct for startup scale (< 1k sessions/user). For growth scale,
 * replace with Postgres LEAD() window function.
 */
async function getStatsForUser(userId: string): Promise<AchievementStats> {
  try {
    // ── Query 1: Session-level aggregates ─────────────────────────────────────
    const sessionRows = await db
      .select({
        level:          studySessions.level,
        status:         studySessions.status,
        totalCards:     studySessions.totalCards,
        correctCount:   studySessions.correctCount,
        startedAt:      studySessions.startedAt,
        completedAt:    studySessions.completedAt,
      })
      .from(studySessions)
      .where(
        and(
          eq(studySessions.userId, userId),
          eq(studySessions.status, 'COMPLETED')
        )
      )
      .orderBy(desc(studySessions.startedAt))
      .limit(500); // FinOps guard: 500 sessions is far beyond any beta user

    // ── Compute session-level stats ───────────────────────────────────────────
    const totalSessionsCount  = sessionRows.length;
    const totalCardsCount     = sessionRows.reduce((s, r) => s + r.totalCards, 0);
    const n5SessionsCount     = sessionRows.filter(r => r.level === 'N5').length;
    const n4SessionsCount     = sessionRows.filter(r => r.level === 'N4').length;
    const perfectSessionsCount = sessionRows.filter(
      r => r.totalCards > 0 && r.correctCount === r.totalCards
    ).length;

    // Speed Demon: 10+ cards in < 3 minutes (180_000ms)
    const hasSpeedDemonSession = sessionRows.some(r => {
      if (!r.completedAt || r.totalCards < 10) return false;
      const durationMs = r.completedAt.getTime() - r.startedAt.getTime();
      return durationMs < 180_000;
    });

    // ── Streak: max consecutive calendar days with at least 1 session ─────────
    // Extract unique date strings (YYYY-MM-DD) from all sessions, sorted desc
    const uniqueDays = [
      ...new Set(
        sessionRows.map(r => r.startedAt.toISOString().slice(0, 10))
      ),
    ].sort().reverse(); // newest first

    let maxStreakInDays = uniqueDays.length > 0 ? 1 : 0;
    let currentStreak  = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
      const prev = new Date(uniqueDays[i - 1] ?? '');
      const curr = new Date(uniqueDays[i] ?? '');
      const diffDays = Math.round(
        (prev.getTime() - curr.getTime()) / 86_400_000
      );
      if (diffDays === 1) {
        currentStreak++;
        if (currentStreak > maxStreakInDays) maxStreakInDays = currentStreak;
      } else {
        currentStreak = 1;
      }
    }

    return {
      totalSessionsCount,
      totalCardsCount,
      maxStreakInDays,
      perfectSessionsCount,
      n5SessionsCount,
      n4SessionsCount,
      hasSpeedDemonSession,
    } satisfies AchievementStats;

  } catch (error) {
    log.error("[AchievementsRepository] getStatsForUser failed:", { error, userId });
    throw error;
  }
}

/**
 * Checks if a specific achievement is already unlocked by this user.
 * Used by AchievementsService before evaluating criteria to skip redundant work.
 */
async function isUnlocked(userId: string, achievementId: string): Promise<boolean> {
  try {
    const rows = await db
      .select({ id: achievementsUnlocked.id })
      .from(achievementsUnlocked)
      .where(
        and(
          eq(achievementsUnlocked.userId, userId),
          eq(achievementsUnlocked.achievementId, achievementId)
        )
      )
      .limit(1);
    return rows.length > 0;
  } catch (error) {
    log.error("[AchievementsRepository] isUnlocked failed:", { error, userId, achievementId });
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Write (Append-Only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inserts a new achievement unlock record.
 *
 * IDEMPOTENCY: Uses ON CONFLICT DO NOTHING on the unique (user_id, achievement_id) index.
 * Safe to call multiple times — only the first call inserts. Subsequent calls are no-ops.
 *
 * Returns the inserted row, or undefined if the achievement was already unlocked.
 */
async function insertUnlock(
  params: InsertUnlockParams
): Promise<AchievementUnlocked | undefined> {
  const { userId, achievementId, metaJson, isAnomalous = false } = params;

  try {
    const newRecord: NewAchievementUnlocked = {
      userId,
      achievementId,
      metaJson: metaJson ?? null,
      isAnomalous,
    };

    const [inserted] = await db
      .insert(achievementsUnlocked)
      .values(newRecord)
      .onConflictDoNothing({ target: [achievementsUnlocked.userId, achievementsUnlocked.achievementId] })
      .returning();

    if (inserted) {
      log.info("[AchievementsRepository] Achievement unlocked:", {
        userId,
        achievementId,
        isAnomalous,
        unlockedAt: inserted.unlockedAt,
      });
    }

    return inserted;
  } catch (error) {
    log.error("[AchievementsRepository] insertUnlock failed:", {
      error,
      userId,
      achievementId,
    });
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export const AchievementsRepository = {
  getAllByUser,
  getUnlockedTimestamps,
  getStatsForUser,
  isUnlocked,
  insertUnlock,
} as const;
