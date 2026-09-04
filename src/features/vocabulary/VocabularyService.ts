// src/features/vocabulary/VocabularyService.ts
// BUSINESS LOGIC — vocabulary browser uses StaticVocabularyRepository (JSON files)
// SRS study sessions continue to use VocabularyRepository (Supabase flashcards table)

import {
  StaticVocabularyRepository,
  type StaticVocabularyPageResult,
} from './StaticVocabularyRepository';
import type { JlptLevel } from '@/types/enums';

/** Validated, normalized input for vocabulary page fetch */
export interface VocabularyQueryInput {
  level?:      JlptLevel;
  category?:   string;
  searchTerm?: string;
  page:        number;
  /** Clamped to 1–100 */
  limit:       number;
}

/** Valid JLPT levels as a Set for O(1) lookup */
const VALID_LEVELS = new Set<JlptLevel>(['N5', 'N4', 'N3', 'N2', 'N1']);

export const VocabularyService = {
  /**
   * Fetch a paginated page of vocabulary cards from the curated static dataset.
   * This is the vocabulary browser (reference/LKS module) — NOT the SRS deck.
   *
   * @throws {Error} with user-facing message if input is invalid
   */
  async getVocabularyPage(
    rawLevel?:    string,
    rawSearch?:   string,
    rawCursor?:   string,   // cursor = page number string for static data
    rawLimit?:    string,
    rawCategory?: string,
  ): Promise<StaticVocabularyPageResult> {
    const input = VocabularyService.parseAndValidate(
      rawLevel, rawSearch, rawCursor, rawLimit, rawCategory
    );

    return StaticVocabularyRepository.getPage({
      level:      input.level,
      category:   input.category,
      searchTerm: input.searchTerm,
      page:       input.page,
      limit:      input.limit,
    });
  },

  /** Get progress info (loaded vs target) for the progress bar */
  async getProgress(rawLevel?: string): Promise<{ loaded: number; target: number }> {
    let level: JlptLevel | undefined;
    if (rawLevel && VALID_LEVELS.has(rawLevel as JlptLevel)) {
      level = rawLevel as JlptLevel;
    }
    return StaticVocabularyRepository.getTargetCount(level);
  },

  /** Get available category labels for the filter chips */
  async getCategories(rawLevel?: string): Promise<string[]> {
    let level: JlptLevel | undefined;
    if (rawLevel && VALID_LEVELS.has(rawLevel as JlptLevel)) {
      level = rawLevel as JlptLevel;
    }
    return StaticVocabularyRepository.getCategories(level);
  },

  /**
   * Parse raw query string values and validate/normalize them.
   */
  parseAndValidate(
    rawLevel?:    string,
    rawSearch?:   string,
    rawCursor?:   string,
    rawLimit?:    string,
    rawCategory?: string,
  ): VocabularyQueryInput {
    // Validate level
    let level: JlptLevel | undefined;
    if (rawLevel !== undefined && rawLevel !== '') {
      if (!VALID_LEVELS.has(rawLevel as JlptLevel)) {
        throw new Error(`Invalid JLPT level: "${rawLevel}". Must be one of N5, N4, N3, N2, N1.`);
      }
      level = rawLevel as JlptLevel;
    }

    // Sanitize search term — strip whitespace, max 100 chars
    const searchTerm = rawSearch ? rawSearch.trim().slice(0, 100) : undefined;

    // Category — lowercase, strip whitespace
    const category = rawCategory ? rawCategory.trim().toLowerCase() : undefined;

    // Page number — cursor is reused as page number for static data
    let page = 1;
    if (rawCursor) {
      const parsed = parseInt(rawCursor, 10);
      if (!isNaN(parsed) && parsed > 0) page = parsed;
    }

    // Limit: clamp to 1–100, default 30
    let limit = 30;
    if (rawLimit !== undefined) {
      const parsed = parseInt(rawLimit, 10);
      if (!isNaN(parsed)) {
        limit = Math.max(1, Math.min(parsed, 100));
      }
    }

    return { level, searchTerm, category, page, limit };
  },
};
