# Database Schema — NihongoQuest
# データベーススキーマ — 日本語クエスト

> **Last Updated**: 2026-09-04
> **ORM**: Drizzle ORM · **Database**: Supabase Postgres
> **Source of Truth**: This file. All Drizzle schema changes MUST be reflected here first.

---

## 1. Design Principles

1. **Append-Only Ledger** — `study_sessions` and `study_results` are permanent records. No UPDATE, no DELETE.
2. **AI Cache First** — `ai_explanation_cache` prevents redundant Gemini API calls.
3. **Client-side UUID** — `study_sessions.id` generated on client at session start (idempotency).
4. **RLS Per User** — All user data protected by Supabase Row Level Security.

---

## 2. Enums

```typescript
// db/schema.ts
export const jlptLevel   = pgEnum('jlpt_level', ['N5', 'N4', 'N3', 'N2', 'N1']);
export const gradeResult = pgEnum('grade_result', ['CORRECT', 'INCORRECT', 'SKIPPED']);
export const sessionStatus = pgEnum('session_status', ['ACTIVE', 'COMPLETED', 'ABANDONED']);
```

---

## 3. Table Definitions

### `profiles`

Extension of Supabase `auth.users`. Created automatically on first login via trigger.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `uuid` | ✅ | References `auth.users.id` |
| `display_name` | `text` | ✅ | User's display name from Google |
| `target_level` | `jlpt_level` | ✅ | Default `'N5'`. User's JLPT target. |
| `created_at` | `timestamp` | ✅ | `defaultNow()` |
| `updated_at` | `timestamp` | ✅ | `defaultNow()` |

```typescript
export const profiles = pgTable('profiles', {
  id:          uuid('id').primaryKey().references(() => authUsers.id),
  displayName: text('display_name').notNull(),
  targetLevel: jlptLevel('target_level').notNull().default('N5'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
});
```

---

### `flashcards`

Read-only vocabulary cards. Populated by admin/seed script only.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `uuid` | ✅ | `defaultRandom()` |
| `level` | `jlpt_level` | ✅ | N5 / N4 / N3 / N2 / N1 |
| `kanji` | `text` | ❌ | `null` if hiragana-only word |
| `hiragana` | `text` | ✅ | Reading in hiragana |
| `romaji` | `text` | ✅ | Romanized reading (accepted answer) |
| `meaning_id` | `text` | ✅ | Indonesian meaning |
| `meaning_en` | `text` | ✅ | English meaning |
| `example_jp` | `text` | ❌ | Example sentence in Japanese |
| `example_id` | `text` | ❌ | Example sentence in Indonesian |
| `example_en` | `text` | ❌ | Example sentence in English |
| `created_at` | `timestamp` | ✅ | `defaultNow()` |

```typescript
export const flashcards = pgTable('flashcards', {
  id:         uuid('id').primaryKey().defaultRandom(),
  level:      jlptLevel('level').notNull(),
  kanji:      text('kanji'),
  hiragana:   text('hiragana').notNull(),
  romaji:     text('romaji').notNull(),
  meaningId:  text('meaning_id').notNull(),
  meaningEn:  text('meaning_en').notNull(),
  exampleJp:  text('example_jp'),
  exampleId:  text('example_id'),
  exampleEn:  text('example_en'),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
});
```

---

### `ai_explanation_cache`

ADR-003: Cache Gemini responses in DB. Same prompt → cache hit → < 200ms response.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `uuid` | ✅ | `defaultRandom()` |
| `cache_key` | `text` | ✅ | Hash of the prompt (SHA-256). UNIQUE. |
| `prompt` | `text` | ✅ | Original prompt sent to Gemini |
| `response` | `text` | ✅ | Gemini's response |
| `model` | `text` | ✅ | e.g., `'gemini-3.6-flash'` |
| `created_at` | `timestamp` | ✅ | `defaultNow()` |
| `hit_count` | `integer` | ✅ | Default `0`. Incremented on cache hit. |

