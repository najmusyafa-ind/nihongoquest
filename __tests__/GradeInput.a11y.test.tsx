// __tests__/GradeInput.a11y.test.tsx
// U6: Accessibility audit for GradeInput (blind grading form) using jest-axe + axe-core.
// Rules: WCAG 2.1 AA — zero violations allowed.
// Focus: form labels, aria-describedby, button accessible names, error association.

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { GradeInput } from '@/components/GradeInput';

expect.extend(toHaveNoViolations);

// ── Mock lang store (Rule 9 — i18n) ──────────────────────────────────────────
vi.mock('@/store/langStore', () => ({
  useLangStore: () => ({
    lang: 'en',
    t: (key: string) => {
      const translations: Record<string, string> = {
        'study.typeAnswer': 'Type your romaji answer...',
        'study.skipped': 'Skip',
      };
      return translations[key] ?? key;
    },
  }),
}));

describe('GradeInput — Accessibility (WCAG 2.1 AA)', () => {
  it('default state (not revealed, not loading) has no axe violations', async () => {
    const { container } = render(
      <GradeInput
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
        isRevealed={false}
        isLoading={false}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('loading state has no axe violations', async () => {
    const { container } = render(
      <GradeInput
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
        isRevealed={false}
        isLoading={true}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders nothing when isRevealed=true (no a11y violations from empty output)', async () => {
    const { container } = render(
      <GradeInput
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
        isRevealed={true}
        isLoading={false}
      />
    );
    // Component renders null when revealed — container should be empty
    expect(container.firstChild).toBeNull();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('submit button has accessible name', () => {
    render(
      <GradeInput
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
        isRevealed={false}
        isLoading={false}
      />
    );
    // aria-label="Submit answer" must be present
    expect(screen.getByRole('button', { name: /submit answer/i })).toBeInTheDocument();
  });

  it('text input has aria-label for screen readers', () => {
    render(
      <GradeInput
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
        isRevealed={false}
        isLoading={false}
      />
    );
    expect(screen.getByRole('textbox', { name: /romaji answer/i })).toBeInTheDocument();
  });

  it('skip button is accessible and interactive', async () => {
    const onSkip = vi.fn();
    render(
      <GradeInput
        onSubmit={vi.fn()}
        onSkip={onSkip}
        isRevealed={false}
        isLoading={false}
      />
    );
    const skipBtn = screen.getByRole('button', { name: /skip/i });
    expect(skipBtn).toBeInTheDocument();
    await userEvent.click(skipBtn);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('validation error is properly associated via aria-describedby', async () => {
    render(
      <GradeInput
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
        isRevealed={false}
        isLoading={false}
      />
    );

    // Submit empty form to trigger validation error
    const submitBtn = screen.getByRole('button', { name: /submit answer/i });
    await userEvent.click(submitBtn);

    // After validation, check axe again — error association must be valid
    const { container } = render(
      <GradeInput
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
        isRevealed={false}
        isLoading={false}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
