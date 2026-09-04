// src/features/analytics/AnalyticsRepository.ts
// DATA ACCESS ONLY â€” aggregate queries for analytics dashboard
// Queries: study_results JOIN flashcards (accuracy + weak words)
//          study_sessions (streak calculation)

import { db } from '@/lib/db';

import { flashcards, studyResults, studySessions } from '../../../db/schema';

import { eq, and, sql, desc, count } from 'drizzle-orm';

import type { JlptLevel } from '@/types/enums';

import type { WeakWord, LevelAccuracy } from '@/types/quiz.types';
import { childLogger } from '@/lib/logger';

const log = childLogger('AnalyticsRepo');



/** Max rows for weak words list */
const MAX_WEAK_WORDS = 10;
/** Days to look back for streak calculation */
const STREAK_LOOKBACK_DAYS = 365;

export const AnalyticsRepository = {
  /**
   * Compute accuracy per JLPT level for a user.
   * Uses GROUP BY on level + result â€” single query, no N+1.
   */
  async getAccuracyByLevel(userId: string): Promise<LevelAccuracy[]> {
    try {
      // Count total and correct answers per level
      const rows = await db
        .select({
          level: flashcards.level,
          total:   count(studyResults.id),
          correct: sql<number>`SUM(CASE WHEN ${studyResults.result} = 'CORRECT' THEN 1 ELSE 0 END)`,
        })
        .from(studyResults)
        .innerJoin(flashcards, eq(studyResults.flashcardId, flashcards.id))
        .where(
          and(
            eq(studyResults.userId, userId),
            // Only FLASHCARD mode rows have a flashcardId — QUIZ mode excluded
            eq(studyResults.sourceMode, 'FLASHCARD')
          )
        )
        .groupBy(flashcards.level);

      return rows.map((row) => {
        const total = Number(row.total);
        const correct = Number(row.correct);
        return {
          level: row.level as JlptLevel,
          totalAnswered: total,
          accuracyInPercent: total > 0 ? Math.round((correct / total) * 100) : 0,
        };
      });
    } catch (error) {
      log.error('[AnalyticsRepository] getAccuracyByLevel failed:', error);
      throw error;
    }
  },

  /**
   * Get top N most-missed flashcards for a user (weak words).
   * JOIN study_results + flashcards WHERE result = INCORRECT.
   * Bounded: LIMIT MAX_WEAK_WORDS (10).
   */
  async getWeakWords(userId: string): Promise<WeakWord[]> {
    try {
      const rows = await db
        .select({
          flashcardId:   studyResults.flashcardId,
          kanji:         flashcards.kanji,
          hiragana:      flashcards.hiragana,
          meaningId:     flashcards.meaningId,
          errorCount:    count(studyResults.id),
          lastAttempted: sql<Date>`MAX(${studyResults.answeredAt})`,
        })
        .from(studyResults)
        .innerJoin(flashcards, eq(studyResults.flashcardId, flashcards.id))
        .where(
          and(
            eq(studyResults.userId, userId),
            eq(studyResults.result, 'INCORRECT'),
            // ADR-010: Weak Words = FLASHCARD mode only. QUIZ mode uses vocab keys, not UUIDs.
            // INNER JOIN already excludes null flashcardIds at DB level; this filter
            // is explicit and prevents future index confusion.
            eq(studyResults.sourceMode, 'FLASHCARD')
          )
        )
        .groupBy(
          studyResults.flashcardId,
          flashcards.kanji,
          flashcards.hiragana,
          flashcards.meaningId
        )
        .orderBy(desc(count(studyResults.id)))
        .limit(MAX_WEAK_WORDS);

      return rows.map((row) => ({
        // Non-null assertion: INNER JOIN on flashcards.id guarantees flashcardId is never
        // null in any returned row. TS infers `string | null` from schema; runtime is `string`.
        flashcardId:   row.flashcardId!,
        kanji:         row.kanji,
        hiragana:      row.hiragana,
        meaningId:     row.meaningId,
        errorCount:    Number(row.errorCount),
        lastAttempted: row.lastAttempted,
      }));
    } catch (error) {
      log.error('[AnalyticsRepository] getWeakWords failed:', error);
      throw error;
    }
  },

  /**
   * Get daily study dates for streak calculation.
   * Returns an array of distinct calendar days (as ISO date strings) the user studied,
   * ordered descending, limited to STREAK_LOOKBACK_DAYS (365 days).
   *
   * Streak logic is in AnalyticsService (pure function â€” no DB).
   */
  async getStudyDateStrings(userId: string): Promise<string[]> {
    try {
      // GAP-9 FIX: Use .selectDistinct() — Drizzle ORM does NOT support DISTINCT
      // as a field-level SQL expression inside .select(). The previous query:
      //   sql`DISTINCT TO_CHAR(...)` — is invalid and could return duplicate dates,
      // causing streak miscalculations. .selectDistinct() is the correct API.
      const rows = await db
        .selectDistinct({
          studyDate: sql<string>`TO_CHAR(${studySessions.startedAt}, 'YYYY-MM-DD')`,
        })
        .from(studySessions)
        .where(
          and(
            eq(studySessions.userId, userId),
            sql`${studySessions.startedAt} >= NOW() - INTERVAL '${sql.raw(String(STREAK_LOOKBACK_DAYS))} days'`
          )
        )
        .orderBy(desc(studySessions.startedAt))
        .limit(STREAK_LOOKBACK_DAYS);

      return rows.map(r => r.studyDate);
    } catch (error) {
      log.error('[AnalyticsRepository] getStudyDateStrings failed:', error);
      throw error;
    }
  },

  /**
   * Get total completed sessions and total cards studied for a user.
   * Single aggregate query â€” no N+1.
   */
  async getTotals(userId: string): Promise<{ totalSessions: number; totalCardsStudied: number }> {
    try {
      const [sessionRow] = await db
        .select({ count: count(studySessions.id) })
        .from(studySessions)
        .where(
          and(
            eq(studySessions.userId, userId),
            eq(studySessions.status, 'COMPLETED')
          )
        );

      const [cardsRow] = await db
        .select({ count: count(studyResults.id) })
        .from(studyResults)
        .where(eq(studyResults.userId, userId));

      return {
        totalSessions:    Number(sessionRow?.count ?? 0),
        totalCardsStudied: Number(cardsRow?.count ?? 0),
      };
    } catch (error) {
      log.error('[AnalyticsRepository] getTotals failed:', error);
      throw error;
    }
  },
};






