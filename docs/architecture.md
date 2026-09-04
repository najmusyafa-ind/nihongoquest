# Architecture Document — NihongoQuest
## アーキテクチャドキュメント

> **Last Updated**: 2026-07-31
> **Stack**: Next.js `15` · TypeScript `^5` · Tailwind CSS `^4` · Supabase · Drizzle ORM · GSAP `^3.15` · Zustand `^5`

---

### 1. Tech Stack

| Layer | Technology | Version | Reason |
|-------|-----------|---------|--------|
| Framework | Next.js (App Router) | `15` | SSR, PWA support, route grouping |
| Language | TypeScript (Strict) | `^5` | `noUncheckedIndexedAccess`, no `any` |
| Styling | Tailwind CSS v4 | `^4` | CSS-native variables, zero config |
| UI Components | Shadcn UI | latest | Headless, accessible, composable |
| Animation | GSAP + `@gsap/react` | `^3.15` | 60fps, `useGSAP()` hook, zero memory leak |
| State | Zustand + `idb-keyval` | `^5` / `^6` | Offline cards, IndexedDB persist |
| Database | Supabase (Postgres) | latest | RLS, Auth, Realtime |
| ORM | Drizzle ORM | latest | Type-safe, schema-first |
| AI | Gemini API (`gemini-3.6-flash`) | latest | Grammar explanation + JLPT quiz |
| Forms | React Hook Form + Zod | `^7` / `^3` | Schema-first validation |
| Charts | Recharts | `^3` | Lightweight, composable |
| Toasts | Sonner | latest | UX feedback (not `alert()`) |
| Testing | Vitest | `^4` | Native ESM, fast |
| i18n | Custom language store | — | EN \| JA toggle, no heavy library |

---

### 2. Architecture Diagram (C4 Level 2)

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser / PWA                            │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │  /app/(study)/   │    │  /app/(dashboard)/           │  │
│  │  - Deck Selector │    │  - Progress Chart            │  │
│  │  - Study Session │    │  - Session History           │  │
│  │  - AI Explainer  │    │  - Settings                  │  │
│  └────────┬─────────┘    └──────────────┬───────────────┘  │
│           │                             │                   │
│  ┌────────▼─────────────────────────────▼───────────────┐  │
│  │          Service Layer (Business Logic)               │  │
│  │  FlashcardService · StudySessionService               │  │
│  │  AiExplainerService · AuthService                     │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │       Repository Layer (Drizzle ORM + Supabase)       │  │
│  │  FlashcardRepository · StudySessionRepository         │  │
│  │  AiExplainerRepository · AuthRepository               │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │           Zustand Store + IndexedDB (idb-keyval)      │  │
│  │  useStudyStore (offline cards, pending sync queue)     │  │
│  │  useLangStore  (EN | JA language preference)           │  │
│  └────────────────────────┬──────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTPS / Realtime
              ┌────────────▼───────────┐
              │       Supabase         │
              │  ┌──────────────────┐  │
              │  │  Postgres + RLS  │  │
              │  ├──────────────────┤  │
              │  │  Supabase Auth   │  │
              │  ├──────────────────┤  │
              │  │  Realtime        │  │
              │  └──────────────────┘  │
              └────────────────────────┘
                           │
              ┌────────────▼───────────┐
              │     Gemini API         │
              │  gemini-3.6-flash      │
              │  (with DB cache layer) │
              └────────────────────────┘
