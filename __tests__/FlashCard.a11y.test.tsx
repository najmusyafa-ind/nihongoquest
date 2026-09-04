// __tests__/FlashCard.a11y.test.tsx
// U6: Accessibility audit for FlashCard component using jest-axe + axe-core.
// Rules: WCAG 2.1 AA — zero violations allowed.

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { FlashCard } from '@/components/FlashCard';
import type { Flashcard } from '@/types/entities';

expect.extend(toHaveNoViolations);

// ── Mock lang store (Rule 9 — i18n) ──────────────────────────────────────────
vi.mock('@/store/langStore', () => ({
  useLangStore: () => ({
    lang: 'en',
    t: (key: string) => {
      const translations: Record<string, string> = {
        'study.meaning': 'Meaning',
        'study.example': 'Example',
        'study.correct': 'Correct',
        'study.incorrect': 'Incorrect',
      };
      return translations[key] ?? key;
    },
  }),
}));

// ── Minimal valid Flashcard fixture ──────────────────────────────────────────
const MOCK_CARD: Flashcard = {
  id: 'test-card-001',
  level: 'N5',
  kanji: '食べる',
  hiragana: 'たべる',
  romaji: 'taberu',
  meaningId: 'makan',
  meaningEn: 'to eat',
  exampleJp: '私はご飯を食べる。',
  exampleId: 'Saya makan nasi.',
  exampleEn: 'I eat rice.',
  createdAt: new Date('2026-01-01'),
};

const MOCK_CARD_NO_KANJI: Flashcard = {
  ...MOCK_CARD,
  id: 'test-card-002',
  kanji: null,
  hiragana: 'する',
  romaji: 'suru',
  meaningEn: 'to do',
};

describe('FlashCard — Accessibility (WCAG 2.1 AA)', () => {
  it('front face (unrevealed, no grade) has no axe violations', async () => {
    const { container } = render(
      <FlashCard
        card={MOCK_CARD}
        isRevealed={false}
        gradeResult={null}
        cardIndex={0}
        totalCards={10}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('back face (revealed, no grade result) has no axe violations', async () => {
    const { container } = render(
      <FlashCard
        card={MOCK_CARD}
        isRevealed={true}
        gradeResult={null}
        cardIndex={2}
        totalCards={10}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('CORRECT grade result has no axe violations', async () => {
    const { container } = render(
      <FlashCard
        card={MOCK_CARD}
        isRevealed={true}
        gradeResult="CORRECT"
        cardIndex={3}
        totalCards={10}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('INCORRECT grade result has no axe violations', async () => {
    const { container } = render(
      <FlashCard
        card={MOCK_CARD}
        isRevealed={true}
        gradeResult="INCORRECT"
        cardIndex={4}
        totalCards={10}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('card without kanji (kana-only) has no axe violations', async () => {
    const { container } = render(
      <FlashCard
        card={MOCK_CARD_NO_KANJI}
        isRevealed={false}
        gradeResult={null}
        cardIndex={0}
        totalCards={5}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('last card in session (index === total - 1) has no axe violations', async () => {
    const { container } = render(
      <FlashCard
        card={MOCK_CARD}
        isRevealed={true}
        gradeResult="SKIPPED"
        cardIndex={9}
        totalCards={10}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
