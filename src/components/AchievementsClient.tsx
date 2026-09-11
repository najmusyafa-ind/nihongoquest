'use client';

// src/components/AchievementsClient.tsx — Achievement badges & milestones
// GAP-3 FIX: Fetches from /api/achievements (correct endpoint).
// Previously fetched from /api/analytics/summary with a duplicate type system.
// Now uses AchievementsResponse from @/types/achievements.types.ts.

import { useRef, useState, useEffect, useCallback } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Trophy, Flame, Star, BookOpen, Lock, RefreshCw, Sparkles, Timer, Library, GraduationCap, Sprout, AlertCircle } from 'lucide-react';

import { useLangStore } from '@/store/langStore';
import Link from 'next/link';
import type { AchievementId, AchievementsResponse } from '@/types/achievements.types';

// ── Rendered Achievement (UI-facing) ───────────────────────────────────────────
// Combines API response (AchievementsResponse) with static UI metadata (icon/color/label).
interface RenderedAchievement {
  id: AchievementId;
  icon: React.FC<{ size?: number; 'aria-hidden'?: boolean }>;
  labelEn: string;
  labelJa: string;
  descEn: string;
  descJa: string;
  category: 'streak' | 'accuracy' | 'sessions' | 'level';
  color: string;
  progress: number;   // 0–100 percent
  unlocked: boolean;
  hint: string;       // e.g. "3/7 days"
}

// ── UI Presentation Map ──────────────────────────────────────────────────────
// Maps AchievementId -> static UI metadata (icon, label, color, description).
// This is client-only presentation data — does NOT contain unlock logic.
// Unlock logic lives in AchievementsService (server-side).
const ACHIEVEMENT_UI_MAP: Record<AchievementId, Omit<RenderedAchievement, 'id' | 'progress' | 'unlocked' | 'hint'>> = {
  first_session: {
    icon: Sprout,
    labelEn: 'First Steps', labelJa: '一歩を踏み出す',
    descEn: 'Complete your very first study session.',
    descJa: '最初の学習セッションを完了する。',
    color: '#f5a623', category: 'sessions',
  },
  streak_3: {
    icon: Flame,
    labelEn: '3-Day Streak', labelJa: '3日連続',
    descEn: 'Study 3 days in a row.',
    descJa: '3日連続で学習する。',
    color: '#f97316', category: 'streak',
  },
  streak_7: {
    icon: Flame,
    labelEn: 'Week Warrior', labelJa: '週間戦士',
    descEn: 'Study 7 days in a row.',
    descJa: '7日連続で学習する。',
    color: '#ef4444', category: 'streak',
  },
  perfect_score: {
    icon: Star,
    labelEn: 'Perfect Score', labelJa: '満点',
    descEn: 'Zero mistakes in a session.',
    descJa: '一問も間違えずにセッションをクリア。',
    color: '#22c55e', category: 'accuracy',
  },
  n5_complete: {
    icon: BookOpen,
    labelEn: 'N5 Graduate', labelJa: 'N5卒業',
    descEn: 'Complete 5 N5 study sessions.',
    descJa: 'N5のセッションを5回完了。',
    color: '#15803d', category: 'level',
  },
  n4_complete: {
    icon: GraduationCap,
    labelEn: 'N4 Graduate', labelJa: 'N4卒業',
    descEn: 'Complete 5 N4 study sessions.',
    descJa: 'N4セッションを5回完了。',
    color: '#3b82f6', category: 'level',
  },
  hundred_cards: {
    icon: Library,
    labelEn: 'Century Scholar', labelJa: '百戦錬磨',
    descEn: '100 flashcards reviewed.',
    descJa: 'フラッシュカードを100枚学習。',
    color: '#d97706', category: 'sessions',
  },
  speed_demon: {
    icon: Timer,
    labelEn: 'Speed Demon', labelJa: '疾風の勉強家',
    descEn: '10 cards in under 3 minutes.',
    descJa: '3分以内に10枚以上のカードを完了。',
    color: '#8b5cf6', category: 'sessions',
  },
};

const CATEGORY_LABELS: Record<RenderedAchievement['category'], { en: string; ja: string }> = {
  streak:   { en: 'Streaks',  ja: 'ストリーク' },
  accuracy: { en: 'Accuracy', ja: '精度' },
  sessions: { en: 'Sessions', ja: 'セッション' },
  level:    { en: 'Levels',   ja: 'レベル' },
};

// ── Fetch State ────────────────────────────────────────────────────────────────
type AchvState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; achievements: RenderedAchievement[] };

