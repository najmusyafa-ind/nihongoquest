// db/schema.ts — Source of Truth for NihongoQuest database schema
// DO NOT modify without updating docs/schema.md first

import { pgEnum, pgTable, uuid, text, timestamp, integer, boolean, uniqueIndex } from 'drizzle-orm/pg-core';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const jlptLevel = pgEnum('jlpt_level', ['N5', 'N4', 'N3', 'N2', 'N1']);
export const gradeResult = pgEnum('grade_result', ['CORRECT', 'INCORRECT', 'SKIPPED']);
export const sessionStatus = pgEnum('session_status', ['ACTIVE', 'COMPLETED', 'ABANDONED']);

// ─────────────────────────────────────────────────────────────────────────────
// profiles — extends Supabase auth.users
// ─────────────────────────────────────────────────────────────────────────────

export const profiles = pgTable('profiles', {
  id:          uuid('id').primaryKey(),
  displayName: text('display_name').notNull(),
  targetLevel: jlptLevel('target_level').notNull().default('N5'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// flashcards — vocabulary cards (read-only for users, admin-managed)
// ─────────────────────────────────────────────────────────────────────────────

export const flashcards = pgTable('flashcards', {
  id:        uuid('id').primaryKey().defaultRandom(),
  level:     jlptLevel('level').notNull(),
  kanji:     text('kanji'),          // null for hiragana-only words
  hiragana:  text('hiragana').notNull(),
  romaji:    text('romaji').notNull(), // the accepted answer in blind grading
  meaningId: text('meaning_id').notNull(), // Indonesian meaning
  meaningEn: text('meaning_en').notNull(), // English meaning
  exampleJp: text('example_jp'),
  exampleId: text('example_id'),
  exampleEn: text('example_en'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// ai_explanation_cache — ADR-003: Cache Gemini responses in DB
// ─────────────────────────────────────────────────────────────────────────────

export const aiExplanationCache = pgTable('ai_explanation_cache', {
  id:        uuid('id').primaryKey().defaultRandom(),
  cacheKey:  text('cache_key').notNull().unique(), // SHA-256 hash of prompt
  prompt:    text('prompt').notNull(),
  response:  text('response').notNull(),
  model:     text('model').notNull(), // 'gemini-3.6-flash'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  hitCount:  integer('hit_count').notNull().default(0),
});

// ─────────────────────────────────────────────────────────────────────────────
// study_sessions — APPEND-ONLY LEDGER (no UPDATE, no DELETE)
// ─────────────────────────────────────────────────────────────────────────────

export const studySessions = pgTable('study_sessions', {
  id:             uuid('id').primaryKey(), // Client-generated UUID (ADR-005)
  userId:         uuid('user_id').notNull().references(() => profiles.id),
  level:          jlptLevel('level').notNull(),
  status:         sessionStatus('status').notNull().default('ACTIVE'),
  totalCards:     integer('total_cards').notNull(),
  correctCount:   integer('correct_count').notNull().default(0),
  incorrectCount: integer('incorrect_count').notNull().default(0),
  skippedCount:   integer('skipped_count').notNull().default(0),
  startedAt:      timestamp('started_at').notNull(),
  completedAt:    timestamp('completed_at'),
});

// ─────────────────────────────────────────────────────────────────────────────
// study_results — APPEND-ONLY LEDGER (no UPDATE, no DELETE)
// ─────────────────────────────────────────────────────────────────────────────

export const studyResults = pgTable('study_results', {
  id:          uuid('id').primaryKey().defaultRandom(),
  sessionId:   uuid('session_id').notNull().references(() => studySessions.id),
  userId:      uuid('user_id').notNull().references(() => profiles.id),
  // ADR-010: Nullable to support Quiz mode (vocab string, no flashcard UUID)
  // source_mode differentiates FLASHCARD vs QUIZ for Weak Words Analytics
  flashcardId: uuid('flashcard_id').references(() => flashcards.id), // nullable
  sourceMode:  text('source_mode').notNull().default('FLASHCARD'), // 'FLASHCARD' | 'QUIZ'
  vocabKey:    text('vocab_key'), // quiz vocab identifier (null for FLASHCARD mode)
  userAnswer:  text('user_answer').notNull(),
  result:      gradeResult('result').notNull(),
  answeredAt:  timestamp('answered_at').defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// achievements_unlocked — APPEND-ONLY event-driven badge ledger (ADR-011)
// Replaces on-the-fly aggregation for /api/achievements.
// Unique constraint on (user_id, achievement_id) enables ON CONFLICT DO NOTHING.
// ─────────────────────────────────────────────────────────────────────────────

export const achievementsUnlocked = pgTable(
  'achievements_unlocked',
  {
    id:            uuid('id').primaryKey().defaultRandom(),
    userId:        uuid('user_id').notNull().references(() => profiles.id),
    achievementId: text('achievement_id').notNull(), // e.g. 'FIRST_SESSION', 'STREAK_7'
    unlockedAt:    timestamp('unlocked_at').defaultNow().notNull(),
    // Metadata snapshot at unlock time — prevents retroactive criteria changes
    // from altering what the user experienced at unlock moment
    metaJson:      text('meta_json'), // JSON string: { sessionsCount, streak, ... }
    isAnomalous:   boolean('is_anomalous').notNull().default(false), // clock skew flag
  },
  (table) => ({
    // Idempotency: a user can only unlock each achievement once
    uniqueUserAchievement: uniqueIndex('uq_user_achievement').on(table.userId, table.achievementId),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports (inferred from schema)
// ─────────────────────────────────────────────────────────────────────────────

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Flashcard = typeof flashcards.$inferSelect;
export type AiExplanationCache = typeof aiExplanationCache.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;
export type NewStudySession = typeof studySessions.$inferInsert;
export type StudyResult = typeof studyResults.$inferSelect;
export type NewStudyResult = typeof studyResults.$inferInsert;
export type AchievementUnlocked = typeof achievementsUnlocked.$inferSelect;
export type NewAchievementUnlocked = typeof achievementsUnlocked.$inferInsert;
