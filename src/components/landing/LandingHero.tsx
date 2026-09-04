'use client';

// src/components/landing/LandingHero.tsx
// F-3 split: Nav + Hero section extracted from LandingClient.tsx (was 872 lines)
// GSAP entrance animations scoped to hero container.

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { LangSwitcher } from '@/components/LangSwitcher';
import { NihongoLogo } from '@/components/NihongoLogo';
import { useLangStore } from '@/store/langStore';

export function LandingHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { t, lang } = useLangStore();

  useGSAP(
    () => {
      const root = containerRef.current;
      if (!root) return;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      const title = root.querySelector('.main-title');
      const cta = root.querySelector('.cta-group-anim');

      if (title) {
        gsap.fromTo(title, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', delay: 0.15 });
      }
      if (cta) {
        gsap.fromTo(cta, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.35 });
      }
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef}>
      {/* ── Navigation ── */}
      <div className="section-landing__nav" role="banner">
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} aria-label="NihongoQuest home">
          <NihongoLogo variant="full" size="md" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LangSwitcher />
          <Link href="/auth/login" className="btn-ghost" style={{ textDecoration: 'none', fontSize: '14px', padding: '8px 16px', minHeight: '36px' }}>
            {lang === 'ja' ? 'ログイン' : 'Sign in'}
          </Link>
          <Link href="/auth/register" className="btn-primary" style={{ textDecoration: 'none', fontSize: '14px', padding: '8px 16px', minHeight: '36px' }}>
            {lang === 'ja' ? '無料登録' : 'Get started'}
          </Link>
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="section-landing__hero" aria-labelledby="hero-title">
        {/* Left: Hero image — Next.js Image for LCP + correct rendering */}
        <div className="section-landing__hero-image">
          <Image
            src="/fuji-hero.png"
            alt="Mount Fuji landscape — pemandangan Gunung Fuji"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
          {/* Gradient overlay for legibility on mobile */}
          <div
            style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, var(--color-background))', zIndex: 1 }}
            aria-hidden="true"
          />
        </div>

        {/* Right: Content */}
        <div className="section-landing__hero-content">
          {/* JLPT level pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(['N5', 'N4', 'N3', 'N2', 'N1'] as const).map((lvl) => (
              <span key={lvl} className="badge-level">{lvl}</span>
            ))}
          </div>

          {/* Single h1 — semantic correct */}
          <div className="main-title">
            <h1 id="hero-title" className="section-landing__title" lang={lang === 'ja' ? 'ja' : undefined}>
              {t('landing.titleMain')}
              <span className="section-landing__title-accent">{t('landing.titleHighlight')}</span>
            </h1>
            <p className="section-landing__subtitle" style={{ marginTop: '16px' }}>{t('landing.subtitle')}</p>
          </div>

          {/* CTA group */}
          <div className="section-landing__cta-group cta-group-anim">
            <Link href="/auth/register" className="btn-primary" style={{ textDecoration: 'none' }}>
              {t('landing.ctaFree')}
            </Link>
            <Link href="/auth/login" className="btn-ghost" style={{ textDecoration: 'none' }}>
              {t('landing.ctaLogin') ?? 'Masuk'}
            </Link>
          </div>

          {/* Social proof micro-text */}
          <p style={{ fontSize: '12px', color: 'var(--color-muted)', letterSpacing: '0.02em' }}>
            {t('landing.badgeTop')} · {t('landing.badgeMid')}
          </p>
        </div>
      </section>
    </div>
  );
}