// ── Badge Card ─────────────────────────────────────────────────────────────────
function BadgeCard({ a, lang }: { a: RenderedAchievement; lang: string }) {

  const { icon: Icon, unlocked, progress, color, hint } = a;
  return (
    <div
      className="bento-tile"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        opacity: unlocked ? 1 : 0.72,
        borderColor: unlocked ? `${color}40` : 'var(--color-border)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent strip for unlocked */}
      {unlocked && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: `linear-gradient(90deg, ${color}, ${color}88)`,
        }} />
      )}

      {/* Icon */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px',
          background: unlocked ? `${color}18` : 'var(--color-surface-raised)',
          border: `1.5px solid ${unlocked ? `${color}40` : 'var(--color-border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: unlocked ? color : 'var(--color-muted)',
        }}>
          {unlocked ? <Icon size={22} aria-hidden /> : <Lock size={18} aria-hidden />}
        </div>

        {unlocked && (
          <span style={{
            fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px',
            background: `${color}18`, color, border: `1px solid ${color}30`,
            letterSpacing: '0.06em',
          }}>
            ✓ {lang === 'ja' ? '達成' : 'EARNED'}
          </span>
        )}
      </div>

      {/* Label + desc */}
      <div>
        <p style={{ fontSize: '14px', fontWeight: 700, color: unlocked ? 'var(--color-text)' : 'var(--color-text-secondary)', marginBottom: '3px' }}>
          {lang === 'ja' ? a.labelJa : a.labelEn}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.5 }}>
          {lang === 'ja' ? a.descJa : a.descEn}
        </p>
      </div>

      {/* Progress bar (locked only) */}
      {!unlocked && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>
              {hint}
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
              {progress}%
            </span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function AchievementsClient() {
  const { lang } = useLangStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<AchvState>({ status: 'loading' });

  // ── GAP-3 FIX: Fetch from /api/achievements (correct endpoint) ───────────────
  // Maps AchievementsResponse to RenderedAchievement[] using ACHIEVEMENT_UI_MAP.
  const loadAchievements = useCallback(() => {
    setState({ status: 'loading' });
    void (async () => {
      try {
        const res = await fetch('/api/achievements');
        if (!res.ok) {
          const body: unknown = await res.json().catch(() => ({}));
          const rawMsg =
            typeof body === 'object' && body !== null && 'error' in body
              ? String((body as { error: { message?: string } }).error?.message ?? res.statusText)
              : res.statusText;
          const msg = /json|syntax|token|object|failed to execute/i.test(rawMsg)
            ? (lang === 'ja' ? '実績データの取得に失敗しました。' : 'Unable to load achievements at this time.')
            : rawMsg;
          setState({ status: 'error', message: msg });
          return;
        }
        const data: AchievementsResponse = await res.json();
        const achievements: RenderedAchievement[] = data.achievements
          .map((a) => {
            const ui = ACHIEVEMENT_UI_MAP[a.id];
            if (!ui) return null;
            return {
              id: a.id,
              ...ui,
              progress: a.progressInPercent,
              // GAP-6: unlockedAt is always null (no DB table yet) — derive unlocked
              // state from progressInPercent instead, which is always accurate.
              unlocked: a.progressInPercent >= 100,
              hint: `${a.progressCount}/${a.targetCount}`,
            } satisfies RenderedAchievement;
          })
          .filter((a): a is RenderedAchievement => a !== null);
        setState({ status: 'success', achievements });
      } catch {
        setState({
          status: 'error',
          message:
            lang === 'ja'
              ? '実績データの取得中に問題が発生しました。接続を確認して再試行してください。'
              : 'Unable to load achievements at this time. Please check your connection and try again.',
        });
      }
    })();
  }, [lang]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- loadAchievements is async; setState fires inside its async body (void IIFE), not synchronously in this effect
  useEffect(() => { loadAchievements(); }, [loadAchievements]);


  // ── GSAP animation — fires after data loads ────────────────────────────────
  useGSAP(
    () => {
      if (state.status !== 'success') return;
      const root = containerRef.current;
      if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const header = root.querySelector('.achv-header');
      const badges = root.querySelectorAll('.achv-badge');
      if (header) gsap.fromTo(header, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
      if (badges.length) gsap.fromTo(Array.from(badges), { opacity: 0, y: 20, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.5)', stagger: 0.05, delay: 0.15 });
    },
    { scope: containerRef, dependencies: [state.status] }
  );

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (state.status === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ height: '80px', borderRadius: '12px', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: '140px', borderRadius: '12px', background: 'var(--color-border)', animation: `pulse 1.5s ease-in-out infinite ${i * 0.08}s` }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (state.status === 'error') {
    return (
      <div role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '3rem 2rem', textAlign: 'center', minHeight: '300px', justifyContent: 'center' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--color-destructive-bg)', border: '1px solid var(--color-destructive-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertCircle size={24} aria-hidden style={{ color: 'var(--color-destructive)' }} />
        </div>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '6px' }}>
            {lang === 'ja' ? '実績を読み込めませんでした' : 'Unable to load achievements'}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', maxWidth: '340px' }}>{state.message}</p>
        </div>
        <button onClick={loadAchievements} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '14px' }}>
          <RefreshCw size={14} aria-hidden />
          {lang === 'ja' ? '再読み込み' : 'Try again'}
        </button>
      </div>
    );
  }

  const achievements = state.achievements;
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked   = achievements.filter((a) => !a.unlocked);
  const categories = ['streak', 'accuracy', 'sessions', 'level'] as const;

  // ── All-locked empty state (new user) ─────────────────────────────────────
  if (unlocked.length === 0) {
    return (
      <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Header */}
        <div className="achv-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
            <span className="badge-pill">
              <Trophy size={10} aria-hidden style={{ marginRight: '4px' }} />
              {lang === 'ja' ? '実績' : 'Achievements'}
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em', marginBottom: '0.25rem' }}>
            {lang === 'ja' ? '実績・バッジ' : 'Achievements & Badges'}
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
            {lang === 'ja' ? '0/9 件取得済み' : '0 of 9 badges earned'}
          </p>
        </div>

        {/* Encouragement */}
        <div className="bento-tile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '2.5rem 2rem', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'var(--color-primary-muted)', border: '1.5px solid rgba(233,69,96,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={28} aria-hidden style={{ color: 'var(--color-primary)' }} />
          </div>
          <div style={{ maxWidth: '300px' }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '8px' }}>
              {lang === 'ja' ? 'バッジを集めよう！' : 'Start earning badges!'}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.6 }}>
              {lang === 'ja'
                ? '学習セッションを完了すると、実績とバッジが解禁されます。'
                : 'Complete study sessions to unlock achievements and badges.'}
            </p>
          </div>
          <Link
            href="/study"
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', fontSize: '14px', fontWeight: 600, borderRadius: '10px', textDecoration: 'none' }}
          >
            <BookOpen size={15} aria-hidden />
            {lang === 'ja' ? '学習を始める' : 'Start studying'}
          </Link>
        </div>

        {/* Show all locked badges to give user motivation */}
        <div>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
            {lang === 'ja' ? '取得できるバッジ' : 'Badges to Earn'}
          </h2>
          <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {achievements.map((a) => (
              <div key={a.id} className="achv-badge">
                <BadgeCard a={a} lang={lang} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Normal state — has some unlocked ──────────────────────────────────────
  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div className="achv-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
          <span className="badge-pill">
            <Trophy size={10} aria-hidden style={{ marginRight: '4px' }} />
            {lang === 'ja' ? '実績' : 'Achievements'}
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em', marginBottom: '0.25rem' }}>
          {lang === 'ja' ? '実績・バッジ' : 'Achievements & Badges'}
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
          {lang === 'ja'
            ? `${unlocked.length}/${achievements.length} 件取得済み`
            : `${unlocked.length} of ${achievements.length} badges earned`}
        </p>
      </div>

      {/* Overall progress bar */}
      <div className="bento-tile" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
            {lang === 'ja' ? '全体の進捗' : 'Overall Progress'}
          </p>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>
            {Math.round((unlocked.length / achievements.length) * 100)}%
          </span>
        </div>
        <div className="progress-track" style={{ height: '6px' }}>
          <div className="progress-fill" style={{ width: `${(unlocked.length / achievements.length) * 100}%` }} />
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {categories.map((cat) => {
            const count = achievements.filter((a) => a.category === cat && a.unlocked).length;
            const total = achievements.filter((a) => a.category === cat).length;
            return (
              <span key={cat} style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{count}/{total}</span>
                {lang === 'ja' ? CATEGORY_LABELS[cat]?.ja : CATEGORY_LABELS[cat]?.en}
              </span>
            );
          })}
        </div>
      </div>

      {/* Earned badges */}
      {unlocked.length > 0 && (
        <div>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
            {lang === 'ja' ? '取得済み' : 'Earned'}
          </h2>
          <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {unlocked.map((a) => (
              <div key={a.id} className="achv-badge">
                <BadgeCard a={a} lang={lang} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked badges */}
      {locked.length > 0 && (
        <div>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
            {lang === 'ja' ? 'まだ未取得' : 'In Progress'}
          </h2>
          <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {locked.map((a) => (
              <div key={a.id} className="achv-badge">
                <BadgeCard a={a} lang={lang} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
