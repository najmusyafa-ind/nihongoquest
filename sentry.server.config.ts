// sentry.server.config.ts
//
// Sentry initialization for the SERVER-SIDE (Node.js runtime) bundle.
// Loaded by @sentry/nextjs for API routes, Server Actions, and SSR pages.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // ── Sampling ──────────────────────────────────────────────────────────────
  // 10% transaction sampling — sufficient for indie scale.
  tracesSampleRate: 0.1,

  // ── Environment ───────────────────────────────────────────────────────────
  environment: process.env.NODE_ENV,

  // Disable in development to avoid cluttering local console output.
  enabled: process.env.NODE_ENV === 'production',

  // ── PII Scrubbing (CISO Mandatory) ────────────────────────────────────────
  // Server-side errors may contain DB query params or request bodies.
  // Strip userAnswer and any user input from all server-side events.
  beforeSend(event) {
    // Strip request body data containing user answers
    if (event.request?.data && typeof event.request.data === 'object') {
      const data = event.request.data as Record<string, unknown>;
      if ('userAnswer' in data) {
        const { userAnswer: _stripped, ...rest } = data;
        void _stripped;
        event.request.data = rest;
      }
    }

    // Keep only anonymous user id — no email, no name
    if (event.user) {
      const { id } = event.user;
      event.user = id ? { id } : undefined;
    }

    return event;
  },
});