```typescript
export const aiExplanationCache = pgTable('ai_explanation_cache', {
  id:        uuid('id').primaryKey().defaultRandom(),
  cacheKey:  text('cache_key').notNull().unique(),
  prompt:    text('prompt').notNull(),
  response:  text('response').notNull(),
  model:     text('model').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  hitCount:  integer('hit_count').notNull().default(0),
});
```

---

### `study_sessions` ⚠️ APPEND-ONLY

No UPDATE. No DELETE. This is a ledger.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `uuid` | ✅ | **Client-generated UUID** (idempotency, ADR-005) |
| `user_id` | `uuid` | ✅ | References `profiles.id` |
| `level` | `jlpt_level` | ✅ | JLPT level studied in this session |
| `status` | `session_status` | ✅ | Default `'ACTIVE'` |
| `total_cards` | `integer` | ✅ | Total cards in this session |
| `correct_count` | `integer` | ✅ | Default `0` |
| `incorrect_count` | `integer` | ✅ | Default `0` |
| `skipped_count` | `integer` | ✅ | Default `0` |
| `started_at` | `timestamp` | ✅ | Client-set session start time |
| `completed_at` | `timestamp` | ❌ | Null until session ends |

```typescript
export const studySessions = pgTable('study_sessions', {
  id:             uuid('id').primaryKey(), // Client UUID
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
```

---

### `study_results` ⚠️ APPEND-ONLY

Each card answer is one row. No UPDATE. No DELETE.

**ADR-010 (2026-09-04)**: `flashcard_id` is now nullable to support Quiz mode. Use `source_mode` to differentiate between FLASHCARD and QUIZ results for Weak Words Analytics.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `uuid` | ✅ | `defaultRandom()` |
| `session_id` | `uuid` | ✅ | References `study_sessions.id` |
| `user_id` | `uuid` | ✅ | References `profiles.id` |
| `flashcard_id` | `uuid` | ❌ | References `flashcards.id`. **Nullable** — null for QUIZ mode rows |
| `source_mode` | `text` | ✅ | `'FLASHCARD'` or `'QUIZ'`. Default `'FLASHCARD'` |
| `vocab_key` | `text` | ❌ | Quiz vocabulary identifier (e.g. `'taberu'`). Null for FLASHCARD mode |
| `user_answer` | `text` | ✅ | What the user typed |
| `result` | `grade_result` | ✅ | CORRECT / INCORRECT / SKIPPED |
| `answered_at` | `timestamp` | ✅ | `defaultNow()` |

```typescript
export const studyResults = pgTable('study_results', {
  id:          uuid('id').primaryKey().defaultRandom(),
  sessionId:   uuid('session_id').notNull().references(() => studySessions.id),
  userId:      uuid('user_id').notNull().references(() => profiles.id),
  flashcardId: uuid('flashcard_id').references(() => flashcards.id), // nullable — ADR-010
  sourceMode:  text('source_mode').notNull().default('FLASHCARD'),    // 'FLASHCARD' | 'QUIZ'
  vocabKey:    text('vocab_key'),                                     // quiz identifier
  userAnswer:  text('user_answer').notNull(),
  result:      gradeResult('result').notNull(),
  answeredAt:  timestamp('answered_at').defaultNow().notNull(),
});
```

---

### `achievements_unlocked` ⚠️ APPEND-ONLY (ADR-011)

Event-driven badge ledger. Replaces on-the-fly aggregation in `/api/achievements`.

**Why this table exists**: Computed-on-the-fly achievements (old approach) had three bugs:
1. No historical `unlocked_at` timestamp
2. Retroactive lock: changing criteria could un-unlock a badge a user already earned
3. O(N) full-history scan on every request

This table stores a permanent, immutable record of each achievement at the exact moment it was earned. Evaluated in the Service layer after each session completes.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `uuid` | ✅ | `defaultRandom()` |
| `user_id` | `uuid` | ✅ | References `profiles.id` |
| `achievement_id` | `text` | ✅ | e.g. `'FIRST_SESSION'`, `'STREAK_7'`, `'N5_MASTER'` |
| `unlocked_at` | `timestamp` | ✅ | `defaultNow()` — real unlock moment |
| `meta_json` | `text` | ❌ | JSON snapshot at unlock time: `{ sessionsCount, streak, accuracy }` |
| `is_anomalous` | `boolean` | ✅ | `false` by default. `true` if clock skew detected on client timestamp |

