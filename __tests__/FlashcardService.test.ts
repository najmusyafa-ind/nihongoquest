// __tests__/FlashcardService.test.ts — Unit tests for FlashcardService

import { describe, it, expect } from 'vitest';
import { FlashcardService } from '@/features/flashcard/FlashcardService';

describe('FlashcardService.shuffle', () => {
  it('returns array with same length', () => {
    const input = [1, 2, 3, 4, 5];
    const result = FlashcardService.shuffle(input);
    expect(result).toHaveLength(5);
  });

  it('contains all original elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = FlashcardService.shuffle(input);
    expect(result.sort()).toEqual(input.sort());
  });

  it('does not mutate the original array', () => {
    const input = [1, 2, 3, 4, 5];
    const original = [...input];
    FlashcardService.shuffle(input);
    expect(input).toEqual(original);
  });

  it('handles empty array', () => {
    expect(FlashcardService.shuffle([])).toEqual([]);
  });

  it('handles single element array', () => {
    expect(FlashcardService.shuffle([42])).toEqual([42]);
  });
});
