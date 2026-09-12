'use client';

// src/components/FlashCard.tsx
// GSAP slide/scale animation (NOT 3D flip — too GPU-heavy on mobile)
// Light theme: white card, warm border, kanji ink-on-paper feel
// Rule 6 compliant: ALL GSAP animations use useGSAP() + contextSafe()
//
// FIX F-1: animateGradeFlash no longer uses hardcoded rgba hex values.
//          Colors are read at runtime via getComputedStyle → CSS tokens respond
//          to dark mode correctly (dark mode sets different --color-success/error values).
// FIX F-2: animateReveal moved from useEffect into useGSAP({ dependencies: [isRevealed] })
//          eliminating the eslint-disable-next-line comment and potential memory leak
//          if the component unmounts before the animation completes.

import { useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Check, X, Volume2 } from 'lucide-react';
import type { Flashcard } from '@/types/entities';
import { useLangStore } from '@/store/langStore';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FlashCardProps {
  card: Flashcard;
  isRevealed: boolean;
  gradeResult?: 'CORRECT' | 'INCORRECT' | 'SKIPPED' | null;
  cardIndex: number;
  totalCards: number;
}

export function FlashCard({ card, isRevealed, gradeResult, cardIndex, totalCards }: FlashCardProps) {
  const { lang, t } = useLangStore();
  const { speak, cancel, isSpeaking, isSupported } = useSpeechSynthesis();
  const cardRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  // Cache prefersReducedMotion once at mount — avoid 3x matchMedia per animation
  const reducedMotion = useRef<boolean>(false);

  // Subscribe to OS-level motion preference change (user may toggle mid-session)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => { reducedMotion.current = e.matches; };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Cancel any in-progress speech when the user navigates to a different card.
  // useEffect here is correct — cancel() is NOT a GSAP call (Rule 6 only bans raw useEffect + gsap).
  useEffect(() => {
    cancel();
  }, [card.id, cancel]);

  // Card entrance animation — runs whenever card.id changes (new card)
  useGSAP(
    () => {
      if (reducedMotion.current) {
        gsap.set(cardRef.current, { opacity: 1, y: 0, scale: 1 });
        return;
      }
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 24, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power2.out' }
      );
    },
    { scope: cardRef, dependencies: [card.id] }
  );

  // F-2 fix: animateReveal moved into useGSAP with dependencies — Rule 6 compliant.
  // No more eslint-disable comment, no more memory leak risk on unmount.
  useGSAP(
    () => {
      if (!isRevealed || !backRef.current || reducedMotion.current) return;
      gsap.fromTo(
        backRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    },
    { scope: cardRef, dependencies: [isRevealed] }
  );

  const { contextSafe } = useGSAP({ scope: cardRef });

  // Flash border on grade result — contextSafe
  // F-1 fix: Colors read from getComputedStyle at animation time.
  // CSS tokens (--color-success, --color-error) resolve to the correct value
  // in both light AND dark mode, unlike hardcoded rgba hex values.
  // eslint-disable-next-line react-hooks/refs -- contextSafe wraps a deferred fn (GSAP ADR-006).
  const animateGradeFlash = contextSafe((result: 'CORRECT' | 'INCORRECT' | 'SKIPPED') => {
    if (!cardRef.current || reducedMotion.current) return;

    // Read computed CSS token color at animation time — dark-mode safe
    const style = getComputedStyle(cardRef.current);
    const successColor = style.getPropertyValue('--color-success').trim() || '134 239 172'; // fallback green
    const errorColor = style.getPropertyValue('--color-error').trim() || '248 113 113';   // fallback red

    // Build RGBA from CSS token value (token stores the raw H S L or R G B channel values)
    // For Tailwind v4 CSS custom properties that store space-separated RGB channels
    const successShadow = `0 0 0 2px rgba(${successColor}, 0.4), var(--shadow-tile-hover)`;
    const errorShadow   = `0 0 0 2px rgba(${errorColor}, 0.4), var(--shadow-tile-hover)`;

    const shadow = result === 'CORRECT' ? successShadow : errorShadow;

    gsap.timeline()
      .to(cardRef.current, { boxShadow: shadow, duration: 0.2, ease: 'power1.out' })
      .to(cardRef.current, { boxShadow: 'var(--shadow-tile)', duration: 0.6, ease: 'power1.inOut', delay: 0.4 });
  });

  const handleContextMenu = contextSafe((e: React.MouseEvent) => {
    e.preventDefault();
  });

  // gradeResult trigger — contextSafe wraps the GSAP call, so the fn reference is stable.
  // exhaustive-deps is suppressed intentionally: animateGradeFlash is created via contextSafe()
  // which is scoped to the GSAP context — re-creating it on every render would break the scope.
  // This is the documented GSAP + React exception per ADR-006 and Rule 6.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (gradeResult) animateGradeFlash(gradeResult); }, [gradeResult]);

  // meaning: both 'en' and 'ja' show the English meaning (lingua franca).
  // If Indonesian ('id') is added to Language enum in the future, extend here.
  const meaning = card.meaningEn;
  const example =
    lang === 'ja' ? card.exampleJp : card.exampleEn;

  return (
    <div
      ref={cardRef}
      id={`flashcard-${card.id}`}
      onContextMenu={handleContextMenu}
      className={cn(
        "relative flex flex-col gap-5 min-h-80 overflow-hidden p-8 pb-7",
        "bg-(--color-surface) border-[1.5px] border-(--color-border) rounded-(--radius-tile) shadow-(--shadow-tile)",
        "transition-colors duration-250 ease-out",
        gradeResult === 'CORRECT' && "border-green-800/30 bg-green-900/8",
        gradeResult === 'INCORRECT' && "border-red-800/30 bg-red-900/8"
      )}
    >
      {/* Top accent line — vermilion stripe */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-0.75 rounded-t-2xl transition-colors duration-300",
          !gradeResult && "bg-linear-to-r from-(--color-primary) to-(--color-accent)",
          gradeResult === 'CORRECT' && "bg-linear-to-r from-green-700 to-green-500",
          gradeResult === 'INCORRECT' && "bg-linear-to-r from-red-600 to-red-400"
        )}
      />

      {/* Card header: level badge + progress */}
      <div className="flex items-center justify-between">
        <span className="badge-level">{card.level}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-(--color-muted)">
            {cardIndex + 1} / {totalCards}
          </span>
          {/* Mini progress dots */}
          <div className="flex gap-0.75">
            {Array.from({ length: Math.min(totalCards, 8) }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.25 h-1.25 rounded-full transition-colors duration-200",
                  i < cardIndex + 1 ? "bg-(--color-primary)" : "bg-(--color-border)"
                )}
              />
            ))}
            {totalCards > 8 && (
              <span className="text-[10px] text-(--color-muted) leading-1.25">…</span>
            )}
          </div>
        </div>
      </div>

      {/* Front: Japanese display — ink on paper */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 py-4">
        {card.kanji && (
          <p className="text-[clamp(48px,10vw,72px)] font-bold font-jp text-(--color-kanji) leading-[1.1] text-center tracking-[0.02em]" lang="ja">
            {card.kanji}
          </p>
        )}
        <p
          className={cn(
            "text-[clamp(28px,6vw,40px)] font-medium font-jp leading-[1.3] text-center",
            card.kanji ? "text-(--color-kanji-reading)" : "text-(--color-kanji)"
          )}
          lang="ja"
        >
          {card.hiragana}
        </p>

        {/* 🔊 Pronunciation button — browser-native TTS, no API key required.
             Only rendered when: (1) browser supports SpeechSynthesis, (2) card is not yet revealed.
             Hides on unsupported browsers (iOS < 14.5, some Android WebViews) without throwing. */}
        {isSupported && !isRevealed && (
          <button
            id={`btn-pronounce-${card.id}`}
            type="button"
            onClick={() => speak(card.hiragana)}
            aria-label={isSpeaking ? t('study.pronouncing') : t('study.pronounce')}
            className={cn(
              "mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full",
              "text-xs font-semibold transition-all duration-200 select-none",
              "border border-(--color-border) bg-(--color-surface-raised)",
              "text-(--color-muted) hover:text-(--color-text) hover:border-(--color-border-strong)",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)/60",
              // Speaking state: amber ring + pulsing glow — uses CSS token, dark-mode safe
              isSpeaking && [
                "border-(--color-accent) text-(--color-accent)",
                "ring-2 ring-(--color-accent)/25 animate-pulse"
              ]
            )}
          >
            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isSpeaking ? t('study.pronouncing') : t('study.pronounce')}</span>
          </button>
        )}
      </div>

      {/* Back: revealed answer */}
      {isRevealed && (
        <div
          ref={backRef}
          className="border-t border-(--color-border) pt-5 flex flex-col gap-3.5"
        >
          {/* Meaning */}
          <div>
            <p className="text-[10px] font-semibold text-(--color-muted) uppercase tracking-widest mb-1">
              {t('study.meaning')}
            </p>
            <p className="text-[22px] font-bold text-(--color-text) leading-snug">
              {meaning}
            </p>
            <p className="font-mono text-[13px] text-(--color-muted) mt-1">
              {card.romaji}
            </p>
          </div>

          {/* Example sentence */}
          {example && (
            <div className="border-l-[3px] border-(--color-primary-muted) pl-3 rounded-r-md">
              <p className="text-[10px] font-semibold text-(--color-muted) uppercase tracking-widest mb-1">
                {t('study.example')}
              </p>
              <p className="text-[14px] font-jp text-(--color-text)" lang="ja">
                {card.exampleJp}
              </p>
              <p className="text-[13px] text-(--color-text-secondary) mt-1">
                {example}
              </p>
            </div>
          )}

          {/* Grade result indicator */}
          {gradeResult && (
            <div className="flex items-center gap-2 mt-2">
              <span className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-(--radius-badge) border",
                // a11y: text-green-900 (#14532d) on bg-green-900/10 ≈ 7.2:1 contrast (WCAG AA ✅)
                // a11y: text-red-900 (#7f1d1d) on bg-red-900/10 ≈ 7.1:1 contrast (WCAG AA ✅)
                gradeResult === 'CORRECT'
                  ? "border-green-800/25 bg-green-900/10 text-green-900"
                  : "border-red-800/25 bg-red-900/10 text-red-900"
              )}>
                {gradeResult === 'CORRECT' ? <><Check className="w-3 h-3" /> {t('study.correct')}</> : <><X className="w-3 h-3" /> {t('study.incorrect')}</>}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
