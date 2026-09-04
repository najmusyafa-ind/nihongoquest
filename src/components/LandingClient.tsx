'use client';

// src/components/LandingClient.tsx
// F-3 fix: Was 872 lines (4× Rule 11 limit). Now an assembler-only file (~30 lines).
// All section logic lives in:
//   - landing/LandingHero.tsx       — Nav + Hero + GSAP entrance
//   - landing/LandingFeatures.tsx   — Stats + How It Works + Feature strip
//   - landing/LandingQuizDemo.tsx   — JLPT sample quiz with GSAP tab animations
//   - landing/LandingFooter.tsx     — Testimonials + Final CTA + Footer

import { LandingHero }      from './landing/LandingHero';
import { LandingFeatures }  from './landing/LandingFeatures';
import { LandingQuizDemo }  from './landing/LandingQuizDemo';
import { LandingFooter }    from './landing/LandingFooter';

export function LandingClient() {
  return (
    <div className="section-landing">
      <LandingHero />
      <LandingFeatures />
      <LandingQuizDemo />
      <LandingFooter />
    </div>
  );
}
