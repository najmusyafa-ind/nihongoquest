// src/features/quiz/QuizRepository.ts
// DATA ACCESS ONLY â€” no business logic here
// Fetches flashcard data needed to build quiz questions and distractors.
// Reuses VocabularyRepository to avoid duplicating query logic (DRY).

import { VocabularyRepository } from '@/features/vocabulary/VocabularyRepository';

import type { Flashcard } from '@/types/entities';

import type { JlptLevel } from '@/types/enums';
import { childLogger } from '@/lib/logger';

const log = childLogger('QuizRepo');



/** Hard cap on quiz size to prevent unbounded queries */
const MAX_QUIZ_SIZE = 50;

export const QuizRepository = {
  /**
   * Get a random set of flashcards to use as quiz questions.
   * @param level - JLPT level to draw questions from
   * @param count - Number of questions (clamped to MAX_QUIZ_SIZE)
   */
  async getQuizCards(level: JlptLevel, count: number): Promise<Flashcard[]> {
    const safeCount = Math.min(count, MAX_QUIZ_SIZE);
    try {
      return await VocabularyRepository.getRandomSample(level, safeCount);
    } catch (error) {
      log.error('[QuizRepository] getQuizCards failed:', error);
      throw error;
    }
  },

  /**
   * Get a pool of candidate cards for wrong-answer distractor generation.
   * Fetches from the SAME level first. If not enough cards exist (<4),
   * fetches from ALL levels as fallback â€” ensuring 4 options always available.
   *
   * @param level - Preferred level for distractors
   * @param excludeIds - IDs to exclude (the correct answer cards)
   * @param needed - Number of distractors needed (usually 3)
   */
  async getDistractorPool(
    level: JlptLevel,
    excludeIds: Set<string>,
    needed: number
  ): Promise<Flashcard[]> {
    const sampleSize = Math.min((needed + excludeIds.size) * 4, MAX_QUIZ_SIZE);

    try {
      // Attempt 1: same level
      const sameLevel = await VocabularyRepository.getRandomSample(level, sampleSize);
      const filtered = sameLevel.filter(c => !excludeIds.has(c.id));
      if (filtered.length >= needed) {
        return filtered;
      }

      // Fallback: fetch from N5 (largest pool) if same-level pool is too small
      const fallbackLevel: JlptLevel = level === 'N5' ? 'N4' : 'N5';
      const fallback = await VocabularyRepository.getRandomSample(fallbackLevel, sampleSize);
      const combined = [...filtered, ...fallback.filter(c => !excludeIds.has(c.id))];

      return combined;
    } catch (error) {
      log.error('[QuizRepository] getDistractorPool failed:', error);
      throw error;
    }
  },
};






