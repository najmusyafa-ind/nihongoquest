// src/features/flashcard/FlashcardService.ts
// BUSINESS LOGIC — calls Repository, never DB directly

import { FlashcardRepository } from './FlashcardRepository';
import { getDemoCards } from '@/lib/demo-data';
import type { Flashcard } from '@/types/entities';
import type { JlptLevel } from '@/types/enums';
import { childLogger } from '@/lib/logger';

const log = childLogger('FlashcardSvc');

/**
 * Valid cards-per-session options (matches settingsStore.CardsPerSession).
 * Server cannot read Zustand store — the client MUST pass the count from settingsStore.
 */
const MIN_SESSION_CARDS = 5;
const MAX_SESSION_CARDS = 50;

export const FlashcardService = {
  /**
   * Get a shuffled set of flashcards for a study session.
   * Falls back to demo data if DB is unreachable (table not seeded, connection error).
   *
   * @param level - JLPT level to draw from
   * @param count - Number of cards. Caller (client via API route) MUST pass
   *               `cardsPerSession` from `useSettingsStore()`. Defaults to 20
   *               if omitted (e.g. in tests). Clamped to [5, 50].
   */
  async getSessionCards(level: JlptLevel, count = 20): Promise<Flashcard[]> {
    const cardCount = Math.max(MIN_SESSION_CARDS, Math.min(count, MAX_SESSION_CARDS));
    try {
      const cards = await FlashcardRepository.getRandomByLevel(level, cardCount);
      // If DB returned empty (table not seeded), fall through to demo data
      if (cards.length > 0) {
        return FlashcardService.shuffle(cards);
      }
      log.warn('[FlashcardService] DB returned 0 cards — falling back to demo data', { level });
    } catch (error) {
      // DB unreachable (table missing, connection error, etc.) — degrade gracefully
      log.warn('[FlashcardService] DB query failed — falling back to demo data', { level, error });
    }

    // Graceful fallback: use demo cards so the study session can still start
    const demoLevel = (level === 'N5' || level === 'N4') ? level : 'N5';
    return FlashcardService.shuffle(getDemoCards(demoLevel, cardCount));
  },


  /**
   * Get all cards for a level (for offline caching).
   */
  async getAllForLevel(level: JlptLevel): Promise<Flashcard[]> {
    return FlashcardRepository.getByLevel(level);
  },

  /**
   * Get card count per level.
   */
  async getCardCount(level: JlptLevel): Promise<number> {
    return FlashcardRepository.countByLevel(level);
  },

  /**
   * Fisher-Yates shuffle algorithm.
   * Returns a new shuffled array (does not mutate original).
   */
  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // Safe swap with explicit index checks
      const temp = shuffled[i];
      const swapTarget = shuffled[j];
      if (temp !== undefined && swapTarget !== undefined) {
        shuffled[i] = swapTarget;
        shuffled[j] = temp;
      }
    }
    return shuffled;
  },
};
