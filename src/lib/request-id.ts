// src/lib/request-id.ts
// Lightweight request ID generator + extractor for tracing production errors.
//
// Usage in route handlers:
//   import { getOrCreateRequestId, requestIdHeader } from '@/lib/request-id';
//
//   export async function GET(request: NextRequest) {
//     const reqId = getOrCreateRequestId(request);
//     // ...
//     return NextResponse.json({ error: 'Not found' }, {
//       status: 404,
//       headers: requestIdHeader(reqId),
//     });
//   }

import { type NextRequest } from 'next/server';

/** Header name used for request tracing (Vercel/Railway convention). */
export const REQUEST_ID_HEADER = 'X-Request-Id' as const;

/**
 * Extract the incoming request ID from `X-Request-Id` header (set by load balancer
 * or upstream service), or generate a new one if absent.
 *
 * Format: `nq_<timestamp_base36>_<6-char-random-hex>`
 * Example: `nq_m0v1c3k_a3f9d1`
 *
 * Kept intentionally short: visible in logs without wrapping, not a UUID.
 */
export function getOrCreateRequestId(request: NextRequest): string {
  const existing = request.headers.get(REQUEST_ID_HEADER);
  if (existing && existing.trim().length > 0) return existing.trim();
  return generateRequestId();
}

/**
 * Generate a fresh NihongoQuest request ID.
 * Format: `nq_<timestamp_base36>_<6-char-random-hex>`
 */
export function generateRequestId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0');
  return `nq_${ts}_${rand}`;
}

/**
 * Returns a headers object to attach to NextResponse so the caller can
 * correlate the response with their logs.
 */
export function requestIdHeader(requestId: string): Record<string, string> {
  return { [REQUEST_ID_HEADER]: requestId };
}
