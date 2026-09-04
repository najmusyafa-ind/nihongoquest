# Coding Rules — NihongoQuest
# コーディング規約 — 日本語クエスト

> Any contributor (human or AI) MUST read this file before writing a single line of code.
> Violation of these rules is grounds for rejecting a Pull Request.

---

## Rule 1: The Clean Repository Pattern

```
UI Component → Service → Repository → Drizzle ORM / Supabase
```

- **FORBIDDEN**: Calling Drizzle/Supabase directly from React components
- **FORBIDDEN**: Calling Drizzle/Supabase from Zustand stores
- Components call `Service` only. Services call `Repository`.
- All database queries live exclusively in `src/features/*/[Feature]Repository.ts`

```typescript
// ✅ CORRECT — in React component
const handleStartSession = async () => {
  await FlashcardService.getCardsByLevel('N5');
};

// ❌ WRONG — DB leaking into component
const handleStartSession = async () => {
  await db.select().from(flashcards).where(eq(flashcards.level, 'N5')); // FORBIDDEN
};
```

---

## Rule 2: Append-Only Study Sessions

- `study_sessions` and `study_results` tables: **NO UPDATE, NO DELETE**
- No "delete history" button in the UI — this is a feature, not a bug
- Session completion is recorded as a field update on INSERT, not UPDATE
- Enforced at the RLS policy level in Supabase

---

## Rule 3: AI Caching is Mandatory

```typescript
// ✅ CORRECT — always check cache first
async explainGrammar(word: string): Promise<string> {
  const cached = await AiExplainerRepository.getFromCache(word);
  if (cached) {
    await AiExplainerRepository.incrementHitCount(cached.id);
    return cached.response;
  }
  return await this.fetchFromGemini(word);
}

// ❌ WRONG — calling Gemini every time is expensive and slow
async explainGrammar(word: string): Promise<string> {
  return await this.fetchFromGemini(word); // no cache check
}
```

---

## Rule 4: Exponential Backoff for Gemini API

```typescript
// Retry pattern: 1s → 2s → 4s → 8s (max 4 retries)
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000] as const;

async function fetchWithBackoff(prompt: string): Promise<string> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await callGeminiAPI(prompt);
    } catch (error) {
      if (attempt === RETRY_DELAYS_MS.length) throw error;
      const delay = RETRY_DELAYS_MS[attempt];
      toast.loading(`AI is thinking... retry in ${delay / 1000}s`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Rule 5: TypeScript Strict — No `any`

- `strict: true` and `noUncheckedIndexedAccess: true` in `tsconfig.json`
- All interfaces MUST be defined in `src/types/entities.ts`
- Use `unknown` for external data, validate with Zod
- All Service and Repository functions MUST have explicit return types

```typescript
// ✅ CORRECT
async function getCardsByLevel(level: JlptLevel): Promise<Flashcard[]> { ... }

// ❌ WRONG
async function getCardsByLevel(level: any): Promise<any> { ... }
```

---

## Rule 6: GSAP Animation Rules

- **MANDATORY**: Use `useGSAP()` from `@gsap/react`. Raw `useEffect` + `gsap.to()` is forbidden.
- **MANDATORY**: Use `contextSafe()` for all event handlers that trigger animations.
- **MANDATORY**: Support `prefers-reduced-motion` via `gsap.matchMedia()`.
- **FORBIDDEN**: Animate `width`, `height`, `top`, `left`. Only `transform` and `opacity`.
- **FORBIDDEN**: 3D CSS perspective transforms on flashcard (GPU heavy on mobile).

```typescript
// ✅ CORRECT
const { contextSafe } = useGSAP();
const handleReveal = contextSafe(() => {
  gsap.to(cardRef.current, { y: -20, opacity: 0, duration: 0.25 });
});

// ❌ WRONG
useEffect(() => {
  gsap.to(cardRef.current, { y: -20, opacity: 0 }); // No context safety
}, []);
```

---

## Rule 7: Numbers & Naming Suffixes

- All numeric values that represent a count or percentage: suffix `InPercent`, `Count`
- All duration values: suffix `InMs`, `InSeconds`
- Booleans: prefix `is`, `has`, `can` — e.g., `isOnline`, `hasCompletedSetup`
- No floating point for scores — store as integer (e.g., 85 for 85%)

---

## Rule 8: Error Handling — Toast, Not Alert

```typescript
// ✅ CORRECT
import { toast } from 'sonner';
toast.success('Session complete! / セッション完了！ 🎉');
toast.error('Failed to save. Try again. / 保存に失敗しました。');

// ❌ WRONG
alert('Done!');
console.log('Error:', error);
```

All `try/catch` blocks in Repository layer MUST:
1. `console.error('[FeatureName] Operation failed:', error)` for debugging
2. Re-throw or return a typed error for the Service layer to handle
3. Never swallow errors silently

---

## Rule 9: Language (i18n) — Always Use Translation Keys

```typescript
// ✅ CORRECT — use translation key from useLang hook
const { t } = useLang();
<button>{t('study.startSession')}</button>

// ❌ WRONG — hardcoded string in component
<button>Start Studying</button>
```

---

## Rule 10: Naming Conventions

| Entity | Convention | Example |
|--------|------------|---------|
| React component file | `PascalCase.tsx` | `FlashCard.tsx` |
| Non-component file | `camelCase.ts` | `format.ts` |
| Service / Repository file | `PascalCase.ts` | `FlashcardService.ts` |
| Zustand store | `use[Name]Store` | `useStudyStore`, `useLangStore` |
| Variables & functions | `camelCase` | `const totalCorrect`, `function gradeAnswer()` |
| Types & Interfaces | `PascalCase` | `interface Flashcard`, `type JlptLevel` |
| Global constants | `SCREAMING_SNAKE_CASE` | `const MAX_RETRY_ATTEMPTS = 4` |
| Translation keys | `camelCase.camelCase` | `study.startSession`, `dashboard.progress` |
| CSS custom properties | `--kebab-case` | `--color-primary`, `--text-kanji-display` |

---

## Rule 11: Component Size Limits

- One React component file: max **200 lines**. If over, extract sub-components.
- One function: max **50 lines**. If over, extract helpers.
- One Service/Repository file: max **300 lines**. If over, split domain.

---

## Rule 12: Git & GitHub Conventions

**Branch naming**:
- `feature/[feature-name]` — e.g., `feature/offline-sync`
- `fix/[bug-name]` — e.g., `fix/grade-input-submit`
- `docs/[change]` — e.g., `docs/schema-update`

**Commit messages (English)**:
```
feat(flashcard): add GSAP slide animation on card reveal
fix(ai-explainer): handle Gemini 429 with exponential backoff
docs(schema): update study_results append-only policy
test(study-session): add unit test for gradeAnswer()
```

**README**: Bilingual — English first, Japanese below (each section)

---

## Rule 13: AI Contributor Protocol

If you are an AI agent modifying this codebase:
1. Read `docs/schema.md` FIRST before any database changes
2. Never make `study_sessions` or `study_results` deletable
3. Never expose `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` to the browser
4. Always run `npm run build` before ending your session
5. Always update docs when changing schema or architecture
