# Design System — NihongoQuest
# デザインシステム — 日本語クエスト

> **Target**: Light mode default · Bento Grid layout · WCAG 2.1 AA
> **Aesthetic**: Japanese stationery meets modern SaaS — torii red on washi paper

---

## 1. Visual Identity / ビジュアルアイデンティティ

**Inspiration**: The weight and intentionality of Japanese ink brush calligraphy combined with the precision of modern digital product design. Every element earns its place — no decorative noise, no glassmorphism.

**Key Principles**:
- **Density over decoration** — Bento grid tiles that pack information beautifully
- **Ink on paper** — Warm white backgrounds, crisp type, accent red like vermilion ink on washi
- **Purposeful red** — `#e94560` used sparingly for interactive CTAs only (torii gate vermilion)
- **Zero purple** — Amber `#d97706` is the secondary accent, never purple

---

## 2. Color Palette / カラーパレット

All colors defined as CSS custom properties in `globals.css`.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#e94560` | CTA buttons, active accents (vermilion/torii) |
| `--color-primary-dark` | `#c0304d` | Hover state on primary |
| `--color-primary-muted` | `rgba(233,69,96,0.10)` | Selected tile bg, focus ring |
| `--color-accent` | `#d97706` | JLPT level badges, highlights, scores |
| `--color-accent-dark` | `#b45309` | Hover state on accent |
| `--color-background` | `#f7f5f0` | Main background (washi paper) |
| `--color-background-alt` | `#f0ede6` | Alternate bg (sidebar, sections) |
| `--color-surface` | `#ffffff` | Bento card surface |
| `--color-surface-raised` | `#faf9f7` | Elevated card, hover bg |
| `--color-border` | `#e5e0d8` | Card borders, dividers |
| `--color-border-strong` | `#c9c3b8` | Strong borders, hover |
| `--color-muted` | `#9c8e80` | Secondary text, labels |
| `--color-text` | `#1a1614` | Primary text (deep ink) |
| `--color-text-secondary` | `#5c5147` | Secondary text |
| `--color-success` | `#15803d` | Correct answer |
| `--color-success-bg` | `#f0fdf4` | Correct answer background tint |
| `--color-destructive` | `#dc2626` | Wrong answer, error state |
| `--color-destructive-bg` | `#fef2f2` | Wrong answer background tint |
| `--color-kanji` | `#1a1614` | Kanji display text (deep ink) |
| `--shadow-tile` | box-shadow | Bento tile depth (1px soft) |
| `--shadow-tile-hover` | box-shadow | Lifted tile on hover (4px) |
| `--shadow-primary` | box-shadow | Red CTA button glow |

---

## 3. Typography / タイポグラフィ

### Font Stack

| Font | Usage | Load via |
|------|-------|----------|
| `Noto Serif JP` | Kanji, Hiragana display characters (authenticity) | Google Fonts |
| `Plus Jakarta Sans` | All Latin UI text — heading, body, label | Google Fonts |
| `Geist Mono` | Romaji, session IDs, code, counters | Google Fonts (or next/font) |

```css
/* Google Fonts import — globals.css */
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');
```

### Type Scale

| Token | Size | Weight | Font | Usage |
|-------|------|--------|------|-------|
| `--text-kanji-display` | `64px / 72px` | 700 | Noto Serif JP | Flashcard kanji front |
| `--text-kanji-large` | `40px / 48px` | 500 | Noto Serif JP | Flashcard hiragana |
| `--text-heading-1` | `32px` | 700 | Plus Jakarta Sans | Page titles |
| `--text-heading-2` | `24px` | 600 | Plus Jakarta Sans | Section titles |
| `--text-heading-3` | `18px` | 600 | Plus Jakarta Sans | Card titles |
| `--text-body` | `16px` | 400 | Plus Jakarta Sans | Body text |
| `--text-small` | `14px` | 400 | Plus Jakarta Sans | Labels, captions |
| `--text-xs` | `12px` | 500 | Plus Jakarta Sans | Badges, timestamps |
| `--text-mono` | `14px` | 400 | Geist Mono | Romaji, IDs |

---

## 4. Bento Grid System / ベントーグリッド

The primary layout pattern. Bento grid tiles have a **consistent border**, **uniform border-radius**, and **no glass effect**.

### Grid Rules
- Main container: `display: grid`, `gap: 1rem` (16px)
- All bento tiles: `border: 1px solid var(--color-border)`, `border-radius: 16px`
- Tile background: `var(--color-surface)` (no transparency, no blur)
- Hover: tile background transitions to `var(--color-surface-raised)`

### Bento Tile Sizes (study dashboard)

```
┌─────────────────────┬──────────┬──────────┐
│                     │  STAT    │  STAT    │
│   FLASHCARD         │  N5 %   │  STREAK  │
│   (2 × 1)           │  (1×1)   │  (1×1)  │
│                     ├──────────┴──────────┤
│                     │   AI EXPLAINER      │
│                     │   (2 × 1)           │
├─────────────────────┴─────────────────────┤
│           PROGRESS CHART (3 × 1)          │
└───────────────────────────────────────────┘
```

---

## 5. Key Components / 主要コンポーネント

### FlashCard
- **Animation**: GSAP slide-up + scale-in (NOT 3D flip — too GPU-heavy on mobile)
- **Front face**: Kanji large + Hiragana below + Level badge
- **Back face**: Meaning (Indonesian), Romaji, Example sentence
- **Reveal**: User submits answer → card slides down → answer slides up
- **Correct/Wrong**: Border color flashes green/red (`box-shadow` transition)

