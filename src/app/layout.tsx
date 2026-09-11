// src/app/layout.tsx — Root layout for NihongoQuest
// Fonts loaded via next/font/google (per ultimate-uiux-dev Rule: @import is BANNED)
// Font variables applied at <html> level so ALL child elements inherit them.

import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Noto_Serif_JP, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

// ── Font Definitions ──────────────────────────────────────────────────────────
// display: 'swap' prevents FOUT (Flash of Unstyled Text) and keeps text visible
// during font load — required for scroll/GSAP animations that start with opacity:0

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ui',
  display: 'swap',
  preload: true,
});

const notoSerifJp = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-jp',
  display: 'swap',
  // Japanese fonts are large — do NOT preload to avoid blocking LCP
  preload: false,
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
});

// ── Metadata ──────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000'),
  title: {
    default: 'NihongoQuest | 日本語クエスト',
    template: '%s | NihongoQuest',
  },
  description: 'Master Japanese vocabulary with smart flashcards, blind grading, and AI-powered grammar explanations. Study offline, sync when online.',
  keywords: ['Japanese', 'JLPT', 'flashcards', 'language learning', '日本語', '語学学習'],
  authors: [{ name: 'NihongoQuest' }],
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'NihongoQuest | 日本語クエスト',
    description: 'Master Japanese vocabulary with smart flashcards, spaced repetition, and AI-powered grammar explanations.',
    type: 'website',
    url: process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://nihongoquest.vercel.app',
    siteName: 'NihongoQuest',
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NihongoQuest — Master Japanese with smart flashcards',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NihongoQuest | 日本語クエスト',
    description: 'Master Japanese vocabulary with smart flashcards and AI explanations.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#f7f5f0',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Font Loading Guard (ultimate-uiux-dev Rule):
  // Font CSS variables MUST be applied at <html> level via className.
  // This ensures h1, h2, p, span, button, a, input ALL inherit the font —
  // even if a third-party lib uses `all: unset` which breaks CSS inheritance.
  const fontClasses = [
    plusJakartaSans.variable,
    notoSerifJp.variable,
    geistMono.variable,
  ].join(' ');

  return (
    <html lang="en" className={fontClasses} suppressHydrationWarning data-scroll-behavior="smooth">
      <head />
      <body>
        <ThemeProvider>
          <ErrorBoundary>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-ui)',
                  boxShadow: 'var(--shadow-card)',
                },
              }}
            />
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
