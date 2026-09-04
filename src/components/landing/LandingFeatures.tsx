'use client';

// src/components/landing/LandingFeatures.tsx
// F-3 split: Stats bar + How It Works + Feature strip extracted from LandingClient.tsx

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { BookOpen, Brain, WifiOff } from 'lucide-react';
import { useLangStore } from '@/store/langStore';
import type { TranslationPath } from '@/lib/i18n';

const FEATURES = [
  { Icon: BookOpen, titleKey: 'landing.feat1Title' as TranslationPath, descKey: 'landing.feat1Desc' as TranslationPath },
  { Icon: Brain,    titleKey: 'landing.feat2Title' as TranslationPath, descKey: 'landing.feat2Desc' as TranslationPath },
  { Icon: WifiOff,  titleKey: 'landing.feat3Title' as TranslationPath, descKey: 'landing.feat3Desc' as TranslationPath },
] as const;

const STATS: Array<{ number: string; labelKey: TranslationPath }> = [
  { number: '10,000+', labelKey: 'landing.statsUsers' },
  { number: '50,000+', labelKey: 'landing.statsCards' },
  { number: '4.9 ★',   labelKey: 'landing.statsRating' },
];

const HOW_STEPS: Array<{ num: string; titleKey: TranslationPath; descKey: TranslationPath }> = [
  { num: '01', titleKey: 'landing.howStep1Title', descKey: 'landing.howStep1Desc' },
  { num: '02', titleKey: 'landing.howStep2Title', descKey: 'landing.howStep2Desc' },
  { num: '03', titleKey: 'landing.howStep3Title', descKey: 'landing.howStep3Desc' },
];

export function LandingFeatures() {
  const { t } = useLangStore();
  const featRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const features = featRef.current?.querySelectorAll('.feature-tile-anim');
      if (!features || features.length === 0) return;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;
      gsap.fromTo(
        Array.from(features),
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.1, delay: 0.5 }
      );
    },
    { scope: featRef }
  );

  return (
    <div ref={featRef}>
      {/* ── Stats Bar ── */}
      <div className="section-landing__stats" aria-label="NihongoQuest Statistics">
        <div className="section-landing__stats-inner">
          {STATS.map(({ number, labelKey }) => (
            <div key={labelKey} className="section-landing__stats-item">
              <span className="section-landing__stats-number">{number}</span>
              <span className="section-landing__stats-label">{t(labelKey)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── How It Works ── */}
      <section className="section-landing__how" aria-labelledby="how-title">
        <div className="section-landing__how-inner">
          <div className="section-landing__how-header">
            <div className="section-landing__how-eyebrow">{t('landing.howEyebrow')}</div>
            <h2 id="how-title" className="section-landing__how-title">{t('landing.howTitle')}</h2>
            <p className="section-landing__how-subtitle">{t('landing.howSubtitle')}</p>
          </div>
          <div className="section-landing__how-steps">
            {HOW_STEPS.map(({ num, titleKey, descKey }) => (
              <div key={num} className="section-landing__how-step">
                <div className="section-landing__how-step-num">{num}</div>
                <h3 className="section-landing__how-step-title">{t(titleKey)}</h3>
                <p className="section-landing__how-step-desc">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Strip ── */}
      <div className="section-landing__feature-strip">
        <div className="section-landing__feature-grid">
          {FEATURES.map(({ Icon, titleKey, descKey }) => (
            <div key={titleKey} className="section-landing__feature-tile feature-tile-anim">
              <div className="section-landing__feature-icon" aria-hidden="true">
                <Icon className="icon-md" />
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '4px' }}>
                  {t(titleKey)}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
                  {t(descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
