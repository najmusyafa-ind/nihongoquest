import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

// ── Content Security Policy ───────────────────────────────────────────────────
// Defines trusted sources for each resource type.
// 'unsafe-inline' is required for Tailwind CSS v4 in dev mode (injected styles).
// Tighten `script-src` in production by removing 'unsafe-inline' and using nonces.
const CSP = [
  "default-src 'self'",
  // Scripts: self + Next.js runtime
  // Production: NO unsafe-eval (XSS risk). Development: allow eval for HMR hot-reload.
  process.env.NODE_ENV === 'production'
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Styles: self + inline styles (required for Tailwind CSS v4 + GSAP)
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fonts: self + Google Fonts CDN
  "font-src 'self' https://fonts.gstatic.com data:",
  // Images: self + data URIs (for SVG inline) + Supabase storage
  "img-src 'self' data: blob: https://*.supabase.co",
  // Connect: self + Supabase API + Gemini API + Sentry ingest (error monitoring)
  "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com wss://*.supabase.co https://o*.ingest.sentry.io https://o*.ingest.us.sentry.io",
  // Media: self
  "media-src 'self'",
  // Object: none (no plugins)
  "object-src 'none'",
  // Manifest: self (PWA manifest)
  "manifest-src 'self'",
  // Frames: none (no iframes)
  "frame-src 'none'",
  // Frame ancestors: none (prevent clickjacking — belt AND suspenders with X-Frame-Options)
  "frame-ancestors 'none'",
  // Workers: self (service worker for PWA)
  "worker-src 'self' blob:",
  // Base URI: restrict to self
  "base-uri 'self'",
  // Form action: restrict to self
  "form-action 'self'",
  // Upgrade insecure requests in production
  "upgrade-insecure-requests",
].join('; ');

// ── Security Headers Applied to ALL Routes ───────────────────────────────────
const SECURITY_HEADERS = [
  // Prevent MIME type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  // Prevent clickjacking (belt)
  { key: 'X-Frame-Options', value: 'DENY' },

  // Legacy XSS filter (belt + suspenders for older browsers)
  { key: 'X-XSS-Protection', value: '1; mode=block' },

  // Enforce HTTPS for 1 year including subdomains
  // IMPORTANT: Remove this header during local dev (HTTPS not active)
  // Enable when deployed to production HTTPS domain.
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }]
    : []),

  // Referrer policy: send origin only on same-origin, none cross-origin
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

  // Permissions Policy: restrict browser feature access to minimum needed
  {
    key: 'Permissions-Policy',
    value: [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'interest-cohort=()',  // Disable FLoC tracking
    ].join(', '),
  },

  // Content Security Policy
  { key: 'Content-Security-Policy', value: CSP },

  // DNS prefetch control
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig: NextConfig = {
  // Strict mode: catches potential issues early
  reactStrictMode: true,

  async headers() {
    return [
      // ── PWA Manifest ─────────────────────────────────────────────────────
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      // ── Service Worker (PWA) ──────────────────────────────────────────────
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      // ── All Routes — Security Headers ─────────────────────────────────────
      {
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // ── Sentry Build-Time Options (v10 API) ─────────────────────────────────
  // Org and project from .env.local (SENTRY_ORG, SENTRY_PROJECT)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Suppress verbose Sentry build output in CI / local dev
  silent: true,

  // Upload source maps for readable stack traces.
  // deleteSourcemapsAfterUpload: source maps deleted from server after upload (not public).
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
