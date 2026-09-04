// src/features/study-session/StudySessionService.ts
// Blind grading logic + session lifecycle management

import { StudySessionRepository } from './StudySessionRepository';

import { checkRomajiAnswer, formatAccuracy } from '@/lib/format';

import { toast } from 'sonner';

import type { Flashcard, StudySession, StudyResult, SessionStats } from '@/types/entities';

import type { GradeResult, JlptLevel } from '@/types/enums';
import { childLogger } from '@/lib/logger';

const log = childLogger('SessionSvc');



export interface GradeAnswerResult {
  result: GradeResult;
  isCorrect: boolean;
}

export const StudySessionService = {
  /**
   * Start a new study session.
   * Session ID is generated on client (ADR-005: idempotency).
   */
  async startSession(params: {
    userId: string;
    level: JlptLevel;
    cards: Flashcard[];
  }): Promise<StudySession> {
    const sessionId = crypto.randomUUID();
    
    try {
      const session = await StudySessionRepository.createSession({
        id: sessionId,
        userId: params.userId,
        level: params.level,
        totalCards: params.cards.length,
        startedAt: new Date(),
      });
      
      return session;
    } catch (error) {
      log.error('[StudySessionService] startSession failed:', error);
      toast.error('Failed to start session. Please try again.');
      throw error;
    }
  },

  /**
   * Grade a blind answer (Blind Grading â€” ADR: user types BEFORE seeing answer).
   * Returns grade result without saving â€” call saveResult() separately.
   */
  gradeAnswer(userInput: string, card: Flashcard): GradeAnswerResult {
    if (!userInput.trim()) {
      return { result: 'SKIPPED', isCorrect: false };
    }
    
    const isCorrect = checkRomajiAnswer(userInput, card.romaji);
    return {
      result: isCorrect ? 'CORRECT' : 'INCORRECT',
      isCorrect,
    };
  },

  /**
   * Save the result of a graded card to the database.
   */
  async saveResult(params: {
    sessionId: string;
    userId: string;
    flashcardId: string;
    userAnswer: string;
    result: GradeResult;
  }): Promise<StudyResult> {
    try {
      return await StudySessionRepository.addResult(params);
    } catch (error) {
      log.error('[StudySessionService] saveResult failed:', error);
      // Don't toast here â€” caller handles UX (session might be offline)
      throw error;
    }
  },

  /**
   * Finalize and complete a study session.
   */
  async finalizeSession(
    sessionId: string,
    results: Array<{ result: GradeResult }>
  ): Promise<SessionStats> {
    const correctCount = results.filter(r => r.result === 'CORRECT').length;
    const incorrectCount = results.filter(r => r.result === 'INCORRECT').length;
    const skippedCount = results.filter(r => r.result === 'SKIPPED').length;
    const total = results.length;
    
    try {
      await StudySessionRepository.completeSession(sessionId, {
        correctCount,
        incorrectCount,
        skippedCount,
      });
    } catch (error) {
      log.error('[StudySessionService] finalizeSession failed:', error);
      // Don't throw â€” we still return stats even if DB fails
    }
    
    return {
      totalCards: total,
      correctCount,
      incorrectCount,
      skippedCount,
      accuracyInPercent: formatAccuracy(correctCount, total),
      durationInMs: 0, // calculated by caller using session start time
    };
  },

  /**
   * Get session history for the dashboard.
   * Supports cursor-based pagination to prevent unbounded queries (F4).
   * @param userId  - target user
   * @param limit   - max records per page (default 20, clamped to 100 in repo)
   * @param cursor  - Date of last seen `startedAt` (exclusive lower bound for next page)
   */
  async getHistory(userId: string, limit = 20, cursor?: Date): Promise<StudySession[]> {
    try {
      return await StudySessionRepository.getSessionsByUser(userId, limit, cursor);
    } catch (error) {
      log.error('[StudySessionService] getHistory failed:', error);
      toast.error('Failed to load history.');
      return [];
    }
  },
};