```typescript
export const achievementsUnlocked = pgTable(
  'achievements_unlocked',
  {
    id:            uuid('id').primaryKey().defaultRandom(),
    userId:        uuid('user_id').notNull().references(() => profiles.id),
    achievementId: text('achievement_id').notNull(),
    unlockedAt:    timestamp('unlocked_at').defaultNow().notNull(),
    metaJson:      text('meta_json'),
    isAnomalous:   boolean('is_anomalous').notNull().default(false),
  },
  (table) => ({
    uniqueUserAchievement: uniqueIndex('uq_user_achievement').on(table.userId, table.achievementId),
  })
);
```

---

## 4. Indexes

| Table | Column(s) | Type | Purpose |
|-------|-----------|------|---------|
| `flashcards` | `level` | B-tree | Filter cards by JLPT level |
| `study_sessions` | `user_id, started_at DESC` | B-tree | User's session history, latest first |
| `study_sessions` | `user_id, level` | B-tree | Progress per level |
| `study_results` | `session_id` | B-tree | All results for a session |
| `study_results` | `user_id, result, source_mode` | B-tree | Weak Words Analytics (per user, per mode) |
| `ai_explanation_cache` | `cache_key` | B-tree (unique) | Cache lookup |
| `achievements_unlocked` | `user_id, achievement_id` | B-tree (unique) | Idempotency guard + fast lookup |
| `achievements_unlocked` | `user_id, unlocked_at DESC` | B-tree | Chronological achievement feed |

---

## 5. RLS Policies (Supabase)

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | `id = auth.uid()` | `id = auth.uid()` | `id = auth.uid()` | ❌ Forbidden |
| `flashcards` | ✅ Public (authenticated) | ❌ Admin only | ❌ Admin only | ❌ Forbidden |
| `study_sessions` | `user_id = auth.uid()` | `user_id = auth.uid()` | ❌ Forbidden | ❌ Forbidden |
| `study_results` | `user_id = auth.uid()` | `user_id = auth.uid()` | ❌ Forbidden | ❌ Forbidden |
| `ai_explanation_cache` | ✅ Public (authenticated) | Service role only | `hit_count` only | ❌ Forbidden |
| `achievements_unlocked` | `user_id = auth.uid()` | Service role only | ❌ Forbidden | ❌ Forbidden |

---

## 6. Supabase Auth Trigger

On new user sign up via Google SSO, auto-create profile:

```sql
-- Run in Supabase SQL Editor
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, target_level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'N5'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## 7. Seed Data (N5 Flashcards)

20 N5 vocabulary cards included in `db/seed.ts`. Sample:

| Kanji | Hiragana | Romaji | Meaning (ID) | Meaning (EN) |
|-------|----------|--------|--------------|--------------|
| 食べる | たべる | taberu | makan | to eat |
| 飲む | のむ | nomu | minum | to drink |
| 見る | みる | miru | melihat | to see/watch |
| 聞く | きく | kiku | mendengar | to listen/hear |
| 行く | いく | iku | pergi | to go |
| 来る | くる | kuru | datang | to come |
| する | する | suru | melakukan | to do |
| 話す | はなす | hanasu | berbicara | to speak |
| 読む | よむ | yomu | membaca | to read |
| 書く | かく | kaku | menulis | to write |
| 買う | かう | kau | membeli | to buy |
| 売る | うる | uru | menjual | to sell |
| 大きい | おおきい | ookii | besar | big |
| 小さい | ちいさい | chiisai | kecil | small |
| 新しい | あたらしい | atarashii | baru | new |
| 古い | ふるい | furui | lama/tua | old |
| 高い | たかい | takai | mahal/tinggi | expensive/tall |
| 安い | やすい | yasui | murah | cheap |
| 面白い | おもしろい | omoshiroi | menarik | interesting |
| 難しい | むずかしい | muzukashii | sulit | difficult |
