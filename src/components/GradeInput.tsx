'use client';

// src/components/GradeInput.tsx — Blind Grading Input
// User types answer BEFORE seeing the correct answer
// React Hook Form + Zod validation

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLangStore } from '@/store/langStore';

const gradeSchema = z.object({
  answer: z.string().min(1, 'Please type an answer or skip'),
});

type GradeFormValues = z.infer<typeof gradeSchema>;

interface GradeInputProps {
  onSubmit: (answer: string) => void;
  onSkip: () => void;
  isRevealed: boolean;
  isLoading?: boolean;
}

export function GradeInput({ onSubmit, onSkip, isRevealed, isLoading = false }: GradeInputProps) {
  const { t } = useLangStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GradeFormValues>({
    resolver: zodResolver(gradeSchema),
  });

  // Auto-focus and reset when card changes (isRevealed goes false)
  useEffect(() => {
    if (!isRevealed) {
      reset();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isRevealed, reset]);

  const onFormSubmit = (data: GradeFormValues) => {
    onSubmit(data.answer);
  };

  if (isRevealed) {
    return null; // Input hidden after reveal
  }

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
    >
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <input
            {...register('answer')}
            ref={(el) => {
              register('answer').ref(el);
              (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
            }}
            id="grade-answer-input"
            type="text"
            className="input-grade"
            placeholder={t('study.typeAnswer')}
            disabled={isLoading}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-label="Type your romaji answer"
            aria-describedby={errors.answer ? 'grade-error' : undefined}
          />
          {errors.answer && (
            <p id="grade-error" style={{ fontSize: '12px', color: 'var(--color-destructive)', marginTop: '4px' }}>
              {errors.answer.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          id="grade-submit-btn"
          className="btn-primary"
          disabled={isLoading}
          style={{ flexShrink: 0 }}
          aria-label="Submit answer"
        >
          →
        </button>
      </div>

      <button
        type="button"
        id="grade-skip-btn"
        className="btn-ghost"
        onClick={onSkip}
        disabled={isLoading}
        style={{ alignSelf: 'flex-start', fontSize: '13px', padding: '6px 14px', minHeight: '36px' }}
      >
        {t('study.skipped')} →
      </button>
    </form>
  );
}
