'use client';

// src/components/QuizClient.tsx — JLPT-style multiple choice quiz
// 4 options, timer per question, score summary at end
// ✅ Phase 6A: Connected to /api/quiz/start — no more hardcoded VOCAB_POOL
// ✅ GAP-1 FIX: Quiz session POSTed to /api/sessions on completion

import { useRef, useState, useEffect, useCallback } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Brain, CheckCircle2, XCircle, RotateCcw, Trophy, Clock, AlertCircle, Target, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useLangStore } from '@/store/langStore';
import { useSettingsStore } from '@/store/settingsStore';
import { triggerStudyToast } from '@/lib/motivational-toasts';
import type { QuizQuestion } from '@/types/quiz.types';

// ── Async State — discriminated union, no impossible states ────────────────────
type QuizAsyncState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; questions: QuizQuestion[] };

const TIMER_SECONDS = 30;

// ── Main Component ─────────────────────────────────────────────────────────────
type Screen = 'start' | 'question' | 'result';

export function QuizClient() {
  const { lang } = useLangStore();
  const { cardsPerSession, activeLevels } = useSettingsStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const [screen, setScreen]             = useState<Screen>('start');
  const [fetchState, setFetch]          = useState<QuizAsyncState>({ status: 'idle' });
  const [questions, setQuestions]       = useState<QuizQuestion[]>([]);
  const [current, setCurrent]           = useState(0);
  const [selected, setSelected]         = useState<string | null>(null);
  const [answers, setAnswers]           = useState<boolean[]>([]);
  const [timeLeft, setTimeLeft]         = useState(TIMER_SECONDS);
  const [timedOut, setTimedOut]         = useState(false);
  // GAP-1 FIX: Track session metadata for backend persistence on quiz complete
  const [sessionId, setSessionId]       = useState<string>('');
  const [sessionStartTime, setStartTime] = useState<string>('');

  useGSAP(
    () => {
      const root = containerRef.current;
      if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.fromTo(root.children, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.08 });
    },
    { scope: containerRef, dependencies: [screen] }
  );

  // ── Advance to next question ────────────────────────────────────────────────
  const goNext = useCallback(() => {
    setCurrent((c) => {
      const next = c + 1;
      if (next >= questions.length) {
        setScreen('result');
        return c;
      }
      setSelected(null);
      setTimedOut(false);
      setTimeLeft(TIMER_SECONDS);
      return next;
    });
  }, [questions.length]);

  // ── Timer countdown ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'question' || selected !== null || timedOut) return;
    const id = setTimeout(() => {
      if (timeLeft <= 0) {
        setTimedOut(true);
        setAnswers((a) => [...a, false]);
        setTimeout(() => goNext(), 900);
      } else {
        setTimeLeft((s) => s - 1);
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [screen, selected, timedOut, timeLeft, goNext]);

  // ── Fetch questions from /api/quiz/start ────────────────────────────────────
  const fetchQuestions = useCallback(async (): Promise<QuizQuestion[] | null> => {
    const level = activeLevels[0] ?? 'N5';
    setFetch({ status: 'loading' });
    try {
      const res = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, count: cardsPerSession }),
      });

      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        const msg =
          typeof data === 'object' && data !== null && 'error' in data
            ? String((data as { error: { message?: string } }).error?.message ?? res.statusText)
            : res.statusText;
        setFetch({ status: 'error', message: msg });
        return null;
      }

      const data: { questions: QuizQuestion[] } = await res.json();
      setFetch({ status: 'success', questions: data.questions });
      return data.questions;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error. Please try again.';
      setFetch({ status: 'error', message: msg });
      return null;
    }
  }, [activeLevels, cardsPerSession]);

  // ── Start quiz — fetch then transition ──────────────────────────────────────
  const startQuiz = useCallback(async () => {
    const qs = await fetchQuestions();
    if (!qs || qs.length === 0) return;
    // GAP-1 FIX: Generate session ID and record start time BEFORE transitioning
    const newSessionId = crypto.randomUUID();
    const newStartTime = new Date().toISOString();
    setSessionId(newSessionId);
    setStartTime(newStartTime);
    setQuestions(qs);
    setCurrent(0);
    setSelected(null);
    setAnswers([]);
    setTimeLeft(TIMER_SECONDS);
    setTimedOut(false);
    setScreen('question');
  }, [fetchQuestions]);

  const handleAnswer = (opt: string) => {
    if (selected || timedOut) return;
    const q = questions[current];
    if (!q) return;
    const correct = opt === q.correctAnswer;
    setSelected(opt);
    setAnswers((a) => [...a, correct]);
    setTimeout(() => goNext(), 1200);
  };

  const score = answers.filter(Boolean).length;
  const total = questions.length;
  const pct   = total > 0 ? Math.round((score / total) * 100) : 0;

  // ── Persist quiz session to backend + fire motivational toast ───────────────
  // GAP-1 FIX: POST to /api/sessions so quiz counts in analytics, streaks,
  // and achievements. Fire-and-forget (best-effort) — UX is not blocked.
  useEffect(() => {
    if (screen !== 'result' || total === 0 || !sessionId) return;

    const level = questions[0]?.level ?? 'N5';
    const completedAt = new Date().toISOString();
    const incorrectCount = total - score;

    // POST session to API (best-effort — don't block result display on failure)
    void fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: sessionId,
        level,
        status: 'COMPLETED',
        totalCards: total,
        correctCount: score,
        incorrectCount,
        skippedCount: 0,
        startedAt: sessionStartTime,
        completedAt,
      }),
    }).then(async (res) => {
      if (!res.ok) {
        // Log failure but don't disrupt the result UI
        toast.error(
          lang === 'ja'
            ? 'クイズの結果を保存できませんでした。'
            : 'Could not save quiz results. Your score is still displayed.',
          { duration: 4000 }
        );
      }
    }).catch(() => {
      // Network failure — silently fail (quiz result still shown)
    });

    // Motivational toast (existing behavior — unchanged)
    triggerStudyToast(
      { type: 'quiz_complete', score, total },
      lang as 'en' | 'ja'
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]); // Only fire once when screen transitions to 'result'

  // ── Start Screen ────────────────────────────────────────────────────────────
  if (screen === 'start') {
    return (
      <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
            <span className="badge-pill">
              <Brain size={10} aria-hidden style={{ marginRight: '4px' }} />
              {lang === 'ja' ? 'クイズ' : 'Quiz'}
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em', marginBottom: '0.25rem' }}>
            {lang === 'ja' ? 'JLPTクイズモード' : 'JLPT Quiz Mode'}
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
            {lang === 'ja' ? '4択問題でJLPT語彙力をテスト' : 'Test your vocabulary with 4-choice JLPT-style questions'}
          </p>
        </div>

        <div className="bento-tile" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Mode explainer banner */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            padding: '12px 14px', borderRadius: '8px',
            background: 'var(--color-primary-muted)',
            border: '1px solid rgba(233,69,96,0.25)',
          }}>
            <Target size={16} aria-hidden style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '2px' }}>
                {lang === 'ja' ? 'クイズモードとは？' : 'Quiz Mode — What\'s different?'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {lang === 'ja'
                  ? '4択問題形式・タイマーあり。学習（Study）と違い、ヒントなし。実力を試そう！'
                  : '4 choices · timed · no hints. Unlike Study mode, you\'re on your own. Test your real knowledge!'}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: lang === 'ja' ? '問題数'   : 'Questions', value: cardsPerSession },
              { label: lang === 'ja' ? '制限時間' : 'Time / Q',  value: `${TIMER_SECONDS}s` },
              { label: lang === 'ja' ? 'レベル'   : 'Level',     value: activeLevels[0] ?? 'N5' },
              { label: lang === 'ja' ? '問題形式' : 'Format',    value: lang === 'ja' ? '4択' : '4 choices' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '12px 14px' }}>
                <p style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Error banner — shown after a failed fetch */}
          {fetchState.status === 'error' && (
            <div
              role="alert"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: 'var(--color-destructive-bg)', border: '1px solid var(--color-destructive-border)' }}
            >
              <AlertCircle size={14} aria-hidden style={{ color: 'var(--color-destructive)', flexShrink: 0 }} />
              <p style={{ fontSize: '13px', color: 'var(--color-destructive)', fontWeight: 500 }}>
                {fetchState.message}
              </p>
            </div>
          )}

          <button
            id="quiz-start-btn"
            onClick={startQuiz}
            disabled={fetchState.status === 'loading'}
            aria-busy={fetchState.status === 'loading'}
            className="btn-primary"
            style={{ fontSize: '15px', padding: '13px', opacity: fetchState.status === 'loading' ? 0.7 : 1 }}
          >
            {fetchState.status === 'loading'
              ? (lang === 'ja' ? '読み込み中...' : 'Loading...')
              : (lang === 'ja' ? 'クイズ開始 →' : 'Start Quiz →')
            }
          </button>
        </div>
      </div>
    );
  }

  // ── Question Screen ─────────────────────────────────────────────────────────
  const q = questions[current];
  if (screen === 'question' && q) {
    const timerPct   = (timeLeft / TIMER_SECONDS) * 100;
    const timerColor = timerPct > 50 ? 'var(--color-success)' : timerPct > 25 ? 'var(--color-warning)' : 'var(--color-destructive)';

    return (
      <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '560px', margin: '0 auto' }}>

        {/* Progress + Timer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)', fontWeight: 600 }}>
                {current + 1} / {questions.length}
              </span>
              <span className="badge-level">{q.level}</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, color: timerColor, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '14px' }}>
            <Clock size={14} aria-hidden />
            {timeLeft}s
          </div>
        </div>

        {/* Timer bar */}
        <div style={{ height: '3px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background 0.3s ease', borderRadius: '2px' }} />
        </div>

        {/* Question card */}
        <div className="bento-tile" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ fontSize: '12px', color: 'var(--color-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
            {lang === 'ja' ? '意味は？' : 'What does this mean?'}
          </p>
          {q.kanji ? (
            <>
              <p style={{ fontFamily: 'var(--font-jp)', fontSize: 'clamp(48px, 10vw, 64px)', fontWeight: 700, color: 'var(--color-kanji)', lineHeight: 1.1, marginBottom: '8px' }}>
                {q.kanji}
              </p>
              <p style={{ fontFamily: 'var(--font-jp)', fontSize: '18px', color: 'var(--color-kanji-reading)' }}>{q.hiragana}</p>
            </>
          ) : (
            <p style={{ fontFamily: 'var(--font-jp)', fontSize: 'clamp(40px, 8vw, 56px)', fontWeight: 600, color: 'var(--color-kanji)', lineHeight: 1.1 }}>
              {q.hiragana}
            </p>
          )}
        </div>

        {/* Options — 2×2 grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {q.options.map((opt, i) => {
            const isCorrect    = opt === q.correctAnswer;
            const isChosen     = opt === selected;
            const showFeedback = selected !== null || timedOut;

            let bg     = 'var(--color-surface)';
            let border = 'var(--color-border)';
            let color  = 'var(--color-text)';
            if (showFeedback) {
              if (isCorrect)     { bg = 'var(--color-success-bg)';     border = 'var(--color-success)';     color = 'var(--color-success)'; }
              else if (isChosen) { bg = 'var(--color-destructive-bg)'; border = 'var(--color-destructive)'; color = 'var(--color-destructive)'; }
            }

            return (
              <button
                key={i}
                id={`quiz-opt-${i}`}
                onClick={() => handleAnswer(opt)}
                disabled={showFeedback}
                aria-pressed={isChosen}
                style={{
                  padding: '14px 12px', borderRadius: '10px',
                  border: `1.5px solid ${border}`,
                  background: bg, color,
                  fontSize: '13px', fontWeight: 600,
                  fontFamily: 'var(--font-ui)',
                  cursor: showFeedback ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  textAlign: 'center', lineHeight: 1.4,
                  transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  minHeight: '56px',
                }}
              >
                {showFeedback && isCorrect  && <CheckCircle2 size={14} aria-hidden />}
                {showFeedback && isChosen && !isCorrect && <XCircle size={14} aria-hidden />}
                {opt}
              </button>
            );
          })}
        </div>

        {timedOut && (
          <p style={{ textAlign: 'center', color: 'var(--color-destructive)', fontSize: '13px', fontWeight: 600 }}>
            {lang === 'ja' ? '⏱ 時間切れ！' : "⏱ Time's up!"}
          </p>
        )}
      </div>
    );
  }

  // ── Result Screen ───────────────────────────────────────────────────────────
  const grade =
    pct >= 90 ? (lang === 'ja' ? '🏆 完璧！' : '🏆 Perfect!')
    : pct >= 80 ? (lang === 'ja' ? '🎯 優秀！' : '🎯 Excellent!')
    : pct >= 60 ? (lang === 'ja' ? '👏 良い！' : '👏 Good job!')
    : pct >= 40 ? (lang === 'ja' ? '💪 もう少し！' : '💪 Almost there!')
    : (lang === 'ja' ? '📖 もっと練習！' : '📖 Keep practicing!');

  const motivationMsg =
    pct >= 80
      ? (lang === 'ja' ? '素晴らしい成績です。この調子で続けよう！' : 'Amazing result. Keep this momentum going!')
      : pct >= 60
      ? (lang === 'ja' ? 'いいペース！毎日続ければ必ず上達する。' : 'Good pace! Daily practice builds fluency.')
      : (lang === 'ja' ? '諦めないで！間違いから学ぶのが上達の近道。' : 'Don\'t give up — mistakes are how you learn fastest.');

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '480px', margin: '0 auto' }}>
      <div className="bento-tile bento-tile--primary-accent" style={{ textAlign: 'center', padding: '2.5rem' }}>
        {pct >= 80
          ? <Trophy size={48} aria-hidden style={{ color: 'var(--color-accent)', margin: '0 auto 12px' }} />
          : pct >= 60
          ? <Target  size={48} aria-hidden style={{ color: 'var(--color-primary)', margin: '0 auto 12px' }} />
          : <Zap     size={48} aria-hidden style={{ color: 'var(--color-muted)', margin: '0 auto 12px' }} />
        }
        <h2 style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 700, color: 'var(--color-text)', marginBottom: '4px' }}>{grade}</h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '48px', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>{pct}%</p>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginTop: '6px' }}>
          {score} / {total} {lang === 'ja' ? '問正解' : 'correct'}
        </p>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '10px', lineHeight: 1.5, maxWidth: '280px', margin: '10px auto 0' }}>
          {motivationMsg}
        </p>
      </div>

      {/* Answer breakdown */}
      <div className="bento-tile" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {answers.map((correct, i) => (
          <div
            key={i}
            style={{
              width: '28px', height: '28px', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: correct ? 'var(--color-success-bg)' : 'var(--color-destructive-bg)',
              border: `1px solid ${correct ? 'var(--color-success-border)' : 'var(--color-destructive-border)'}`,
            }}
          >
            {correct
              ? <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }}     aria-hidden />
              : <XCircle      size={14} style={{ color: 'var(--color-destructive)' }} aria-hidden />
            }
          </div>
        ))}
      </div>

      <button
        id="quiz-restart-btn"
        onClick={startQuiz}
        disabled={fetchState.status === 'loading'}
        aria-busy={fetchState.status === 'loading'}
        className="btn-primary"
        style={{ fontSize: '15px', padding: '13px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
      >
        <RotateCcw size={16} aria-hidden />
        {fetchState.status === 'loading'
          ? (lang === 'ja' ? '読み込み中...' : 'Loading...')
          : (lang === 'ja' ? 'もう一度' : 'Try Again')
        }
      </button>
    </div>
  );
}
