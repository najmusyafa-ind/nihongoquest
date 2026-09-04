// src/types/quiz.types.ts — Shared types for Quiz + Analytics domain
// Synced with Handoff Contract in task.md
// IMPORTANT: Keep in sync with QuizService.ts and AnalyticsService.ts

import type { JlptLevel } from './enums';

// ─────────────────────────────────────────────────────────────────────────────
// Quiz Domain
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single multiple-choice quiz question generated from a flashcard.
 * options[] contains exactly 4 entries (shuffled), including correctAnswer.
 */
export interface QuizQuestion {
  /** Source flashcard ID */
  id: string;
  kanji: string | null;
  hiragana: string;
  /** The correct Indonesian meaning (meaningId from flashcard) */
  correctAnswer: string;
  /** 4 options (shuffled) — correctAnswer is one of them */
  options: [string, string, string, string];
  level: JlptLevel;
}

/**
 * POST /api/quiz/start request body (validated with Zod in route)
 */
export interface StartQuizInput {
  level: JlptLevel;
  /** Number of questions — default 10. Must be 5–50. */
  count: number;
}

/**
 * POST /api/quiz/start response shape
 */
export interface StartQuizResponse {
  questions: QuizQuestion[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Domain
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A word the user frequently gets wrong.
 * Derived from study_results JOIN flashcards.
 */
export interface WeakWord {
  flashcardId: string;
  kanji: string | null;
  hiragana: string;
  meaningId: string;
  /** Total INCORRECT answers for this card (across all sessions) */
  errorCount: number;
  /** Timestamp of most recent incorrect attempt */
  lastAttempted: Date;
}

/**
 * Per-level accuracy stat.
 */
export interface LevelAccuracy {
  level: JlptLevel;
  /** Integer 0–100 */
  accuracyInPercent: number;
  totalAnswered: number;
}

/**
 * Full response shape for GET /api/analytics/summary
 */
export interface AnalyticsSummary {
  /** Accuracy per JLPT level — only levels with data are present */
  accuracyByLevel: Partial<Record<JlptLevel, LevelAccuracy>>;
  /** Top 10 most frequently missed words */
  weakWords: WeakWord[];
  /** Current consecutive study day streak */
  streakDays: number;
  /** Total completed study sessions */
  totalSessions: number;
  /** Total individual card answers submitted */
  totalCardsStudied: number;
}
