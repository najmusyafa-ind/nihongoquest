// src/lib/format.ts — Utility functions for NihongoQuest

/**
 * Format a date to localized string.
 * @param date - Date to format
 * @param lang - 'en' or 'ja'
 */
export function formatDate(date: Date, lang: 'en' | 'ja' = 'en'): string {
  const locale = lang === 'ja' ? 'ja-JP' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Format duration from milliseconds to human-readable string.
 * @param ms - Duration in milliseconds
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

/**
 * Format Japanese text with proper font class.
 * Returns the display string for a flashcard based on available writing systems.
 * Priority: kanji → hiragana
 */
export function formatJapaneseDisplay(kanji: string | null, hiragana: string): string {
  return kanji ?? hiragana;
}

/**
 * Normalize user input for romaji comparison.
 * Trims, lowercases, and removes common punctuation.
 */
export function normalizeRomaji(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['-]/g, '') // remove apostrophes and hyphens (e.g., o'kii → ookii)
    .replace(/\s+/g, ''); // remove spaces
}

/**
 * Check if user's romaji answer is correct.
 * Case-insensitive, handles common variants.
 */
export function checkRomajiAnswer(userInput: string, correctRomaji: string): boolean {
  const normalized = normalizeRomaji(userInput);
  const correct = normalizeRomaji(correctRomaji);
  
  if (normalized === correct) return true;
  
  // Common romaji alternates
  const alternates: Record<string, string[]> = {
    'oo': ['ou', 'o'],
    'uu': ['u'],
    'shi': ['si', 'sy'],
    'chi': ['ti'],
    'tsu': ['tu'],
    'fu': ['hu'],
    'ji': ['zi', 'di'],
    'zu': ['du'],
    'sha': ['sya'],
    'shu': ['syu'],
    'sho': ['syo'],
  };
  
  // Check if normalized matches any alternate form of the correct answer
  for (const [canonical, variants] of Object.entries(alternates)) {
    const correctWithAlts = [correct, ...variants.map(v => correct.replace(canonical, v))];
    if (correctWithAlts.includes(normalized)) return true;
  }
  
  return false;
}

/**
 * Format accuracy as integer percentage.
 */
export function formatAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}
