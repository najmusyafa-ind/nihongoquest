// __tests__/format.test.ts — Unit tests for format utilities

import { describe, it, expect } from 'vitest';
import {
  normalizeRomaji,
  checkRomajiAnswer,
  formatAccuracy,
  formatDuration,
} from '@/lib/format';

describe('normalizeRomaji', () => {
  it('lowercases and trims input', () => {
    expect(normalizeRomaji('  TABERU  ')).toBe('taberu');
  });

  it('removes apostrophes', () => {
    expect(normalizeRomaji("ta'beru")).toBe('taberu');
  });
});

describe('checkRomajiAnswer', () => {
  it('returns true for exact match', () => {
    expect(checkRomajiAnswer('taberu', 'taberu')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(checkRomajiAnswer('TABERU', 'taberu')).toBe(true);
  });

  it('handles leading/trailing spaces', () => {
    expect(checkRomajiAnswer('  taberu  ', 'taberu')).toBe(true);
  });

  it('returns false for wrong answer', () => {
    expect(checkRomajiAnswer('nomu', 'taberu')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(checkRomajiAnswer('', 'taberu')).toBe(false);
  });
});

describe('formatAccuracy', () => {
  it('calculates correct percentage', () => {
    expect(formatAccuracy(8, 10)).toBe(80);
  });

  it('returns 0 for zero total', () => {
    expect(formatAccuracy(0, 0)).toBe(0);
  });

  it('rounds correctly', () => {
    expect(formatAccuracy(1, 3)).toBe(33);
  });
});

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(30000)).toBe('30s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(90000)).toBe('1m 30s');
  });

  it('formats zero duration', () => {
    expect(formatDuration(0)).toBe('0s');
  });
});
