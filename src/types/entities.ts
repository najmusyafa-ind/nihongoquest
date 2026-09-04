// src/types/entities.ts — TypeScript interfaces synced with db/schema.ts
// IMPORTANT: Keep in sync with docs/schema.md

import type { JlptLevel, GradeResult, SessionStatus } from './enums';

// ─────────────────────────────────────────────────────────────────────────────
// Core Entities
// ─────────────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  displayName: string;
  targetLevel: JlptLevel;
  createdAt: Date;
  updatedAt: Date;
}

export interface Flashcard {
  id: string;
  level: JlptLevel;
  kanji: string | null;
  hiragana: string;
  romaji: string;
  meaningId: string;  // Indonesian meaning
  meaningEn: string;  // English meaning
  exampleJp: string | null;
  exampleId: string | null;
  exampleEn: string | null;
  /**
   * Vocabulary category — present for static vocabulary data (JSON), absent for DB rows.
   * Values: 'verb' | 'noun' | 'adjective-i' | 'adjective-na' | 'adverb' | 'expression' | 'particle'
   */
  category?: string;
  createdAt: Date;
}


export interface AiExplanationCache {
  id: string;
  cacheKey: string;
  prompt: string;
  response: string;
  model: string;
  createdAt: Date;
  hitCount: number;
}

export interface StudySession {
  id: string;       // Client-generated UUID
  userId: string;
  level: JlptLevel;
  status: SessionStatus;
  totalCards: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  startedAt: Date;
  completedAt: Date | null;
}

export interface StudyResult {
  id: string;
  sessionId: string;
  userId: string;
  /** null for QUIZ mode results (ADR-010). Always a UUID for FLASHCARD mode. */
  flashcardId: string | null;
  /** 'FLASHCARD' (default) or 'QUIZ'. Determines which analytics queries include this row. */
  sourceMode: string;
  /** Quiz vocabulary key (e.g. 'taberu'). null for FLASHCARD mode. */
  vocabKey: string | null;
  userAnswer: string;
  result: GradeResult;
  answeredAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Derived / View Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionStats {
  totalCards: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  accuracyInPercent: number; // integer 0-100
  durationInMs: number;
}

export interface LevelProgress {
  level: JlptLevel;
  totalSeen: number;
  totalCorrect: number;
  accuracyInPercent: number;
}

export interface PendingStudySession {
  session: Omit<StudySession, 'completedAt'> & { completedAt: Date };
  results: Omit<StudyResult, 'id' | 'answeredAt'>[];
}
