# NihongoQuest | 日本語クエスト 🎌

> **Full-stack Japanese learning platform** — Smart flashcards, blind grading, AI-powered grammar explanations, and real-time progress analytics.
>
> スマートフラッシュカード・盲目採点・AI文法解説・リアルタイム進捗分析を備えた日本語学習プラットフォーム。

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5_Strict-3178C6?logo=typescript)](https://typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres_+_Auth-3ECF8E?logo=supabase)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Tests-26_passing-6E9F18?logo=vitest)](./src/__tests__)
[![License](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE)

> [!NOTE]
> **Live Demo**: Database uses Supabase Free Tier — if the database is temporarily unavailable (auto-paused), the app automatically falls back to **demo mode** with sample N5/N4 vocabulary data. All features remain accessible.

---

## ✨ Features / 機能

| Feature | Description |
|---|---|
| 📚 **Flashcard Study** | JLPT N5–N4 vocabulary with kanji, hiragana, romaji |
| ✏️ **Blind Grading** | Type your answer before seeing the correct one |
| 🤖 **AI Sensei** | Grammar deep-dives via Gemini 2.0 Flash API |
| 📊 **Analytics Dashboard** | Accuracy per JLPT level, study streak calendar, weak words |
| 🏆 **Achievements** | Study milestone badges and progress tracking |
| 📖 **Vocabulary Browser** | Search + filter with infinite scroll pagination |
| 🔐 **Google SSO** | Supabase Auth — one-click sign-in |
| 🌙 **Dark Mode** | System-aware theme with persistent preference |
| 🌐 **Bilingual UI** | Full EN/JA language switcher via i18n store |
| 🛡️ **Rate Limiting** | Per-IP sliding window on all API routes (RFC 6585) |
| 🔒 **RLS Policies** | Row-Level Security on all Supabase tables |

---

## 🏗️ Architecture

```
Browser → Next.js App Router (SSR + RSC)
              ↓
         Middleware (Supabase SSR Auth Guard)
              ↓
         API Routes (Rate Limit → Validate → Auth → Service)
              ↓
         Service Layer (Business Logic)
              ↓
         Repository Layer (Drizzle ORM)
              ↓
         Supabase Postgres (RLS enforced)
```

**Pattern**: `Component → Service → Repository → DB` — Never direct DB calls from components.

---

## 🛠️ Tech Stack / 技術スタック

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | SSR, RSC, API Routes |
| **Language** | TypeScript 5 — `strict: true` | Type safety |
| **Styling** | Vanilla CSS + CSS Variables | Design token system |
| **Animation** | GSAP 3 + `@gsap/react` | Micro-interactions |
| **Database** | Supabase Postgres + Drizzle ORM | Type-safe queries |
| **Auth** | Supabase SSR + Google OAuth | Session management |
| **AI** | Gemini 2.0 Flash API | Grammar explanations |
| **State** | Zustand + `persist` middleware | Client state |
| **Testing** | Vitest + Testing Library | 26 unit tests |
| **Security** | RLS + Rate Limiting | Per-table policies |

---

## 🚀 Getting Started / はじめ方

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/nihongoquest.git
cd nihongoquest
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-region.pooler.supabase.com:6543/postgres
GEMINI_API_KEY=your-gemini-key
```

> **Demo Mode**: Leave all variables unset and the app runs with built-in sample data — no database required.

### 3. Set Up Supabase Database

```bash
# Push Drizzle schema to Supabase
npm run db:push

# Seed with N5/N4 flashcard data
npm run db:seed
```

Then run the RLS migrations in **Supabase Dashboard → SQL Editor**:

```bash
# Run in order:
supabase/migrations/001_rls_policies.sql   # RLS + indexes + grants
supabase/migrations/002_auth_trigger.sql   # Auto-create profile on signup
```

### 4. Enable Google OAuth

Supabase Dashboard → Authentication → Providers → Google → add your OAuth credentials.

### 5. Run Development Server

```bash
npm run dev
# → http://localhost:3000
```

---

## 📁 Project Structure

```
nihongoquest/
├── src/
│   ├── app/
│   │   ├── (main)/           # Protected routes (study, quiz, vocabulary, analytics)
│   │   ├── auth/             # Login, register, OAuth callback
│   │   └── api/              # API routes (cards, explain, quiz, sessions, vocabulary, analytics)
│   ├── components/           # Client components (FlashCard, QuizClient, AnalyticsClient, etc.)
│   ├── features/             # Domain modules: Service + Repository per feature
│   ├── store/                # Zustand stores (lang, theme, settings, study)
│   ├── lib/                  # Utilities (supabase, db, rate-limit, demo-data, i18n)
│   └── types/                # TypeScript types and enums
├── supabase/
│   └── migrations/           # SQL: RLS policies, auth trigger
├── db/                       # Drizzle schema + seed data
└── docs/                     # Architecture, design system, rules, schema
```

---

## 🔒 Security

| Mechanism | Implementation |
|---|---|
| **Auth Middleware** | Supabase SSR `getUser()` on every protected route |
| **API Auth Guard** | Zero-trust: each API route independently verifies the session |
| **Rate Limiting** | Sliding-window per-IP: 5/min (AI), 20/min (quiz), 30/min (analytics), 60/min (vocab) |
| **RLS Policies** | `user_id = auth.uid()` on all user data tables |
| **Append-Only DB** | `study_sessions` and `study_results`: no UPDATE/DELETE policies |
| **Input Validation** | Zod schemas on all API endpoints |

---

## 🧪 Testing

```bash
npm run test          # Run all tests (26 tests)
npm run test:watch    # Watch mode
npm run lint          # ESLint (0 warnings)
npm run build         # Production build (0 errors)
```

**Test coverage:**

| Suite | Tests |
|---|---|
| Format utilities | 13 tests |
| Flashcard service | 5 tests |
| Login component | 3 tests |
| FlashCard component | 3 tests |
| AI Explain API route | 2 tests |

---

## 📋 Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run test         # Vitest unit tests
npm run lint         # ESLint check
npm run db:push      # Sync Drizzle schema → Supabase
npm run db:seed      # Insert N5/N4 flashcard data
```

---

## 📚 Documentation

| File | Contents |
|---|---|
| [`docs/architecture.md`](./docs/architecture.md) | System architecture, ADRs, folder structure |
| [`docs/design.md`](./docs/design.md) | Bento Grid design system, color palette |
| [`docs/rules.md`](./docs/rules.md) | Coding conventions (mandatory for contributors) |
| [`docs/schema.md`](./docs/schema.md) | Database schema, RLS policy matrix |

---

## 👤 Author

**Najmuddin Musyafa** — Informatics Engineering Student, UNPEBA  
Building this as a portfolio project while studying Japanese for future career opportunities in Japan. 🎌

---

## 📄 License

MIT License — Free to use and modify.  
MITライセンス — 自由に使用・改変できます。
