'use client';

// src/components/SessionClient.tsx — Active study session
// Manages: card display, blind grading, AI explainer, session completion

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trophy, Sparkles, Zap, BarChart3, CheckCircle2, Layers } from 'lucide-react';
import { FlashCard } from './FlashCard';
import { GradeInput } from './GradeInput';
import { AiExplainer } from './AiExplainer';
import { useLangStore } from '@/store/langStore';
import { useStudyStore } from '@/store/studyStore';
import { checkRomajiAnswer, formatAccuracy } from '@/lib/format';
import { triggerPostSessionToasts } from '@/lib/motivational-toasts';
import type { Flashcard } from '@/types/entities';
import type { GradeResult, JlptLevel } from '@/types/enums';

interface CardResult {
  flashcardId: string;
  userAnswer: string;
  result: GradeResult;
}

type SessionPhase = 'loading' | 'studying' | 'complete';

function SessionInner() {
  const { t, lang } = useLangStore();
  const { isOnline, cachedCards, addPendingSession } = useStudyStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const level = (searchParams.get('level') ?? 'N5') as JlptLevel;
  /** cardsPerSession forwarded from DeckSelectorClient via URL — clamped [5,50] in API */
  const count = Math.min(50, Math.max(5, Number(searchParams.get('count') ?? '20')));

  const [phase, setPhase] = useState<SessionPhase>('loading');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [results, setResults] = useState<CardResult[]>([]);
  const [currentGrade, setCurrentGrade] = useState<GradeResult | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [sessionStartTime] = useState(() => new Date());

  // Load cards — online first, then cached fallback
  useEffect(() => {
    async function loadCards() {
      try {
        if (isOnline) {
          const response = await fetch(`/api/cards?level=${level}&count=${count}`);
          if (response.ok) {
            const data = await response.json() as { cards: Flashcard[] };
            // LG-6 guard: server returned success but empty cards array (edge case)
            if (!Array.isArray(data.cards) || data.cards.length === 0) {
              toast.error(t('common.error') + ' — No cards available for this level.');
              router.push('/study');
              return;
            }
            setCards(data.cards);
            setPhase('studying');
            return;
          }
        }

        // Offline fallback — respect count setting
        const cached = cachedCards[level];
        if (cached && cached.length > 0) {
          const shuffled = [...cached].sort(() => Math.random() - 0.5).slice(0, count);
          setCards(shuffled);
          setPhase('studying');
          toast.info(t('sync.offline'));
        } else {
          toast.error(t('sync.offline') + ' — ' + t('common.error'));
          router.push('/study');
        }
      } catch {
        toast.error(t('common.error'));
        router.push('/study');
      }
    }
    void loadCards();
  }, [level, count, isOnline, cachedCards, router, t]);

  const currentCard = cards[currentIndex];

  const handleAnswer = useCallback((userAnswer: string, grade: GradeResult) => {
    if (!currentCard) return;
    setResults(prev => [...prev, { flashcardId: currentCard.id, userAnswer, result: grade }]);
    setCurrentGrade(grade);
    setIsRevealed(true);
  }, [currentCard]);

  const handleSubmitAnswer = (answer: string) => {
    if (!currentCard) return;
    const grade: GradeResult = !answer.trim()
      ? 'SKIPPED'
      : checkRomajiAnswer(answer, currentCard.romaji) ? 'CORRECT' : 'INCORRECT';
    handleAnswer(answer, grade);
  };

  const handleNextCard = useCallback(() => {
    setIsRevealed(false);
    setCurrentGrade(null);

    if (currentIndex >= cards.length - 1) {
      const correctCount = results.filter(r => r.result === 'CORRECT').length;
      const incorrectCount = results.filter(r => r.result === 'INCORRECT').length;
      const skippedCount = results.filter(r => r.result === 'SKIPPED').length;
      const accuracyPct = cards.length > 0 ? Math.round((correctCount / cards.length) * 100) : 0;

      if (!isOnline) {
        addPendingSession({
          session: {
            id: sessionId,
            // B-6: Empty string is a safe placeholder for offline queuing.
            // syncToServer() POSTs to /api/sessions — the server reads userId from
            // the validated Supabase cookie, NOT from this payload. Never pass this
            // object directly to StudySessionRepository.createSession().
            userId: '',
            level,
            status: 'COMPLETED',
            totalCards: cards.length,
            correctCount,
            incorrectCount,
            skippedCount,
            startedAt: sessionStartTime,
            completedAt: new Date(),
          },
          results: results.map(r => ({
            sessionId,
            // Same as above — userId resolved server-side on sync
            userId: '',
            flashcardId: r.flashcardId,
            sourceMode: 'FLASHCARD' as const, // ADR-010: SessionClient is flashcard-mode only
            vocabKey: null,                   // null for FLASHCARD mode (quiz uses vocab strings)
            userAnswer: r.userAnswer,
            result: r.result,
          })),
        });
        toast.info(t('sync.offline'));
        // Fire motivational toasts even in offline mode
        triggerPostSessionToasts({
          streakDays: 1,     // Unknown streak offline — assume day 1
          accuracy: accuracyPct,
          cardsStudied: cards.length,
          isFirstToday: true,
          lang: lang as 'en' | 'ja',
        });
      } else {
        void fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: sessionId,
            level,
            status: 'COMPLETED',
            totalCards: cards.length,
            correctCount,
            incorrectCount,
            skippedCount,
            startedAt: sessionStartTime.toISOString(),
            completedAt: new Date().toISOString(),
          }),
        }).then(async (res) => {
          if (res.ok) {
            toast.success(t('sync.synced'));
            // Fetch updated streak from analytics to power accurate streak toast
            try {
              const analyticsRes = await fetch('/api/analytics/summary');
              const streakDays =
                analyticsRes.ok
                  ? ((await analyticsRes.json()) as { streakDays: number }).streakDays ?? 1
                  : 1;
              triggerPostSessionToasts({
                streakDays,
                accuracy: accuracyPct,
                cardsStudied: cards.length,
                isFirstToday: streakDays === 1,
                lang: lang as 'en' | 'ja',
              });
            } catch {
              // Non-critical — fire with defaults if analytics fetch fails
              triggerPostSessionToasts({
                streakDays: 1,
                accuracy: accuracyPct,
                cardsStudied: cards.length,
                isFirstToday: true,
                lang: lang as 'en' | 'ja',
              });
            }
          }
        }).catch(() => {
          // Non-critical — session still visible in UI
        });
      }
      setPhase('complete');
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, cards.length, results, isOnline, sessionId, level, sessionStartTime, addPendingSession, t, lang]);

  // ── Loading ──
  if (phase === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="skeleton" style={{ height: '48px', width: '200px', borderRadius: '8px' }} />
        <div className="skeleton bento-tile" style={{ height: '320px' }} />
        <div className="skeleton" style={{ height: '52px', borderRadius: '8px' }} />
      </div>
    );
  }

  // ── Complete ──
  if (phase === 'complete' || !currentCard) {
    const correctCount = results.filter(r => r.result === 'CORRECT').length;
    const total = results.length;
    const accuracy = formatAccuracy(correctCount, total);

    // Completion icon — Lucide only
    const CompletionIcon = accuracy >= 80 ? Trophy : accuracy >= 60 ? Sparkles : Zap;

    const completionIconColor =
      accuracy >= 80
        ? 'var(--color-accent)'
        : accuracy >= 60
          ? 'var(--color-primary)'
          : 'var(--color-text-secondary)';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Completion header */}
        <div className="bento-tile bento-tile--primary-accent" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
            <CompletionIcon
              className="icon-2xl"
              aria-hidden="true"
              style={{ color: completionIconColor }}
            />
          </div>
          <h2
            style={{
              fontSize: 'clamp(20px, 4vw, 26px)',
              fontWeight: 700,
              color: 'var(--color-text)',
              marginBottom: '6px',
            }}
          >
            {t('study.sessionComplete')}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
            {level} · {total} {t('study.cards')}
          </p>
        </div>

        {/* Stat tiles */}
        <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            {
              value: correctCount,
              label: t('study.correct'),
              Icon: CheckCircle2,
              color: 'var(--color-success)',
              bg: 'var(--color-success-muted)',
            },
            {
              value: `${accuracy}%`,
              label: t('study.accuracy'),
              Icon: BarChart3,
              color: accuracy >= 70 ? 'var(--color-success)' : 'var(--color-primary)',
              bg: accuracy >= 70 ? 'var(--color-success-muted)' : 'var(--color-primary-soft)',
            },
            {
              value: total,
              label: t('study.cards'),
              Icon: Layers,
              color: 'var(--color-text)',
              bg: 'var(--color-surface-raised)',
            },
          ].map(({ value, label, Icon, color, bg }) => (
            <div
              key={label}
              className="bento-tile"
              style={{ textAlign: 'center', backgroundColor: bg }}
            >
              <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'center', color }}>
                <Icon className="icon-md" aria-hidden="true" />
              </div>
              <p
                style={{
                  fontSize: 'clamp(24px, 5vw, 34px)',
                  fontWeight: 700,
                  color,
                  lineHeight: 1,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {value}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '6px' }}>{label}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => router.push(`/session?level=${level}`)}>
            {t('study.tryAgain')}
          </button>
          <button className="btn-ghost" onClick={() => router.push('/dashboard')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <BarChart3 className="icon-sm" aria-hidden="true" />
            {t('nav.dashboard')}
          </button>
        </div>
      </div>
    );
  }

  // ── Studying ──
  const progressPercent = Math.round((currentIndex / cards.length) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="progress-track" style={{ flex: 1 }}>
          <div
            className="progress-fill"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <span className="text-mono" style={{ fontSize: '12px', color: 'var(--color-muted)', flexShrink: 0 }}>
          {currentIndex + 1} / {cards.length}
        </span>
      </div>

      <FlashCard
        card={currentCard}
        isRevealed={isRevealed}
        gradeResult={currentGrade}
        cardIndex={currentIndex}
        totalCards={cards.length}
      />

      {!isRevealed && (
        <GradeInput
          onSubmit={handleSubmitAnswer}
          onSkip={() => handleAnswer('', 'SKIPPED')}
          isRevealed={isRevealed}
        />
      )}

      {isRevealed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <AiExplainer card={currentCard} />
          <button
            id="next-card-btn"
            className="btn-primary"
            onClick={handleNextCard}
            style={{ alignSelf: 'flex-end' }}
          >
            {currentIndex >= cards.length - 1 ? `${t('study.sessionComplete')} ✓` : `${t('study.nextCard')} →`}
          </button>
        </div>
      )}
    </div>
  );
}

// Wrap in Suspense because useSearchParams() requires it
export function SessionClient() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="skeleton" style={{ height: '48px', width: '200px', borderRadius: '8px' }} />
        <div className="skeleton bento-tile" style={{ height: '320px' }} />
      </div>
    }>
      <SessionInner />
    </Suspense>
  );
}
