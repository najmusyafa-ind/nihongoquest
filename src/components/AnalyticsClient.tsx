'use client';

// src/components/AnalyticsClient.tsx — Study analytics & progress tracking
// Shows: accuracy by level, study streak calendar, weak words, session stats

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { LineChart, TrendingUp, Target, Flame, BookOpen, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { useLangStore } from '@/store/langStore';
import type { AnalyticsSummary } from '@/types/quiz.types';

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, Icon }: {
  label: string; value: string; sub?: string; color: string;
  Icon: React.FC<{ size?: number; 'aria-hidden'?: boolean }>;
}) {
  return (
    <div className="bento-tile" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0,
          background: `${color}14`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        }}>
          <Icon size={16} aria-hidden />
        </div>
        <p style={{ fontSize: '12px', color: 'var(--color-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>{label}</p>
      </div>
      <p style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{sub}</p>}
    </div>
  );
}

// ── Level Accuracy Bar ─────────────────────────────────────────────────────────
function LevelAccuracyBar({ level, pct, color, sessions }: { level: string; pct: number; color: string; sessions: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color, width: '28px', flexShrink: 0 }}>{level}</span>
      <div style={{ flex: 1 }}>
        <div style={{ height: '8px', background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
            borderRadius: '4px',
            transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }} />
        </div>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', width: '40px', textAlign: 'right' }}>{pct}%</span>
      <span style={{ fontSize: '11px', color: 'var(--color-muted)', width: '60px' }}>
        {sessions} {sessions === 1 ? 'session' : 'sessions'}
      </span>
    </div>
  );
}

