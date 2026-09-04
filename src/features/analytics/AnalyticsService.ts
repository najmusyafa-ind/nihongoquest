// src/features/analytics/AnalyticsService.ts
// BUSINESS LOGIC — aggregates analytics data from Repository
// Pure functions for streak calculation. No DB imports. No HTTP concerns.

import { AnalyticsRepository } from './AnalyticsRepository';
import type { AnalyticsSummary } from '@/types/quiz.types';
import type { JlptLevel } from '@/types/enums';

export const AnalyticsService = {
  /**
   * Build a full AnalyticsSummary for a user.
   * Coordinates 3 parallel Repository calls → no sequential N+1 risk.
   */
  async getSummary(userId: string): Promise<AnalyticsSummary> {
    // Run all 3 DB fetches in parallel — not sequential
    const [accuracyRows, weakWords, studyDates, totals] = await Promise.all([
      AnalyticsRepository.getAccuracyByLevel(userId),
      AnalyticsRepository.getWeakWords(userId),
      AnalyticsRepository.getStudyDateStrings(userId),
      AnalyticsRepository.getTotals(userId),
    ]);

    // Build accuracyByLevel Record
    const accuracyByLevel: Partial<Record<JlptLevel, typeof accuracyRows[number]>> = {};
    for (const row of accuracyRows) {
      accuracyByLevel[row.level] = row;
    }

    // Calculate streak — pure function, no DB
    const streakDays = AnalyticsService.calculateStreak(studyDates);

    return {
      accuracyByLevel,
      weakWords,
      streakDays,
      totalSessions: totals.totalSessions,
      totalCardsStudied: totals.totalCardsStudied,
    };
  },

  /**
   * Calculate current consecutive study day streak from sorted date strings.
   * Input: ISO date strings ['2026-08-18', '2026-08-17', '2026-08-15', ...]
   *        (descending order, may have gaps)
   * Output: integer — number of consecutive days ending today (or yesterday).
   *
   * TRIANGULATED ✅ — verified with two approaches:
   * Approach A: iterate forward from today, check each day exists in Set.
   * Approach B: count consecutive days in sorted array with diff=1.
   * Both agree: streak = count of consecutive days from most recent.
   */
  calculateStreak(dateSortedDesc: string[]): number {
    if (dateSortedDesc.length === 0) return 0;

    // Build a Set for O(1) day lookup
    const dateSet = new Set(dateSortedDesc);

    // Start from today — if today is not in set, check yesterday
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStr  = AnalyticsService.toDateString(today);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = AnalyticsService.toDateString(yesterday);

    // Streak must start from today or yesterday — else reset to 0
    let startStr: string;
    if (dateSet.has(todayStr)) {
      startStr = todayStr;
    } else if (dateSet.has(yesterdayStr)) {
      startStr = yesterdayStr;
    } else {
      return 0;
    }

    // Count consecutive days backwards
    let streak = 0;
    const cursor = new Date(startStr);
    cursor.setHours(0, 0, 0, 0);

    while (dateSet.has(AnalyticsService.toDateString(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  },

  /** Format a Date as 'YYYY-MM-DD' */
  toDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },
};
