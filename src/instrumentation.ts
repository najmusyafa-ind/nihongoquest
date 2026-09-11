// src/instrumentation.ts
//
// Next.js 15/16 Lifecycle Hook for Sentry SDK
// Automatically registers Sentry on server startup (Node.js & Edge runtimes).
// CISO Mandate: Ensure error capture hook is exported for unhandled server errors.

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
