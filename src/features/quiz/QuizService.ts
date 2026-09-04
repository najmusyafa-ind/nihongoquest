// src/features/quiz/QuizService.ts
// BUSINESS LOGIC — builds QuizQuestion[] from flashcard data
// Pure functions. No DB imports. No HTTP concerns.

import { QuizRepository } from './QuizRepository';
import type { QuizQuestion, StartQuizInput } from '@/types/quiz.types';
import type { Flashcard } from '@/types/entities';
import type { JlptLevel } from '@/types/enums';

/** Min/max question count per session */
const MIN_QUIZ_COUNT = 5;
const MAX_QUIZ_COUNT = 50;

/** Number of answer options per question (always 4) */
const OPTIONS_COUNT = 4;

export const QuizService = {
  /**
   * Generate a set of multiple-choice quiz questions from flashcards.
   *
   * Algorithm:
   * 1. Fetch `count` random cards from the requested level (quiz cards).
   * 2. For each quiz card, fetch a pool of distractors (wrong answers) from same level.
   * 3. Build 4 shuffled options: 1 correct + 3 distractors.
   * 4. Return typed QuizQuestion[].
   *
   * @param input - Validated StartQuizInput { level, count }
   * @returns Array of QuizQuestion
   */
  async generateQuiz(input: StartQuizInput): Promise<QuizQuestion[]> {
    const count = QuizService.clampCount(input.count);

    // Batch fetch: quiz cards for the requested level
    const quizCards = await QuizRepository.getQuizCards(input.level, count);

    if (quizCards.length === 0) {
      throw new Error(`No flashcards available for level ${input.level}.`);
    }

    // Build Set of quiz card IDs for distractor exclusion
    const quizCardIds = new Set(quizCards.map(c => c.id));

    // Batch fetch: distractor pool — one call for the whole quiz set
    const distractorPool = await QuizRepository.getDistractorPool(
      input.level,
      quizCardIds,
      quizCards.length * (OPTIONS_COUNT - 1)  // 3 distractors × N questions
    );

    // Build questions — pure function, no DB calls
    return quizCards.map((card) =>
      QuizService.buildQuestion(card, distractorPool, input.level)
    );
  },

  /**
   * Build a single QuizQuestion from a flashcard and a distractor pool.
   * Shuffles distractor pool and picks 3 unique wrong answers.
   * The correct answer is the Indonesian meaning (meaningId).
   */
  buildQuestion(
    card: Flashcard,
    distractorPool: Flashcard[],
    level: JlptLevel
  ): QuizQuestion {
    const correctAnswer = card.meaningId;

    // Pick 3 distractors (different meaningId from correct answer)
    const distractors = QuizService.pickDistractors(
      distractorPool,
      correctAnswer,
      card.id,
      OPTIONS_COUNT - 1
    );

    // Assemble and shuffle 4 options
    const options = QuizService.shuffleArray([correctAnswer, ...distractors]) as
      [string, string, string, string];

    return {
      id: card.id,
      kanji: card.kanji,
      hiragana: card.hiragana,
      correctAnswer,
      options,
      level,
    };
  },

  /**
   * Pick N unique distractor answers from a pool.
   * Excludes the correct answer and the source card itself.
   * Falls back to placeholder text if pool is exhausted (edge case).
   */
  pickDistractors(
    pool: Flashcard[],
    correctAnswer: string,
    sourceCardId: string,
    needed: number
  ): string[] {
    const seen = new Set<string>([correctAnswer]);
    const distractors: string[] = [];

    // Shuffle pool defensively (Repository already randomizes, but be safe)
    const shuffled = QuizService.shuffleArray(pool);

    for (const card of shuffled) {
      if (distractors.length >= needed) break;
      if (card.id === sourceCardId) continue;
      if (seen.has(card.meaningId)) continue;

      seen.add(card.meaningId);
      distractors.push(card.meaningId);
    }

    // Edge case: pool exhausted — pad with generic placeholders
    // (Should not happen in practice with N5/N4 data)
    while (distractors.length < needed) {
      distractors.push(`(option ${distractors.length + 2})`);
    }

    return distractors;
  },

  /**
   * Validate and clamp question count to safe range.
   */
  clampCount(rawCount: number): number {
    if (!Number.isInteger(rawCount) || rawCount < MIN_QUIZ_COUNT) {
      return MIN_QUIZ_COUNT;
    }
    return Math.min(rawCount, MAX_QUIZ_COUNT);
  },

  /**
   * Fisher-Yates shuffle — returns a new array, does not mutate.
   */
  shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = shuffled[i];
      const b = shuffled[j];
      if (a !== undefined && b !== undefined) {
        shuffled[i] = b;
        shuffled[j] = a;
      }
    }
    return shuffled;
  },
};
