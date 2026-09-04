'use client';

// src/components/DeckSelectorClient.tsx — JLPT level deck selection
// Light bento grid with vibrant level cards + lifted hover effect

import { useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useLangStore } from '@/store/langStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { JlptLevel } from '@/types/enums';
import {
  Sprout,
  BookOpen,
  Newspaper,
  Briefcase,
  Trophy,
  Lock,
  Clock,
  Flag,
  Check,
} from 'lucide-react';

/* ─── Level configuration — all colors via CSS token classes ─── */
const JLPT_LEVELS = [
  {
    level: 'N5' as JlptLevel,
    description: 'Beginner — Basic vocabulary & grammar',
    descriptionJa: '入門・基礎単語と文法',
    cards: 20,
    levelClass: 'level-n5',
    Icon: Sprout,
  },
  {
    level: 'N4' as JlptLevel,
    description: 'Elementary — Daily conversation basics',
    descriptionJa: '初級・日常会話の基礎',
    cards: 18,
    levelClass: 'level-n4',
    Icon: BookOpen,
  },
  {
    level: 'N3' as JlptLevel,
    description: 'Intermediate — Reading & listening',
    descriptionJa: '中級・読解とリスニング',
    cards: 0,
    levelClass: 'level-n3',
    Icon: Newspaper,
  },
  {
    level: 'N2' as JlptLevel,
    description: 'Upper-Intermediate — Business Japanese',
    descriptionJa: '上中級・ビジネス日本語',
    cards: 0,
    levelClass: 'level-n2',
    Icon: Briefcase,
  },
  {
    level: 'N1' as JlptLevel,
    description: 'Advanced — Near-native proficiency',
    descriptionJa: '上級・ネイティブレベル',
    cards: 0,
    levelClass: 'level-n1',
    Icon: Trophy,
  },
] as const;