// ── Streak Calendar (GitHub-style) ────────────────────────────────────────────
function StreakCalendar({ activeDays }: { activeDays: Set<string> }) {
  const today = new Date();
  const weeks: Date[][] = [];
  // Build last 12 weeks of days
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 83); // 12 weeks
  startDate.setDate(startDate.getDate() - startDate.getDay()); // align to Sunday

  const cur = new Date(startDate);
  while (cur <= today) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  const fmt = (d: Date) => d.toISOString().split('T')[0] ?? '';

  return (
    <div style={{ display: 'flex', gap: '3px', overflowX: 'auto', paddingBottom: '4px' }}>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {week.map((day, di) => {
            const dayStr = fmt(day);
            const isActive = activeDays.has(dayStr);
            const isFuture = day > today;
            return (
              <div
                key={di}
                title={dayStr}
                style={{
                  width: '12px', height: '12px', borderRadius: '2px',
                  background: isFuture
                    ? 'transparent'
                    : isActive
                      ? 'var(--color-primary)'
                      : 'var(--color-border)',
                  opacity: isFuture ? 0 : 1,
                  border: isFuture ? 'none' : `1px solid ${isActive ? 'var(--color-primary-dark)' : 'var(--color-border-strong)'}`,
                  transition: 'background 0.2s ease',
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Async State — discriminated union ─────────────────────────────────────────────
type AnalyticsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: AnalyticsSummary };

// ── Main Component ─────────────────────────────────────────────────────────────
type TabId = 'overview' | 'weak';

export function AnalyticsClient() {
  const { lang } = useLangStore();
  const [tab, setTab] = useState<TabId>('overview');
  const [state, setState] = useState<AnalyticsState>({ status: 'loading' });

  // ── Fetch /api/analytics/summary ────────────────────────────────────────────
  const loadAnalytics = useCallback(() => {
    setState({ status: 'loading' });
    void (async () => {
      try {
        const res = await fetch('/api/analytics/summary');
        if (!res.ok) {
          const body: unknown = await res.json().catch(() => ({}));
          const rawMsg =
            typeof body === 'object' && body !== null && 'error' in body
              ? String((body as { error: { message?: string } }).error?.message ?? res.statusText)
              : res.statusText;
          const msg = /json|syntax|token|object|failed to execute/i.test(rawMsg)
            ? (lang === 'ja' ? 'データの読み込みに失敗しました。' : 'Unable to load analytics at this time.')
            : rawMsg;
          setState({ status: 'error', message: msg });
          return;
        }
        const data: AnalyticsSummary = await res.json();
        setState({ status: 'success', data });
      } catch {
        setState({
          status: 'error',
          message:
            lang === 'ja'
              ? 'データの読み込み中に問題が発生しました。接続を確認して再試行してください。'
              : 'Unable to load your analytics right now. Please check your connection and try again.',
        });
      }
    })();
  }, [lang]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- loadAnalytics runs setState inside an async IIFE, not synchronously
  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  const TABS: { id: TabId; label: string; labelJa: string }[] = [
    { id: 'overview', label: 'Overview',   labelJa: '概要' },
    { id: 'weak',     label: 'Weak Words', labelJa: '苦手単語' },
  ];

  // ── Loading state ────────────────────────────────────────────────────────────
  if (state.status === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: '100px', borderRadius: '12px', background: 'var(--color-border)', animation: `pulse 1.5s ease-in-out infinite ${i * 0.08}s` }} />
          ))}
        </div>
        <div style={{ height: '160px', borderRadius: '12px', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite 0.3s' }} />
        <div style={{ height: '120px', borderRadius: '12px', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite 0.4s' }} />
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (state.status === 'error') {
    return (
      <div role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '3rem 2rem', textAlign: 'center', minHeight: '300px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--color-destructive-bg)', border: '1px solid var(--color-destructive-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertCircle size={24} aria-hidden style={{ color: 'var(--color-destructive)' }} />
        </div>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '6px' }}>
            {lang === 'ja' ? '分析を読み込めませんでした' : 'Failed to load analytics'}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', maxWidth: '320px' }}>{state.message}</p>
        </div>
        <button onClick={loadAnalytics} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '14px' }}>
          <RefreshCw size={14} aria-hidden />
          {lang === 'ja' ? '再読み込み' : 'Try again'}
        </button>
      </div>
    );
  }

  // ── Success — unpack data ──────────────────────────────────────────────────────
  const summary = state.data;

  // ── Empty state — new user or DB offline → totalSessions === 0 ───────────────
  if (summary.totalSessions === 0) {
    return (
      <div
        role="status"
        aria-label={lang === 'ja' ? 'データなし' : 'No data yet'}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: '20px', padding: '3rem 2rem',
          textAlign: 'center', minHeight: '360px',
        }}
      >
        {/* Icon */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '20px',
          background: 'var(--color-primary-muted)',
          border: '1.5px solid rgba(233,69,96,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={32} aria-hidden style={{ color: 'var(--color-primary)' }} />
        </div>

        {/* Copy */}
        <div style={{ maxWidth: '320px' }}>
          <h2 style={{
            fontSize: '20px', fontWeight: 700, color: 'var(--color-text)',
            marginBottom: '8px', letterSpacing: '-0.01em',
          }}>
            {lang === 'ja' ? '学習データがまだありません' : 'No study data yet'}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.6 }}>
            {lang === 'ja'
              ? '最初のセッションを完了すると、精度・ストリーク・苦手単語が表示されます。'
              : 'Complete your first study session and your accuracy, streak, and weak words will appear here.'}
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/study"
          className="btn-primary"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '11px 24px', fontSize: '14px', fontWeight: 600,
            borderRadius: '10px', textDecoration: 'none',
          }}
        >
          <BookOpen size={16} aria-hidden />
          {lang === 'ja' ? '最初のセッションを始める' : 'Start your first session'}
        </Link>
      </div>
    );
  }

  // Build activeDays Set from weak words lastAttempted dates (best proxy for calendar)
  // Real calendar would need a dedicated API — use session dates as approximation
  const activeDays = new Set<string>([
    ...summary.weakWords.map(w => new Date(w.lastAttempted).toISOString().split('T')[0] ?? ''),
  ]);

  // Compute overall accuracy as weighted average of all levels
  const levelEntries = Object.values(summary.accuracyByLevel);
  const totalAnswered = levelEntries.reduce((s, l) => s + (l?.totalAnswered ?? 0), 0);
  const totalCorrect  = levelEntries.reduce((s, l) => s + Math.round(((l?.accuracyInPercent ?? 0) / 100) * (l?.totalAnswered ?? 0)), 0);
  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const levelData = levelEntries.map((l) => ({
    level: l?.level ?? '',
    pct:      l?.accuracyInPercent ?? 0,
    sessions: l?.totalAnswered ?? 0,
    color: l?.level === 'N5'
      ? 'var(--color-success)'
      : l?.level === 'N4'
      ? 'var(--color-accent)'
      : 'var(--color-primary)',
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div className="analytics-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
          <span className="badge-pill">
            <LineChart size={10} aria-hidden style={{ marginRight: '4px' }} />
            {lang === 'ja' ? '分析' : 'Analytics'}
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em', marginBottom: '0.25rem' }}>
          {lang === 'ja' ? '学習分析' : 'Study Analytics'}
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
          {lang === 'ja' ? '学習の進捗・精度・弱点を確認' : 'Track your progress, accuracy, and weak points'}
        </p>
      </div>

      {/* Stat cards */}
      <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {[
          { label: lang === 'ja' ? 'セッション数' : 'Total Sessions', value: String(summary.totalSessions),    sub: lang === 'ja' ? '全期間' : 'all time',        color: 'var(--color-primary)', Icon: BookOpen   },
          { label: lang === 'ja' ? '学習カード'   : 'Cards Studied',  value: String(summary.totalCardsStudied), sub: lang === 'ja' ? '全期間' : 'all time',        color: 'var(--color-accent)',  Icon: TrendingUp },
          { label: lang === 'ja' ? '全体精度'     : 'Overall Accuracy', value: `${overallAccuracy}%`,          sub: lang === 'ja' ? '全セッション' : 'all sessions', color: 'var(--color-success)', Icon: Target     },
          { label: lang === 'ja' ? '連続学習'     : 'Current Streak', value: `${summary.streakDays}日`,       sub: lang === 'ja' ? '連続' : 'days in a row',    color: '#f97316',              Icon: Flame      },
        ].map((s) => (
          <div key={s.label} className="analytics-stat">
            <StatCard {...s} />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '3px', width: 'fit-content' }}>
        {TABS.map(({ id, label, labelJa }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              padding: '6px 16px', borderRadius: '7px', border: 'none',
              fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
              background: tab === id ? 'var(--color-primary)' : 'transparent',
              color: tab === id ? '#fff' : 'var(--color-muted)',
              transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {lang === 'ja' ? labelJa : label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Accuracy by level */}
          <div className="bento-tile" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
              {lang === 'ja' ? 'レベル別精度' : 'Accuracy by Level'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {levelData.map((l) => <LevelAccuracyBar key={l.level} {...l} />)}
            </div>
          </div>

          {/* Study streak calendar */}
          <div className="bento-tile" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>
                {lang === 'ja' ? '学習カレンダー' : 'Study Calendar'}
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                {lang === 'ja' ? '過去12週' : 'Last 12 weeks'}
              </span>
            </div>
            <StreakCalendar activeDays={activeDays} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--color-muted)' }}>
              <span>{lang === 'ja' ? '少ない' : 'Less'}</span>
              {[0, 0.3, 0.6, 1].map((v, i) => (
                <div key={i} style={{ width: '12px', height: '12px', borderRadius: '2px', background: v === 0 ? 'var(--color-border)' : `rgba(233,69,96,${v})`, border: '1px solid var(--color-border-strong)' }} />
              ))}
              <span>{lang === 'ja' ? '多い' : 'More'}</span>
            </div>
          </div>
        </>
      )}

      {tab === 'weak' && (
        <div className="bento-tile" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
            <AlertCircle size={16} aria-hidden style={{ color: 'var(--color-destructive)' }} />
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>
              {lang === 'ja' ? '最もミスの多い単語' : 'Most Missed Words'}
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {summary.weakWords.map((w, i) => (
              <div
                key={w.flashcardId}
                className="hover-row"
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 4px' }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-muted)', width: '20px', textAlign: 'right' }}>#{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'var(--font-jp)', fontSize: '18px', fontWeight: 700, color: 'var(--color-kanji)', lineHeight: 1.2 }}>{w.kanji}</p>
                  <p style={{ fontFamily: 'var(--font-jp)', fontSize: '12px', color: 'var(--color-kanji-reading)' }}>{w.hiragana}</p>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', flex: 1 }}>{w.meaningId}</p>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '12px', fontWeight: 700,
                    color: 'var(--color-destructive)',
                    background: 'var(--color-destructive-muted)',
                    border: '1px solid var(--color-destructive-border)',
                    borderRadius: '6px', padding: '2px 8px',
                  }}>
                    ✗ {w.errorCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