```

---

### 3. Folder Structure

```
nihongoquest/
├── docs/                       # Project blueprint (READ FIRST)
│   ├── architecture.md         # This file
│   ├── design.md               # Design system
│   ├── rules.md                # Coding conventions
│   └── schema.md               # Database schema
├── db/
│   ├── schema.ts               # Drizzle schema (source of truth)
│   ├── migrate.ts              # Run migrations
│   └── seed.ts                 # Seed flashcard data
├── src/
│   ├── app/
│   │   ├── (study)/            # Study routes
│   │   │   ├── layout.tsx      # SyncIndicator always visible
│   │   │   ├── page.tsx        # Deck selector
│   │   │   └── session/
│   │   │       └── page.tsx    # Active study session
│   │   ├── (dashboard)/        # Dashboard routes
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx        # Progress dashboard
│   │   ├── auth/
│   │   │   └── page.tsx        # Google SSO login
│   │   ├── globals.css         # Tailwind v4 + design tokens
│   │   └── layout.tsx          # Root layout
│   ├── components/
│   │   ├── ui/                 # Shadcn UI components
│   │   ├── FlashCard.tsx       # GSAP slide/scale animation
│   │   ├── GradeInput.tsx      # Blind grading form
│   │   ├── SyncIndicator.tsx   # Online/Offline/Syncing status
│   │   ├── AiExplainer.tsx     # AI grammar panel
│   │   ├── ProgressChart.tsx   # Recharts bar chart
│   │   ├── SessionHistory.tsx  # Study session table
│   │   └── LangSwitcher.tsx    # EN | JA toggle
│   ├── features/
│   │   ├── flashcard/
│   │   │   ├── FlashcardService.ts
│   │   │   └── FlashcardRepository.ts
│   │   ├── study-session/
│   │   │   ├── StudySessionService.ts
│   │   │   └── StudySessionRepository.ts
│   │   ├── ai-explainer/
│   │   │   ├── AiExplainerService.ts
│   │   │   └── AiExplainerRepository.ts
│   │   └── auth/
│   │       └── AuthService.ts
│   ├── store/
│   │   ├── studyStore.ts       # Zustand + IndexedDB (offline)
│   │   └── langStore.ts        # Language preference store
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client singleton
│   │   ├── db.ts               # Drizzle ORM client
│   │   └── format.ts           # formatJapanese(), formatDate()
│   └── types/
│       ├── entities.ts         # TS interfaces (sync with schema.md)
│       └── enums.ts            # Const enums
├── public/
│   ├── manifest.json           # PWA manifest
│   └── icons/                  # PWA icons
├── __tests__/                  # Vitest unit tests
├── drizzle.config.ts
├── middleware.ts               # Supabase SSR auth guard
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
├── .env.example
└── AGENTS.md
```

---

### 4. Architecture Decision Records (ADR)

| ID | Decision | Reason |
|----|----------|--------|
| ADR-001 | **Supabase + Drizzle** (not Firebase) | Type-safe SQL schema, RLS per-user, easy to audit |
| ADR-002 | **Append-Only Study Sessions** | No delete/update — study history is a permanent ledger |
| ADR-003 | **AI Cache in DB** | Same grammar explanation cached in Postgres. Query Gemini only on cache miss |
| ADR-004 | **Exponential Backoff** | Gemini 429 → retry 1s→2s→4s→8s with toast indicator |
| ADR-005 | **Client-side UUID** | `sessionId` created at session start, not submit. Prevents duplicates on network drops |
| ADR-006 | **GSAP (not Framer Motion)** | `useGSAP()` + `contextSafe()` = zero memory leak in React |
| ADR-007 | **Custom i18n (EN/JA)** | No heavy library. Zustand store + JSON translation files. Lightweight. |
| ADR-008 | **Bento Grid Layout** | Modern, dense information layout. No glassmorphism. Clean dark surfaces. |
| ADR-009 | **GSAP Slide/Scale (not 3D flip)** | 3D perspective animations are GPU-heavy on mobile. Slide+scale is equally premium. |

---

### 5. Environment Variables

| Variable | Public? | Required | Description |
|----------|---------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | Supabase anonymous key (safe, protected by RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | ✅ | Server-side only. For seed scripts. Never expose to browser. |
| `DATABASE_URL` | ❌ | ✅ | Postgres connection string for Drizzle |
| `GEMINI_API_KEY` | ❌ | ✅ | Google Gemini API key (server-side only) |

---

### 6. Data Flow — Study Session (Online)

```
User taps "Mulai Belajar"
    → FlashcardService.getCardsByLevel(level)
    → FlashcardRepository.query(db)
    → Drizzle → Supabase Postgres
    → cards returned
    → StudySessionService.startSession() [UUID from client]
    → User answers card (Blind Grading)
    → StudySessionService.gradeAnswer()
    → StudySessionRepository.addResult() [INSERT only]
    → Session complete
    → StudySessionRepository.completeSession() [INSERT status update as new record]
    → Dashboard reflects new data
```

### 7. Data Flow — AI Explainer

```
User taps "Tanya AI" on word 「に」
    → AiExplainerService.explainGrammar("に")
    → AiExplainerRepository.getFromCache("に") → cache hit? → return < 200ms
    → Cache miss → fetchFromGemini() with retry/backoff
    → AiExplainerRepository.saveToCache()
    → Return explanation
```

### 8. Offline Flow

```
Device goes offline
    → useStudyStore detects navigator.onLine = false
    → SyncIndicator shows "Offline" state
    → Flashcards loaded from IndexedDB (idb-keyval)
    → Study results queued in pendingSessions[]
    
Device comes back online
    → studyStore.syncToServer() triggered
    → All pending sessions INSERT to Supabase
    → toast.success("Progress saved! / 進捗が保存されました！")
    → pendingSessions cleared
```
