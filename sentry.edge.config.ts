// sentry.edge.config.ts
//
// Sentry initialization for the EDGE RUNTIME (middleware, edge API routes).
// Edge runtime is a restricted environment (no Node.js APIs).
// Keep this config minimal — only DSN and sampling.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // ── Sampling ──────────────────────────────────────────────────────────────
  // Lower sampling on edge to minimize overhead in the fast path.
  tracesSampleRate: 0.05,

  // ── Environment ───────────────────────────────────────────────────────────
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',

  // ── PII Scrubbing ─────────────────────────────────────────────────────────
  // Edge runs for middleware (auth guard) — strip any user data from events.
  beforeSend(event) {
    if (event.user) {
      const { id } = event.user;
      event.user = id ? { id } : undefined;
    }
    return event;
  },
});
