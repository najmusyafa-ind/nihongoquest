'use client';

// src/components/StudyLayoutShell.tsx
// Navigation shell — top bar (desktop) + bottom nav (mobile)
// Added: Vocabulary, Quiz, Analytics, Achievements nav items

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  BarChart3,
  Settings,
  BookText,
  Trophy,
  Brain,
  LineChart,
} from 'lucide-react';
import { SyncIndicator } from './SyncIndicator';
import { LangSwitcher } from './LangSwitcher';
import { NihongoLogo } from './NihongoLogo';
import { useLangStore } from '@/store/langStore';

interface StudyLayoutShellProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: '/study',        labelKey: 'nav.study',       labelJa: '学習',         Icon: BookOpen  },
  { href: '/vocabulary',   labelKey: 'nav.vocabulary',  labelJa: '単語帳',       Icon: BookText  },
  { href: '/quiz',         labelKey: 'nav.quiz',        labelJa: 'クイズ',       Icon: Brain     },
  { href: '/dashboard',   labelKey: 'nav.dashboard',   labelJa: 'ダッシュボード', Icon: BarChart3 },
  { href: '/analytics',   labelKey: 'nav.analytics',   labelJa: '分析',         Icon: LineChart  },
  { href: '/achievements', labelKey: 'nav.achievements', labelJa: '実績',        Icon: Trophy    },
  { href: '/settings',     labelKey: 'nav.settings',    labelJa: '設定',         Icon: Settings  },
] as const;

export function StudyLayoutShell({ children }: StudyLayoutShellProps) {
  const { t, lang } = useLangStore();
  const pathname = usePathname();

  const getLabel = (item: (typeof NAV_ITEMS)[number]): string => {
    if (lang === 'ja') return item.labelJa;
    // t() is typed strictly — all nav keys are now present in en.ts
    return t(item.labelKey as Parameters<typeof t>[0]);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top nav bar ── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          height: '56px',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          boxShadow: 'var(--shadow-tile)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          transition: 'background-color 0.25s ease, border-color 0.25s ease',
        }}
      >
        {/* Brand + Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link
            href="/study"
            style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}
            aria-label="NihongoQuest — Go to study page"
          >
            <NihongoLogo variant="full" size="sm" />
          </Link>

          {/* Desktop nav — hidden on mobile (< 768px) via CSS class */}
          <nav className="shell-nav-desktop" aria-label="Main navigation">
            {NAV_ITEMS.map((navItem) => {
              const { href, Icon } = navItem;
              const isActive = pathname === href || (href !== '/study' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  id={`nav-${href.replace('/', '')}`}
                  className={`nav-link${isActive ? ' nav-link--active' : ''}`}
                >
                  <Icon aria-hidden="true" style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                  {getLabel(navItem)}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <SyncIndicator />
          <LangSwitcher />
        </div>
      </header>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          padding: '1.75rem 1.5rem',
          maxWidth: '1024px',
          width: '100%',
          margin: '0 auto',
          // Extra bottom padding on mobile for bottom nav
          paddingBottom: 'calc(1.75rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {children}
      </main>

      {/* ── Mobile bottom nav ── All 7 items, horizontally scrollable ── */}
      <nav
        className="shell-nav-mobile"
        aria-label="Mobile navigation"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          zIndex: 50,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxShadow: '0 -1px 8px rgba(0,0,0,0.08)',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Inner row — all 7 nav items, scroll-snap */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '60px',
            minWidth: 'max-content',
            padding: '0 8px',
            gap: '2px',
          }}
        >
          {NAV_ITEMS.map((navItem) => {
            const { href, Icon } = navItem;
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '6px 14px',
                  textDecoration: 'none',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-muted)',
                  fontSize: '10px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-ui)',
                  transition: 'color 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  minWidth: '52px',
                  flexShrink: 0,
                  borderRadius: '8px',
                  background: isActive ? 'var(--color-primary-soft)' : 'transparent',
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon aria-hidden style={{ width: '20px', height: '20px' }} />
                <span>{getLabel(navItem)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
