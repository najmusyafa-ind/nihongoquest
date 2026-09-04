// src/types/enums.ts — Const enums for NihongoQuest
// Must stay in sync with db/schema.ts enum definitions

export const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;
export type JlptLevel = (typeof JLPT_LEVELS)[number];

export const GRADE_RESULTS = ['CORRECT', 'INCORRECT', 'SKIPPED'] as const;
export type GradeResult = (typeof GRADE_RESULTS)[number];

export const SESSION_STATUSES = ['ACTIVE', 'COMPLETED', 'ABANDONED'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const LANGUAGES = ['en', 'ja'] as const;
export type Language = (typeof LANGUAGES)[number];
