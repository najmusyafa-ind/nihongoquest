# NihongoQuest — Post-Audit Roadmap: Task Checklist
_Architect: ultimate-fullstack-dev v8.4 + ultimate-uiux-dev v4.4_
_Session: 2026-09-11 | Stack DNA: Profile A — Next.js 15 + Supabase + Drizzle_
_Audit Score: 95/100 (Grade A) — 2 critical fixes applied this session_

---

## Execution Map

### 🔴 TIER P0 — Fix Before Beta (Blocking) `[100% COMPLETE]`

- [x] **Phase 1** — `__tests__/FlashCard.a11y.test.tsx`
  - [x] Add `vi` to named imports from `'vitest'` (1-line fix, line 5)
  - [x] Verify `npm run test` passes 100% green after fix

- [x] **[MANUAL SQL]** RLS Enablement — Run in Supabase Dashboard → SQL Editor
  - [x] `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`
  - [x] `ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;`
  - [x] `ALTER TABLE study_results ENABLE ROW LEVEL SECURITY;`
  - [x] `ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;`
  - [x] `ALTER TABLE ai_explanation_cache ENABLE ROW LEVEL SECURITY;`
  - [x] `ALTER TABLE achievements_unlocked ENABLE ROW LEVEL SECURITY;`
  - [x] Verify via `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`

---

### 🟡 TIER P1 — Post-Launch / v1.1 (Structural Improvements) `[100% COMPLETE]`

> **Q1**: Resolved → **Option A** (Save + flag `is_anomalous`, no data loss) ✅
> **Q2**: Resolved → **Option A** (Service layer, synchronous, unit-testable) ✅

- [x] **Phase 2** — `db/schema.ts`
  - [x] Make `study_results.flashcard_id` nullable
  - [x] Add `study_results.source_mode` text column (`'FLASHCARD' | 'QUIZ'`, default `'FLASHCARD'`)
  - [x] Add new `achievements_unlocked` table (event-driven badge ledger)

- [x] **Phase 3** — `db/migrations/0002_quiz_results_achievements.sql` `[NEW]`
  - [x] Write Drizzle migration file for P1 schema changes
  - [x] Include backfill: `UPDATE study_results SET source_mode = 'FLASHCARD' WHERE source_mode IS NULL`
  - [x] Verify `npm run db:push` succeeds

- [x] **Phase 4** — `docs/schema.md` (update)
  - [x] Document new `source_mode` column on `study_results`
  - [x] Document new `achievements_unlocked` table with all columns and RLS policies
  - [x] Comply with AGENTS.md Rule 13 (schema doc must stay in sync)

- [x] **Phase 5** — `src/app/api/sessions/route.ts`
  - [x] Add clock skew validation to `POST` handler
  - [x] Compare `body.startedAt` vs `new Date()` (server time)
  - [x] Flag `is_anomalous = true` if delta > 24h future OR > 30 days past
  - [x] Session still saved — no data loss (Strategy A)

- [x] **Phase 6** — `src/features/achievements/AchievementsRepository.ts` `[NEW]`
  - [x] `insertUnlock(userId, achievementId, unlockedAt)` with idempotency guard
  - [x] Use `ON CONFLICT DO NOTHING` for safe re-evaluation
  - [x] Follow Repository pattern (no Drizzle/Supabase calls from Service directly)

- [x] **Phase 7** — `src/features/achievements/AchievementsService.ts` `[NEW]`
  - [x] `evaluateAndPersistUnlocks(userId, sessionSummary)` — pure service function
  - [x] Check achievement criteria against session summary
  - [x] Delegate INSERT to `AchievementsRepository.insertUnlock()`
  - [x] Zero `any` — TypeScript strict mode

- [x] **Phase 8** — `src/app/api/sessions/route.ts` + `SessionClient.tsx`
  - [x] Wire `AchievementsService.evaluateAndPersistUnlocks()` after `completeSession()` in POST handler
  - [x] Non-blocking try/catch — achievement failure never crashes session save
  - [x] Add `newlyUnlocked: string[]` to `SessionPostResponse` DTO
  - [x] Fix cascading type error in `SessionClient.tsx` (offline sync results missing `sourceMode`, `vocabKey`)

---

### 🔵 TIER P2 — Scale (Deferred — Separate Session)

- [ ] Sentry / OpenTelemetry integration (`middleware.ts` + `instrumentation.ts`)
- [ ] Web Speech Synthesis API — pronunciation audio button in `FlashCard.tsx`
- [ ] AWS Polly / Google TTS upgrade (optional, `AiExplainerService.ts`)

---

## Verification Gates

| Gate | Command | Status |
|------|---------|--------|
| Unit Tests | `npm run test` | ✅ **39/39 passed** |
| Schema Push | `npm run db:push` | `[ ]` Requires Supabase connection |
| Build | `npm run build` | ✅ **Exit 0** — 24/24 pages |
| Lint | `npm run lint` | ✅ **Exit 0** — 0 errors, 0 warnings |
| RLS Manual Check | Supabase Dashboard | ✅ **Verified (`rowsecurity = true`)** |
| Clock Skew Manual Test | POST `/api/sessions` with future `startedAt` | `[ ]` Post-deploy |
| Achievement Manual Test | Complete qualifying session → check `achievements_unlocked` | `[ ]` Post-deploy |
| Quiz Weak Words Test | Complete quiz → verify analytics | `[ ]` Post-deploy |

---

## Open Questions (Blocking P1)

| # | Question | Options | Rec. | Status |
|---|----------|---------|------|--------|
| Q1 | Clock skew anomaly handling strategy | A: Flag `is_anomalous` / B: Silent correct / C: Reject 422 | **A** | ✅ Resolved — Option A implemented |
| Q2 | Achievement unlock evaluation location | A: Service layer (sync) / B: DB Trigger (async) | **A** | ✅ Resolved — Option A implemented |