```
┌──────────────────────────────────┐
│  N5  [Tile badge]                │
│                                  │
│           食べる                 │ ← Noto Serif JP 64px
│         たべる                   │ ← Noto Serif JP 40px
│                                  │
│  [Type your answer...]           │ ← GradeInput
│                          [→]     │
└──────────────────────────────────┘
```

### GradeInput
- Blind grading: type romaji answer → submit → answer revealed
- Input uses `Geist Mono` for romaji
- Submit triggers GSAP reveal animation
- Validation: case-insensitive, trim whitespace

### SyncIndicator
```
● Online         ← green dot, pulsing
◌ Syncing...     ← amber dot, spinning
○ Offline        ← red dot, static
```
Always pinned top-right in study mode layout.

### AiExplainer
- States: `idle` → `loading` (skeleton) → `content` → `error`
- Loading skeleton: 3 lines of varying width (not a spinner)
- Content area has subtle left border in `--color-primary`
- Cache hit indicator: small `⚡ cached` badge in muted color

### LangSwitcher (EN | JA)
```
[EN] [JA]        ← pill toggle, in navbar
```
- Toggles between English and Japanese UI strings
- Persisted in `langStore` (Zustand + localStorage)
- Font automatically switches family context for Japanese

### JLPT Level Badge
```
[N5]  [N4]  [N3]  [N2]  [N1]
```
- Background: `--color-accent` with 10% opacity
- Border: `1px solid var(--color-accent)`
- Text: `--color-accent`
- Size: `text-xs`, `font-weight: 500`, `border-radius: 4px`

---

## 6. Animation Rules / アニメーションルール

All animations follow GSAP + `useGSAP()` hook — no raw `useEffect` + GSAP.

| Animation | GSAP Properties | Duration | Easing |
|-----------|----------------|----------|--------|
| Card enter | `y: 20→0, opacity: 0→1` | `0.3s` | `power2.out` |
| Card reveal | `y: 0→-20, opacity: 1→0` then new card `y: 20→0` | `0.25s` | `power2.inOut` |
| Correct flash | `boxShadow: 0 0 0 2px #22c55e` | `0.4s` | `power1.out` |
| Wrong flash | `boxShadow: 0 0 0 2px #ef4444` | `0.4s` | `power1.out` |
| AI panel open | `height: 0→auto, opacity: 0→1` via clip-path | `0.3s` | `power2.out` |
| Page enter | `opacity: 0→1, y: 10→0` | `0.4s` | `power2.out` |

**All animations MUST**:
- Use `useGSAP()` from `@gsap/react`
- Use `contextSafe()` for event handlers
- Support `prefers-reduced-motion` via `gsap.matchMedia()`
- Only animate `transform` and `opacity` (not `width`, `height`, `top/left`)

---

## 7. Loading & Error States

| State | Display | Component |
|-------|---------|-----------|
| Loading cards | Bento skeleton tiles (pulse animation) | `<Skeleton>` |
| Empty deck | "No cards found for this level" with icon | Inline |
| AI loading | 3-line text skeleton | `<AiExplainer>` |
| Network error | Red toast from Sonner | `<Toaster>` |
| Offline | `SyncIndicator` + offline banner | `<SyncIndicator>` |
| Correct answer | Green border flash + ✓ icon | `<FlashCard>` |
| Wrong answer | Red border flash + ✗ icon | `<FlashCard>` |
| Session complete | Stats summary bento card + confetti (GSAP) | Session page |

---

## 8. Responsive Breakpoints

| Breakpoint | Screen | Layout |
|------------|--------|--------|
| `sm` (< 640px) | Mobile | Single column, bottom nav |
| `md` (640–1023px) | Tablet portrait | 2-column bento |
| `lg` (≥ 1024px) | Tablet landscape / Desktop | Full bento grid, sidebar |

Primary target: `md` and above (most learners study on tablet or desktop).

---

## 9. Language System (EN | JA)

All UI strings defined in translation files:

```typescript
// src/lib/i18n/en.ts
export const en = {
  study: {
    startSession: "Start Studying",
    correct: "Correct!",
    incorrect: "Incorrect",
    askAI: "Ask AI Sensei",
    offline: "Offline Mode",
    syncing: "Syncing...",
    synced: "All synced",
  },
  // ...
}

// src/lib/i18n/ja.ts  
export const ja = {
  study: {
    startSession: "学習を始める",
    correct: "正解！",
    incorrect: "不正解",
    askAI: "AI先生に聞く",
    offline: "オフラインモード",
    syncing: "同期中...",
    synced: "同期完了",
  },
  // ...
}
```

---

## 10. No-Nos (Design Anti-Patterns)

| ❌ Forbidden | ✅ Instead |
|-------------|-----------|
| Glassmorphism (`backdrop-filter: blur`) | Solid `var(--color-surface)` |
| Purple or indigo as accent | Vermilion `#e94560` or amber `#f5a623` |
| 3D CSS transforms on flashcard | GSAP slide-up/down |
| Gradient text on body copy | Solid `var(--color-text)` |
| `alert()` or `confirm()` | Sonner toast |
| `useEffect` + raw GSAP | `useGSAP()` hook always |
| Hardcoded hex colors in JSX | CSS custom property tokens |
| `any` TypeScript type | `unknown` + Zod validation |
