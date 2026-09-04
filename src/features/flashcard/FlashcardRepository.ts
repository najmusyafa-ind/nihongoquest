// src/features/flashcard/FlashcardRepository.ts
// DATA ACCESS ONLY â€” no business logic here

import { db } from '@/lib/db';

import { flashcards } from '../../../db/schema';

import { eq, sql } from 'drizzle-orm';

import type { Flashcard } from '@/types/entities';

import type { JlptLevel } from '@/types/enums';
import { childLogger } from '@/lib/logger';

const log = childLogger('FlashcardRepo');



export const FlashcardRepository = {
  /**
   * Get all flashcards for a given JLPT level.
   */
  async getByLevel(level: JlptLevel): Promise<Flashcard[]> {
    try {
      return await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.level, level));
    } catch (error) {
      log.error('[FlashcardRepository] getByLevel failed:', error);
      throw error;
    }
  },

  /**
   * Get a random sample of flashcards for a given level.
   * @param level - JLPT level
   * @param count - Number of cards to return
   */
  async getRandomByLevel(level: JlptLevel, count: number): Promise<Flashcard[]> {
    try {
      return await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.level, level))
        .orderBy(sql`RANDOM()`)
        .limit(count);
    } catch (error) {
      log.error('[FlashcardRepository] getRandomByLevel failed:', error);
      throw error;
    }
  },

  /**
   * Get a single flashcard by ID.
   */
  async getById(id: string): Promise<Flashcard | null> {
    try {
      const results = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.id, id))
        .limit(1);
      return results[0] ?? null;
    } catch (error) {
      log.error('[FlashcardRepository] getById failed:', error);
      throw error;
    }
  },

  /**
   * Count total cards for a given level.
   */
  async countByLevel(level: JlptLevel): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(flashcards)
        .where(eq(flashcards.level, level));
      return result[0]?.count ?? 0;
    } catch (error) {
      log.error('[FlashcardRepository] countByLevel failed:', error);
      throw error;
    }
  },
};






