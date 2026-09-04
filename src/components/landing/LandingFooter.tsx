'use client';

// src/components/landing/LandingFooter.tsx
// F-3 split: Testimonials + Final CTA banner + Footer extracted from LandingClient.tsx

import Link from 'next/link';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useLangStore } from '@/store/langStore';
import type { TranslationPath } from '@/lib/i18n';

/* ── Brand SVGs (lucide-react v1.28 removed brand icons) ── */
function IconInstagram({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconFacebook({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function IconYoutube({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-2A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none" />
    </svg>
  );
}

const TESTIMONIAL_DEFS: Array<{
  initials: string;
  level: string;
  nameKey: TranslationPath;
  metaKey: TranslationPath;
  quoteKey: TranslationPath;
}> = [
  { initials: 'RS', level: 'N3', nameKey: 'landing.testimonial1Name', metaKey: 'landing.testimonial1Meta', quoteKey: 'landing.testimonial1Quote' },
  { initials: 'BP', level: 'N2', nameKey: 'landing.testimonial2Name', metaKey: 'landing.testimonial2Meta', quoteKey: 'landing.testimonial2Quote' },
  { initials: 'SL', level: 'N5', nameKey: 'landing.testimonial3Name', metaKey: 'landing.testimonial3Meta', quoteKey: 'landing.testimonial3Quote' },
];

export function LandingFooter() {
  const { t, lang } = useLangStore();

  return (
    <>
      {/* ── Testimonials ── */}
      <section className="section-landing__testimonials" aria-labelledby="testimonials-title">
        <div className="section-landing__testimonials-inner">
          <div className="section-landing__testimonials-header">
            <div className="section-landing__testimonials-eyebrow">
              <CheckCircle style={{ width: 11, height: 11 }} />
              {t('landing.testimonialEyebrow')}
            </div>
            <h2 id="testimonials-title" className="section-landing__testimonials-title">
              {t('landing.testimonialTitle')}
            </h2>
          </div>
          <div className="section-landing__testimonials-grid">
            {TESTIMONIAL_DEFS.map(({ initials, level, nameKey, metaKey, quoteKey }) => (
              <div key={nameKey} className="section-landing__testimonials-card">
                {/* Stars */}
                <div className="section-landing__testimonials-stars" aria-label="5 stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="section-landing__testimonials-star" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                {/* Quote */}
                <p className="section-landing__testimonials-quote">{t(quoteKey)}</p>
                {/* Author */}
                <div className="section-landing__testimonials-author">
                  <div className="section-landing__testimonials-avatar" aria-hidden="true">{initials}</div>
                  <div>
                    <p className="section-landing__testimonials-name">{t(nameKey)}</p>
                    <p className="section-landing__testimonials-meta">{t(metaKey)}</p>
                  </div>
                  <div className="section-landing__testimonials-level">
                    <span className="badge-level">{level}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA Banner ── */}
      <section className="section-landing__final-cta" aria-labelledby="final-cta-title">
        <div className="section-landing__final-cta-inner">
          <span className="section-landing__final-cta-kanji" aria-hidden="true" lang="ja">
            {t('landing.finalCtaKanji')}
          </span>
          <h2 id="final-cta-title" className="section-landing__final-cta-title">
            {t('landing.finalCtaTitle').split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </h2>
          <p className="section-landing__final-cta-subtitle">{t('landing.finalCtaSubtitle')}</p>
          <div className="section-landing__final-cta-buttons">
            <Link href="/auth/register" className="btn-primary-inverse" aria-label={t('landing.finalCtaRegister')}>
              {t('landing.finalCtaRegister')}
              <ArrowRight style={{ width: 18, height: 18 }} />
            </Link>
            <Link href="/auth/login" className="btn-ghost-inverse">{t('landing.finalCtaLogin')}</Link>
          </div>
          <p className="section-landing__final-cta-note">{t('landing.finalCtaNote')}</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="section-landing__footer" role="contentinfo">
        <div className="section-landing__footer-inner">
          {/* Social links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {[
              { label: 'Instagram NihongoQuest', Icon: IconInstagram },
              { label: 'Facebook NihongoQuest',  Icon: IconFacebook },
              { label: 'YouTube NihongoQuest',   Icon: IconYoutube },
            ].map(({ label, Icon }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                style={{ color: 'var(--color-muted)', transition: 'color 0.15s ease' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-primary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-muted)'; }}
              >
                <Icon className="icon-md" />
              </a>
            ))}
          </div>

          {/* Copyright */}
          <span style={{ fontSize: '12px', color: 'var(--color-muted)', letterSpacing: '0.01em' }}>
            © {new Date().getFullYear()} NihongoQuest — {lang === 'ja' ? '無断転載禁止' : 'All rights reserved'}
          </span>

          {/* Brand URL */}
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '-0.01em' }}>
            nihongoquest.app
          </span>
        </div>
      </footer>
    </>
  );
}
