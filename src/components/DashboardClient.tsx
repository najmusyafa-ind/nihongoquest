'use client';

// src/components/DashboardClient.tsx — Progress dashboard
// Light bento grid: stat tiles + Recharts bar chart + session history
// GAP-4 FIX: Replaced console.error with toast.error() per rules.md Rule 10.
// GAP-5 FIX: Added ?limit=20 to sessions fetch (explicit bounded query).

import { useEffect, useState, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { useLangStore } from '@/store/langStore';
import { formatDate, formatAccuracy } from '@/lib/format';
import type { StudySession } from '@/types/entities';
import {
  Calendar,
  Layers,
  CheckCircle2,
  BarChart3,
  Target,
  Check,
} from 'lucide-react';

interface LevelStat {
  level: string;
  correct: number;
  incorrect: number;
  skipped: number;
}

/* Stat card icon mapping — Lucide only, no emoji */
type StatIconKey = 'calendar' | 'layers' | 'check';

const STAT_ICON_MAP: Record<StatIconKey, React.FC<{ className?: string; 'aria-hidden'?: boolean }>> = {
  calendar: Calendar,
  layers: Layers,
  check: CheckCircle2,
};

export function DashboardClient() {
  const { lang, t } = useLangStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useGSAP(
    () => {
      if (isLoading) return;

      const header = containerRef.current?.querySelector('.dash-header');
      const tiles = containerRef.current?.querySelectorAll('.dash-tile');

      if (header) {
        gsap.fromTo(
          header,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
        );
      }
      if (tiles && tiles.length > 0) {
        gsap.fromTo(
          tiles,
          { opacity: 0, y: 20, scale: 0.97 },
          {
            opacity: 1, y: 0, scale: 1,
            duration: 0.38, ease: 'power2.out',
            stagger: 0.06, delay: 0.1,
          }
        );
      }
    },
    { scope: containerRef, dependencies: [isLoading] }
  );

  useEffect(() => {
    async function loadData() {
      try {
        // GAP-5 FIX: Explicit limit=20 — avoids unbounded query growth as sessions accumulate.
        const response = await fetch('/api/sessions?limit=20');
        if (response.ok) {
          const data = await response.json() as { sessions: StudySession[] };
          setSessions(data.sessions);
        } else {
          // GAP-4 FIX: Use toast.error() instead of console.error (rules.md Rule 10)
          toast.error(
            'Could not load your session history. Please refresh.',
            { duration: 4000 }
          );
        }
      } catch {
        // GAP-4 FIX: Network error — show Sonner toast, not console.error
        toast.error(
          'Network error. Could not load dashboard data.',
          { duration: 4000 }
        );
      } finally {
        setIsLoading(false);
      }
    }
    void loadData();
  }, []);

  const totalCards = sessions.reduce((sum, s) => sum + s.totalCards, 0);
  const totalCorrect = sessions.reduce((sum, s) => sum + s.correctCount, 0);
  const overallAccuracy = formatAccuracy(totalCorrect, totalCards);

  const levelStats: LevelStat[] = ['N5', 'N4', 'N3', 'N2', 'N1'].map((level) => {
    const ls = sessions.filter((s) => s.level === level);
    return {
      level,
      correct: ls.reduce((sum, s) => sum + s.correctCount, 0),
      incorrect: ls.reduce((sum, s) => sum + s.incorrectCount, 0),
      skipped: ls.reduce((sum, s) => sum + s.skippedCount, 0),
    };
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="skeleton" style={{ height: '36px', width: '220px', borderRadius: '8px' }} />
        <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: '110px', borderRadius: '16px' }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: '300px', borderRadius: '16px' }} />
        <div className="skeleton" style={{ height: '240px', borderRadius: '16px' }} />
      </div>
    );
  }

  const statCards = [
    {
      label: t('dashboard.totalSessions'),
      value: sessions.length,
      valueColor: 'var(--color-text)',
      iconKey: 'calendar' as StatIconKey,
      accentBg: 'var(--color-surface-raised)',
    },
    {
      label: t('dashboard.totalCards'),
      value: totalCards,
      valueColor: 'var(--color-accent)',
      iconKey: 'layers' as StatIconKey,
      accentBg: 'var(--color-accent-soft)',
    },
    {
      label: t('dashboard.overallAccuracy'),
      value: `${overallAccuracy}%`,
      valueColor: overallAccuracy >= 70 ? 'var(--color-success)' : 'var(--color-primary)',
      iconKey: 'check' as StatIconKey,
      accentBg: overallAccuracy >= 70 ? 'var(--color-success-muted)' : 'var(--color-primary-soft)',
    },
  ];

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div className="dash-header" style={{ marginBottom: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
          <span className="badge-pill">学習ダッシュボード</span>
        </div>
        <h1
          style={{
            fontSize: 'clamp(24px, 4vw, 30px)',
            fontWeight: 700,
            color: 'var(--color-text)',
            letterSpacing: '-0.01em',
            marginBottom: '0.25rem',
          }}
        >
          {t('dashboard.title')}
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Stat tiles */}
      <div
        className="bento-grid"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
      >
        {statCards.map(({ label, value, valueColor, iconKey, accentBg }) => {
          const IconComponent = STAT_ICON_MAP[iconKey];
          return (
            <div
              key={label}
              className="dash-tile bento-tile"
              style={{ backgroundColor: accentBg }}
            >
              <div style={{ marginBottom: '8px', color: valueColor }}>
                <IconComponent className="icon-md" aria-hidden={true} />
              </div>
              <p
                style={{
                  fontSize: '11px',
                  color: 'var(--color-muted)',
                  fontWeight: 600,
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {label}
              </p>
              <p
                style={{
                  fontSize: '34px',
                  fontWeight: 700,
                  color: valueColor,
                  lineHeight: 1,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Bar chart */}
      <div className="dash-tile bento-tile">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}
        >
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BarChart3 className="icon-sm" aria-hidden="true" style={{ color: 'var(--color-muted)' }} />
            {t('dashboard.progressByLevel')}
          </p>
          <span className="badge-pill">JLPT</span>
        </div>
        {totalCards === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <Target className="icon-2xl" aria-hidden="true" style={{ margin: '0 auto 12px', color: 'var(--color-border-strong)' }} />
            <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
              {t('dashboard.noSessionsYet')}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={levelStats} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                vertical={false}
              />
              <XAxis
                dataKey="level"
                tick={{ fill: 'var(--color-muted)', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '13px',
                  boxShadow: 'var(--shadow-card)',
                }}
                cursor={{ fill: 'var(--color-surface-hover)' }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: '12px',
                  color: 'var(--color-muted)',
                  paddingTop: '8px',
                }}
              />
              <Bar
                dataKey="correct"
                name={t('study.correct')}
                fill="var(--color-success)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="incorrect"
                name={t('study.incorrect')}
                fill="var(--color-primary)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="skipped"
                name={t('study.skipped')}
                fill="var(--color-border-strong)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Session history table */}
      <div className="dash-tile bento-tile">
        <p
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--color-text)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Calendar className="icon-sm" aria-hidden="true" style={{ color: 'var(--color-muted)' }} />
          {t('dashboard.recentSessions')}
        </p>
        {sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
            <Target className="icon-2xl" aria-hidden="true" style={{ margin: '0 auto 12px', color: 'var(--color-border-strong)' }} />
            <p style={{ color: 'var(--color-muted)', marginBottom: '6px', fontSize: '14px' }}>
              {t('dashboard.noSessionsYet')}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-muted-light)' }}>
              {t('dashboard.startFirst')}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {[
                    t('dashboard.date'),
                    t('dashboard.level'),
                    t('dashboard.cards'),
                    t('dashboard.accuracy'),
                    t('dashboard.status'),
                  ].map((header) => (
                    <th
                      key={header}
                      style={{
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: '10px',
                        color: 'var(--color-muted)',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.10em',
                        borderBottom: '1.5px solid var(--color-border)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 10).map((session) => {
                  const acc = formatAccuracy(session.correctCount, session.totalCards);
                  return (
                    <tr
                      key={session.id}
                      className="hover-row"
                    >
                      <td
                        style={{
                          padding: '12px',
                          fontSize: '13px',
                          color: 'var(--color-text-secondary)',
                          fontFamily: 'var(--font-mono)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDate(new Date(session.startedAt), lang === 'ja' ? 'ja' : 'en')}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className="badge-level">{session.level}</span>
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          fontSize: '13px',
                          color: 'var(--color-text-secondary)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {session.totalCards}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color:
                              acc >= 70
                                ? 'var(--color-success)'
                                : acc >= 50
                                  ? 'var(--color-warning)'
                                  : 'var(--color-primary)',
                          }}
                        >
                          {acc}%
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color:
                              session.status === 'COMPLETED'
                                ? 'var(--color-success)'
                                : 'var(--color-muted)',
                          }}
                        >
                          {session.status === 'COMPLETED' && (
                            <Check className="icon-xs" aria-hidden="true" />
                          )}
                          {session.status === 'COMPLETED'
                            ? t('dashboard.completed')
                            : t('dashboard.abandoned')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
