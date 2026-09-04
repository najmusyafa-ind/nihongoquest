// src/features/vocabulary/StaticVocabularyRepository.ts
// DATA ACCESS — reads from curated static JSON datasets (N5, N4)
// This is the authoritative source for the Vocabulary Browser (reference/LKS module).
// The flashcards DB table is for SRS study tracking — a separate concern.

import type { Flashcard } from '@/types/entities';
import type { JlptLevel } from '@/types/enums';

// ── Raw JSON shape (vocabulary-n5.json, vocabulary-n4.json) ──────────────────
interface RawVocabEntry {
  kanji?:      string | null;
  hiragana:    string;
  romaji:      string;
  meaningId:   string;
  meaningEn:   string;
  category:    string;
  exampleJp?:  string;
  exampleId?:  string;
  exampleEn?:  string;
}

// ── Lazy-loaded datasets (only loaded once, cached in module scope) ───────────
let _n5Cache: Flashcard[] | null = null;
let _n4Cache: Flashcard[] | null = null;

function toFlashcard(raw: RawVocabEntry, level: JlptLevel, index: number): Flashcard {
  return {
    id:        `static-${level.toLowerCase()}-${String(index + 1).padStart(4, '0')}`,
    level,
    kanji:     raw.kanji ?? null,
    hiragana:  raw.hiragana,
    romaji:    raw.romaji,
    meaningId: raw.meaningId,
    meaningEn: raw.meaningEn,
    category:  raw.category,
    exampleJp: raw.exampleJp ?? null,
    exampleId: raw.exampleId ?? null,
    exampleEn: raw.exampleEn ?? null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
  };
}

async function loadLevel(level: JlptLevel): Promise<Flashcard[]> {
  if (level === 'N5') {
    if (!_n5Cache) {
      const raw = (await import('@/data/vocabulary-n5.json')) as { default: RawVocabEntry[] };
      _n5Cache = raw.default.map((entry, i) => toFlashcard(entry, 'N5', i));
    }
    return _n5Cache;
  }
  if (level === 'N4') {
    if (!_n4Cache) {
      try {
        const raw = (await import('@/data/vocabulary-n4.json')) as { default: RawVocabEntry[] };
        _n4Cache = raw.default.map((entry, i) => toFlashcard(entry, 'N4', i));
      } catch {
        // N4 data not yet available — return empty
        _n4Cache = [];
      }
    }
    return _n4Cache;
  }
  return [];
}

async function getAllCards(): Promise<Flashcard[]> {
  const [n5, n4] = await Promise.all([loadLevel('N5'), loadLevel('N4')]);
  return [...n5, ...n4];
}

// ── Exported Repository ───────────────────────────────────────────────────────

export interface StaticVocabularyPageResult {
  cards:      Flashcard[];
  nextCursor: string | null;
  total:      number;   // total matching rows — used for progress bar
}

export interface StaticVocabularyQueryOptions {
  level?:      JlptLevel;
  category?:   string;
  searchTerm?: string;
  /** Page number, 1-indexed */
  page?:       number;
  limit?:      number;
}

const DEFAULT_LIMIT = 30;
const MAX_LIMIT     = 100;

export const StaticVocabularyRepository = {
  /**
   * Return total word count per level (for progress bar).
   * N5 target: 800, N4 target: 600 (standard JLPT)
   */
  async getTargetCount(level?: JlptLevel): Promise<{ loaded: number; target: number }> {
    const data = level ? await loadLevel(level) : await getAllCards();
    const targets: Record<string, number> = { N5: 800, N4: 600, N3: 1000, N2: 1500, N1: 2000 };
    const target = level ? (targets[level] ?? 800) : 800;
    return { loaded: data.length, target };
  },

  /**
   * Paginated vocabulary fetch with search, level, and category filters.
   * All filtering is in-memory (dataset ≤ 3000 rows — acceptable).
   */
  async getPage(options: StaticVocabularyQueryOptions): Promise<StaticVocabularyPageResult> {
    const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const page  = Math.max(1, options.page ?? 1);

    // 1. Load raw dataset
    let data = options.level ? await loadLevel(options.level) : await getAllCards();

    // 2. Filter by category
    if (options.category && options.category !== 'all') {
      const cat = options.category.toLowerCase();
      data = data.filter(c => c.category?.toLowerCase() === cat);
    }

    // 3. Filter by search term (kanji, hiragana, romaji, meaning)
    if (options.searchTerm && options.searchTerm.trim().length > 0) {
      const term = options.searchTerm.trim().toLowerCase();
      data = data.filter(c =>
        c.hiragana.toLowerCase().includes(term)  ||
        c.romaji.toLowerCase().includes(term)    ||
        c.meaningId.toLowerCase().includes(term) ||
        c.meaningEn.toLowerCase().includes(term) ||
        (c.kanji?.toLowerCase().includes(term) ?? false)
      );
    }

    // 4. Total after filtering (for UI feedback)
    const total = data.length;

    // 5. Paginate
    const start   = (page - 1) * limit;
    const end     = start + limit;
    const pageRows = data.slice(start, end);
    const hasNext  = end < total;

    // nextCursor encodes the page number for the client
    const nextCursor = hasNext ? String(page + 1) : null;

    return { cards: pageRows, nextCursor, total };
  },

  /**
   * Return all available categories for a given level (or all levels).
   * Used to populate the category filter chips.
   */
  async getCategories(level?: JlptLevel): Promise<string[]> {
    const data = level ? await loadLevel(level) : await getAllCards();
    const cats = new Set(data.map(c => c.category).filter((c): c is string => typeof c === 'string'));
    // Return in display order
    const order = ['verb', 'noun', 'adjective-i', 'adjective-na', 'adverb', 'expression', 'particle', 'conjunction'];
    return [...order.filter(c => cats.has(c)), ...Array.from(cats).filter(c => !order.includes(c))];
  },
};
