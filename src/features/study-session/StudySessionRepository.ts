// src/features/study-session/StudySessionRepository.ts
// APPEND-ONLY: INSERT only. No UPDATE, no DELETE.

import { db } from '@/lib/db';

import { studySessions, studyResults } from '../../../db/schema';

import { eq, desc, lt, and } from 'drizzle-orm';


import type { StudySession, StudyResult, PendingStudySession } from '@/types/entities';
import { childLogger } from '@/lib/logger';

const log = childLogger('SessionRepo');



export const StudySessionRepository = {
  /**
   * Create a new study session.
   * ID must be pre-generated on the client (ADR-005: idempotency).
   */
  async createSession(session: {
    id: string;
    userId: string;
    level: StudySession['level'];
    totalCards: number;
    startedAt: Date;
  }): Promise<StudySession> {
    try {
      const results = await db
        .insert(studySessions)
        .values({
          id: session.id,
          userId: session.userId,
          level: session.level,
          status: 'ACTIVE',
          totalCards: session.totalCards,
          correctCount: 0,
          incorrectCount: 0,
          skippedCount: 0,
          startedAt: session.startedAt,
        })
        .returning();
      
      const created = results[0];
      if (!created) throw new Error('Failed to create study session');
      return created;
    } catch (error) {
      log.error('[StudySessionRepository] createSession failed:', error);
      throw error;
    }
  },

  /**
   * Add a single study result (one card answer).
   * APPEND-ONLY — never updates existing results.
   *
   * ADR-010: flashcardId is nullable to support Quiz mode.
   * - FLASHCARD mode: flashcardId = UUID, sourceMode = 'FLASHCARD', vocabKey = null
   * - QUIZ mode:      flashcardId = null, sourceMode = 'QUIZ', vocabKey = 'taberu'
   */
  async addResult(result: {
    sessionId: string;
    userId: string;
    flashcardId: string | null;  // null for QUIZ mode (ADR-010)
    sourceMode?: 'FLASHCARD' | 'QUIZ';
    vocabKey?: string | null;
    userAnswer: string;
    result: StudyResult['result'];
  }): Promise<StudyResult> {
    try {
      const results = await db
        .insert(studyResults)
        .values({
          sessionId:   result.sessionId,
          userId:      result.userId,
          flashcardId: result.flashcardId ?? null,
          sourceMode:  result.sourceMode ?? 'FLASHCARD',
          vocabKey:    result.vocabKey ?? null,
          userAnswer:  result.userAnswer,
          result:      result.result,
        })
        .returning();
      
      const created = results[0];
      if (!created) throw new Error('Failed to add study result');
      return created;
    } catch (error) {
      log.error('[StudySessionRepository] addResult failed:', error);
      throw error;
    }
  },

  /**
   * Complete a session — UPDATE status + counts on a previously INSERT-ed row.
   *
   * ── ADR-002 EXCEPTION (Documented) ──────────────────────────────────────────
   * NihongoQuest enforces APPEND-ONLY data (study_sessions, study_results).
   * This method is the SOLE PERMITTED UPDATE on `study_sessions`, because:
   *   1. A session is first INSERTed with status='IN_PROGRESS' when it starts.
   *   2. It must be finalized (status='COMPLETED') when the user finishes.
   *   3. Finalizing is a single atomic state transition — not a content mutation.
   *
   * What IS allowed: status, correctCount, incorrectCount, skippedCount, completedAt.
   * What is NEVER allowed: retroactively changing userId, level, startedAt, or totalCards.
   *
   * NOTE: The /api/sessions POST route (used by quiz and offline sync) bypasses this
   * method entirely by INSERTing directly with status='COMPLETED', which is the
   * preferred append-only pattern. This method is only used by the live StudySession flow.
   */
  async completeSession(
    sessionId: string,
    counts: { correctCount: number; incorrectCount: number; skippedCount: number }
  ): Promise<void> {
    try {
      await db
        .update(studySessions)
        .set({
          status: 'COMPLETED',
          correctCount: counts.correctCount,
          incorrectCount: counts.incorrectCount,
          skippedCount: counts.skippedCount,
          completedAt: new Date(),
        })
        .where(eq(studySessions.id, sessionId));
    } catch (error) {
      log.error('[StudySessionRepository] completeSession failed:', error);
      throw error;
    }
  },

  /**
   * Get a user's study session history, newest first.
   * Supports cursor-based pagination for unbounded result protection.
   * @param userId  - target user
   * @param limit   - max records per page (default 20, max 100)
   * @param cursor  - ISO timestamp of last seen `startedAt` (exclusive, for next page)
   */
  async getSessionsByUser(
    userId: string,
    limit = 20,
    cursor?: Date
  ): Promise<StudySession[]> {
    try {
      const safeLimit = Math.min(Math.max(1, limit), 100); // clamp between 1–100
      const whereClause = cursor
        ? and(eq(studySessions.userId, userId), lt(studySessions.startedAt, cursor))
        : eq(studySessions.userId, userId);

      return await db
        .select()
        .from(studySessions)
        .where(whereClause)
        .orderBy(desc(studySessions.startedAt))
        .limit(safeLimit);
    } catch (error) {
      log.error('[StudySessionRepository] getSessionsByUser failed:', error);
      throw error;
    }
  },


  /**
   * Get all results for a specific session.
   */
  async getResultsBySession(sessionId: string): Promise<StudyResult[]> {
    try {
      // B-4 fix: .limit(100) guards against unbounded query on large datasets.
      // Max session size is 50 cards (clamped in API), so 100 is a safe upper bound.
      return await db
        .select()
        .from(studyResults)
        .where(eq(studyResults.sessionId, sessionId))
        .limit(100);
    } catch (error) {
      log.error('[StudySessionRepository] getResultsBySession failed:', error);
      throw error;
    }
  },

  /**
   * Sync a pending offline session to the database.
   * Uses upsert to handle idempotency.
   */
  async syncOfflineSession(pending: PendingStudySession): Promise<void> {
    try {
      // Insert session (ignore if already exists â€” idempotent)
      await db
        .insert(studySessions)
        .values(pending.session)
        .onConflictDoNothing();

      // Insert results (ignore if already exists)
      if (pending.results.length > 0) {
        await db
          .insert(studyResults)
          .values(pending.results.map(r => ({ ...r, id: crypto.randomUUID() })))
          .onConflictDoNothing();
      }
    } catch (error) {
      log.error('[StudySessionRepository] syncOfflineSession failed:', error);
      throw error;
    }
  },
};






