// src/features/vocabulary/VocabularyRepository.ts
// DATA ACCESS ONLY â€” no business logic here
// Queries: flashcards table with level filter + search + cursor-based pagination

import { db } from '@/lib/db';

import { flashcards } from '../../../db/schema';

import { eq, and, or, ilike, gt, sql } from 'drizzle-orm';

import type { Flashcard } from '@/types/entities';

import type { JlptLevel } from '@/types/enums';
import { childLogger } from '@/lib/logger';

const log = childLogger('VocabRepo');



/** Maximum rows per page â€” hard cap to prevent unbounded queries */
const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;

export interface VocabularyPageResult {
  cards: Flashcard[];
  /** ID of last card in this page â€” pass as cursor for next page. null if no more pages. */
  nextCursor: string | null;
}

export interface VocabularyQueryOptions {
  level?: JlptLevel;
  searchTerm?: string;
  cursor?: string;   // last flashcard.id from previous page
  limit?: number;    // default 20, max 50
}

export const VocabularyRepository = {
  /**
   * Paginated vocabulary fetch with optional level filter and search.
   * Uses cursor-based pagination (keyset) for O(1) performance regardless of offset.
   *
   * @param options - Query options
   * @returns Cards for current page + nextCursor (null if no more pages)
   *
   * âš ï¸ ILIKE search on kanji/hiragana has no GIN index (acceptable for MVP < 1000 rows).
   *    Add GIN index before scaling to N3+ data volume.
   */
  async getPage(options: VocabularyQueryOptions): Promise<VocabularyPageResult> {
    const limit = Math.min(options.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    try {
      // Build WHERE conditions
      const conditions = [];

      if (options.level) {
        conditions.push(eq(flashcards.level, options.level));
      }

      if (options.searchTerm && options.searchTerm.trim().length > 0) {
        const term = `%${options.searchTerm.trim()}%`;
        conditions.push(
          or(
            ilike(flashcards.kanji, term),
            ilike(flashcards.hiragana, term),
            ilike(flashcards.romaji, term),
            ilike(flashcards.meaningId, term),
            ilike(flashcards.meaningEn, term)
          )
        );
      }

      // Cursor: only fetch rows AFTER the cursor card (keyset pagination)
      if (options.cursor) {
        conditions.push(gt(flashcards.id, options.cursor));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Fetch limit + 1 to detect if there's a next page
      const rows = await db
        .select()
        .from(flashcards)
        .where(whereClause)
        .orderBy(flashcards.id)   // stable sort â€” UUID v4 is not time-ordered, but consistent
        .limit(limit + 1);

      const hasNextPage = rows.length > limit;
      const pageRows = hasNextPage ? rows.slice(0, limit) : rows;
      const lastRow = pageRows[pageRows.length - 1];
      const nextCursor = hasNextPage && lastRow ? lastRow.id : null;

      return {
        cards: pageRows as Flashcard[],
        nextCursor,
      };
    } catch (error) {
      log.error('[VocabularyRepository] getPage failed:', error);
      throw error;
    }
  },

  /**
   * Get multiple flashcards by their IDs (used by QuizRepository for distractors).
   * Bounded by ids.length â€” caller must ensure this is â‰¤ 50.
   */
  async getByIds(ids: string[]): Promise<Flashcard[]> {
    if (ids.length === 0) return [];
    if (ids.length > MAX_PAGE_SIZE) {
      throw new Error(`[VocabularyRepository] getByIds: too many IDs (${ids.length}), max ${MAX_PAGE_SIZE}`);
    }
    try {
      return await db
        .select()
        .from(flashcards)
        .where(
          sql`${flashcards.id} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}]::uuid[])`
        ) as Flashcard[];
    } catch (error) {
      log.error('[VocabularyRepository] getByIds failed:', error);
      throw error;
    }
  },

  /**
   * Get a random sample of cards from a level (used by QuizService for distractor generation).
   */
  async getRandomSample(level: JlptLevel, count: number): Promise<Flashcard[]> {
    const safeCount = Math.min(count, MAX_PAGE_SIZE);
    try {
      return await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.level, level))
        .orderBy(sql`RANDOM()`)
        .limit(safeCount) as Flashcard[];
    } catch (error) {
      log.error('[VocabularyRepository] getRandomSample failed:', error);
      throw error;
    }
  },
};