export function DeckSelectorClient() {
  const { lang, t } = useLangStore();
  const { cardsPerSession } = useSettingsStore();
  const router = useRouter();
  const [selected, setSelected] = useState<JlptLevel | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // useSyncExternalStore — canonical React 18 hydration-safe client check.
  // Avoids useEffect+setState which triggers set-state-in-effect lint rule.
  const isMounted = useSyncExternalStore(
    () => () => {},          // subscribe — no external store, always stable
    () => true,              // getSnapshot (client)
    () => false,             // getServerSnapshot (SSR)
  );

  useGSAP(
    () => {
      const root = containerRef.current;
      if (!root) return;

      const header = root.querySelector('.deck-header');
      const cards = root.querySelectorAll('.deck-card');
      const startBtn = root.querySelector('.deck-start-btn');

      if (header) {
        gsap.fromTo(
          header,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
        );
      }

      if (cards.length > 0) {
        gsap.fromTo(
          Array.from(cards),
          { opacity: 0, y: 24, scale: 0.97 },
          {
            opacity: 1, y: 0, scale: 1,
            duration: 0.4, ease: 'power2.out',
            stagger: 0.07, delay: 0.15,
          }
        );
      }

      if (startBtn) {
        gsap.fromTo(
          startBtn,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', delay: 0.5 }
        );
      }
    },
    { scope: containerRef }
  );

  const handleStart = () => {
    if (!selected) return;
    router.push(`/session?level=${selected}&count=${cardsPerSession}`);
  };

  const isDemoMode = isMounted && !process.env['NEXT_PUBLIC_SUPABASE_URL'];

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div className="deck-header" style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
          <span className="badge-pill">JLPT Levels</span>

          {/* Demo mode indicator */}
          {isDemoMode && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'var(--color-accent-soft)',
                color: 'var(--color-accent-dark)',
                border: '1px solid var(--color-accent-muted)',
              }}
            >
              <Flag className="icon-xs" aria-hidden="true" />
              Demo Mode
            </span>
          )}
        </div>

        <h1
          style={{
            fontSize: 'clamp(24px, 4vw, 32px)',
            fontWeight: 700,
            color: 'var(--color-text)',
            marginBottom: '0.4rem',
            letterSpacing: '-0.01em',
          }}
        >
          {t('study.selectLevel')}
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '15px' }}>
          {t('study.selectLevelSubtitle')}
        </p>
      </div>

      {/* Bento grid of level cards */}
      <div
        className="bento-grid"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          marginBottom: '1.75rem',
        }}
      >
        {JLPT_LEVELS.map(({ level, description, descriptionJa, cards, levelClass, Icon }) => {
          const isSelected = selected === level;
          const isLocked = cards === 0;

          return (
            <button
              key={level}
              id={`deck-${level}`}
              onClick={() => !isLocked && setSelected(level)}
              disabled={isLocked}
              style={{ all: 'unset', cursor: isLocked ? 'not-allowed' : 'pointer', display: 'block' }}
              aria-pressed={isSelected}
              aria-label={`${level} — ${lang === 'ja' ? descriptionJa : description}`}
            >
              {/*
                .deck-card + .level-n* → CSS custom properties cascade:
                --level-accent, --level-accent-bg, --level-accent-border
                are set by .level-n* and consumed by .deck-card__icon etc.
              */}
              <div
                className={`deck-card bento-tile ${levelClass}${isSelected ? ' deck-card--selected' : ''}`}
                style={{
                  border: isSelected
                    ? `2px solid var(--level-accent)`
                    : isLocked
                    ? `1.5px solid var(--level-accent-border)`
                    : `2px solid var(--level-accent-border)`,
                  backgroundColor: isSelected
                    ? 'var(--level-accent-bg)'
                    : isLocked
                    ? 'var(--color-surface)'
                    : 'var(--level-accent-bg)',   /* unlocked always gets tint */
                  boxShadow: isSelected
                    ? '0 0 0 3px var(--level-accent)33, 0 4px 16px rgba(0,0,0,0.12)'
                    : isLocked
                    ? '0 1px 3px rgba(0,0,0,0.05)'
                    : '0 2px 8px rgba(0,0,0,0.08)',
                  opacity: isLocked ? 0.6 : 1,
                  transition: 'border-color 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s cubic-bezier(0.34,1.56,0.64,1), background-color 0.18s cubic-bezier(0.34,1.56,0.64,1), transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',
                  textAlign: 'left',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                }}
              >
                {/* Top row: icon + lock/check */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  {/* Icon box */}
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                    background: isSelected
                      ? 'var(--level-accent)'
                      : isLocked
                      ? 'var(--level-accent-bg)'
                      : '#ffffff',          /* white chip on pastel card — always visible */
                    border: `1.5px solid var(--level-accent-border)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isSelected ? '#fff' : 'var(--level-accent)',
                    transition: 'background 0.18s ease, color 0.18s ease',
                    boxShadow: (!isSelected && !isLocked) ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                  }}>
                    <Icon style={{ width: '20px', height: '20px' }} aria-hidden="true" />
                  </div>

                  {isLocked && (
                    <Lock
                      style={{ width: '16px', height: '16px', color: 'var(--color-muted)', marginTop: '4px' }}
                      aria-hidden="true"
                    />
                  )}
                  {isSelected && !isLocked && (
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                      background: 'var(--level-accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                    }}>
                      <Check style={{ width: '14px', height: '14px', color: '#fff' }} aria-hidden="true" />
                    </div>
                  )}
                </div>

                {/* Level label — large, colored, bold */}
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '24px',
                  fontWeight: 800,
                  color: isLocked ? 'var(--level-accent)' : 'var(--level-accent-text, var(--level-accent))',
                  lineHeight: 1,
                  marginBottom: '6px',
                  letterSpacing: '-0.02em',
                }}>
                  {level}
                </p>

                {/* Description */}
                <p style={{
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5,
                  marginBottom: '0.75rem',
                }}>
                  {lang === 'ja' ? descriptionJa : description}
                </p>

                {/* Card count / coming soon */}
                <p style={{
                  fontSize: '11px', fontWeight: 700,
                  color: isLocked ? 'var(--color-muted)' : 'var(--level-accent-text, var(--level-accent))',
                  letterSpacing: '0.04em',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  {isLocked
                    ? <><Clock style={{ width: '12px', height: '12px' }} aria-hidden="true" /> {lang === 'ja' ? 'もうすぐ' : 'Coming soon'}</>
                    : `${cards} ${t('study.cards')}`
                  }
                </p>
              </div>
            </button>

          );
        })}
      </div>

      {/* Start session button */}
      <button
        id="start-session-btn"
        onClick={handleStart}
        disabled={!selected}
        className="btn-primary deck-start-btn"
        style={{ fontSize: '15px', padding: '13px 32px' }}
      >
        {t('study.startSession')} →
      </button>

      {selected && (
        <p
          style={{
            marginTop: '10px',
            fontSize: '13px',
            color: 'var(--color-muted)',
          }}
        >
          {lang === 'ja'
            ? `${selected}を選択中 — ${JLPT_LEVELS.find((l) => l.level === selected)?.cards ?? 0}${t('study.cards')}`
            : `${selected} selected — ${JLPT_LEVELS.find((l) => l.level === selected)?.cards ?? 0} ${t('study.cards')}`
          }
        </p>
      )}
    </div>
  );
}
