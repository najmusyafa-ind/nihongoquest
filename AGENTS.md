# NihongoQuest — Project Agent Rules
# 日本語クエスト — エージェントルール

> **MANDATORY**: Before writing ANY code or making ANY architectural decision in this
> project, you MUST read all four foundation documents below.

<!-- BEGIN:project-foundation-rules -->

## Foundation Documents (MUST READ FIRST)

| File | Contents |
|------|---------|
| [`docs/architecture.md`](./docs/architecture.md) | Tech stack, architecture diagram, folder structure, ADRs |
| [`docs/design.md`](./docs/design.md) | Bento Grid design system, color palette, typography, NO glassmorphism |
| [`docs/rules.md`](./docs/rules.md) | Coding conventions — GSAP rules, AI caching, append-only sessions |
| [`docs/schema.md`](./docs/schema.md) | Drizzle schema, RLS policies, seed data |

<!-- END:project-foundation-rules -->

---

## Critical Rules Summary

1. **Clean Repository Pattern**: `Component → Service → Repository → DB`. Never call Drizzle/Supabase from components or stores.

2. **Append-Only**: `study_sessions` and `study_results` — NO UPDATE, NO DELETE. Ever.

3. **AI Cache**: Always call `AiExplainerRepository.getFromCache()` before `fetchFromGemini()`.

4. **GSAP**: Always `useGSAP()` + `contextSafe()`. Never raw `useEffect` + GSAP.

5. **No 3D Transforms on FlashCard**: Use GSAP slide/scale animation. 3D perspective is too heavy on mobile.

6. **No Glassmorphism**: Solid `var(--color-surface)` backgrounds. No `backdrop-filter: blur`.

7. **No Purple**: Primary = `#e94560` (vermilion). Secondary = `#f5a623` (amber). Never purple or indigo.

8. **i18n**: All UI strings use `t('key')` from `useLang()`. No hardcoded English-only strings.

9. **TypeScript Strict**: `strict: true`, `noUncheckedIndexedAccess: true`. No `any`.

10. **Toast, not alert**: Always use Sonner `toast.success()` / `toast.error()`. Never `alert()`.

---

## Environment Variables Required

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
GEMINI_API_KEY=
```

---

## Before Ending Any Session

```bash
npm run build   # Must pass with zero errors
npm run test    # All Vitest tests must pass
npm run lint    # Zero ESLint warnings
```
