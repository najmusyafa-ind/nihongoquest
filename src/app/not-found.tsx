'use client';

// src/app/not-found.tsx — Custom 404 page
// Bilingual (EN | JA), GSAP entrance, link back to /study

import { useRef } from 'react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useLangStore } from '@/store/langStore';
import { LangSwitcher } from '@/components/LangSwitcher';
import { BookOpen, Home } from 'lucide-react';

export default function NotFoundPage() {
  const { lang } = useLangStore();
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = containerRef.current;
      if (!root) return;

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      const items = root.querySelectorAll('.not-found-anim');
      gsap.fromTo(
        Array.from(items),
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.1 }
      );
    },
    { scope: containerRef }
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-background)',
        backgroundImage: `radial-gradient(circle at 50% 40%, rgba(233, 69, 96, 0.06) 0%, transparent 55%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <div ref={containerRef} style={{ maxWidth: '440px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>

        {/* Big 404 */}
        <div className="not-found-anim" aria-hidden="true">
          <p
            style={{
              fontFamily: 'var(--font-jp)',
              fontSize: 'clamp(80px, 20vw, 120px)',
              fontWeight: 800,
              color: 'var(--color-primary)',
              lineHeight: 1,
              letterSpacing: '-0.04em',
              opacity: 0.15,
              userSelect: 'none',
            }}
          >
            404
          </p>
        </div>

        {/* Japanese kanji for "not found" 見つかりません */}
        <div className="not-found-anim" style={{ marginTop: '-2.5rem' }}>
          <p
            lang="ja"
            style={{
              fontFamily: 'var(--font-jp)',
              fontSize: 'clamp(24px, 5vw, 32px)',
              fontWeight: 700,
              color: 'var(--color-text)',
              letterSpacing: '0.02em',
              marginBottom: '8px',
            }}
          >
            見つかりません
          </p>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
            {lang === 'ja'
              ? 'このページは存在しないか、移動された可能性があります。'
              : 'This page does not exist or may have been moved.'}
          </p>
        </div>

        {/* Divider line */}
        <div
          className="not-found-anim"
          style={{ width: '48px', height: '2px', background: 'var(--color-primary)', borderRadius: '999px', opacity: 0.4 }}
        />

        {/* CTA buttons */}
        <div
          className="not-found-anim"
          style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <Link
            href="/study"
            className="btn-primary"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <BookOpen className="icon-sm" aria-hidden="true" />
            {lang === 'ja' ? '学習に戻る' : 'Go to Study'}
          </Link>
          <Link
            href="/"
            className="btn-ghost"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Home className="icon-sm" aria-hidden="true" />
            {lang === 'ja' ? 'ホーム' : 'Home'}
          </Link>
        </div>

        {/* Lang switcher */}
        <div className="not-found-anim">
          <LangSwitcher />
        </div>

        {/* Small footnote */}
        <p className="not-found-anim" style={{ fontSize: '11px', color: 'var(--color-muted-light)', fontFamily: 'var(--font-mono)' }}>
          NihongoQuest · Error 404
        </p>
      </div>
    </div>
  );
}
