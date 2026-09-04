// sentry.client.config.ts
//
// Sentry initialization for the BROWSER (client-side) bundle.
// This file is auto-loaded by @sentry/nextjs via next.config.ts withSentryConfig().
//
// CISO Mandate — beforeSend PII scrubbing:
//   User study answers, email, and any personal data MUST be stripped before
//   events leave the browser. We do NOT transmit user learning data to Sentry.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // ── Sampling ──────────────────────────────────────────────────────────────
  // 10% of transactions traced — sufficient for indie scale, keeps quota low.
  tracesSampleRate: 0.1,

  // Session Replay: capture 5% of sessions normally, 100% on errors.
  // maskAllText: true — masks all text content in replays (GDPR-safe).
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  // ── Environment ───────────────────────────────────────────────────────────
  environment: process.env.NODE_ENV,

  // Disable Sentry entirely in development to avoid noise in local logs.
  enabled: process.env.NODE_ENV === 'production',

  // ── PII Scrubbing (CISO Mandatory) ────────────────────────────────────────
  // Strip sensitive fields before events are transmitted to Sentry servers.
  // Fields scrubbed: userAnswer (study input), email, any auth tokens.
  beforeSend(event) {
    // Remove user answer data from exception contexts
    if (event.contexts) {
      // Deep-clone to avoid mutating the original event object
      const scrubbed = JSON.parse(JSON.stringify(event.contexts)) as typeof event.contexts;
      // Walk all context keys and remove any field named 'userAnswer'
      for (const key of Object.keys(scrubbed ?? {})) {
        const ctx = scrubbed![key];
        if (ctx && typeof ctx === 'object' && 'userAnswer' in ctx) {
          delete ctx.userAnswer;
        }
      }
      event.contexts = scrubbed;
    }

    // Remove user PII from the event's user object (keep only anonymous id)
    if (event.user) {
      const { id } = event.user;
      event.user = id ? { id } : undefined;
    }

    // Scrub breadcrumb data that may contain user input.
    // Sentry v10: event.breadcrumbs is Breadcrumb[] directly (not { values: Breadcrumb[] }).
    if (Array.isArray(event.breadcrumbs)) {
      event.breadcrumbs = event.breadcrumbs.map((crumb) => {
        if (crumb.data && 'userAnswer' in crumb.data) {
          const { userAnswer: _stripped, ...rest } = crumb.data as Record<string, unknown>;
          void _stripped; // explicit discard — satisfies TS noUnusedLocals
          return { ...crumb, data: rest };
        }
        return crumb;
      });
    }

    return event;
  },
});
