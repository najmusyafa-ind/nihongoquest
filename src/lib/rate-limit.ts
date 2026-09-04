// src/lib/rate-limit.ts
// Sliding-window in-memory rate limiter for Next.js API routes (Vercel Serverless).
//
// Design notes:
//   - Each Vercel Lambda instance has its own memory — this is per-instance limiting.
//   - Sufficient for portfolio + small production traffic (< 10k req/day).
//   - For high-traffic production, swap the Map with Upstash Redis (@upstash/ratelimit).
//   - Identifier = IP address (from x-forwarded-for) or fallback to 'anonymous'.
//
// Usage:
//   const result = rateLimit(request, { limit: 20, windowMs: 60_000 });
//   if (!result.ok) return NextResponse.json({ error: ... }, { status: 429 });

import type { NextRequest } from 'next/server';

interface RateLimitOptions {
  /** Maximum requests allowed within the window. */
  limit: number;
  /** Window duration in milliseconds. Default: 60_000 (1 minute). */
  windowMs?: number;
}

interface RateLimitResult {
  ok: boolean;
  /** How many requests remain in the current window. */
  remaining: number;
  /** Unix timestamp (ms) when the window resets. */
  resetAt: number;
  /** Client identifier used for keying (IP or 'anonymous'). */
  identifier: string;
}

// ── In-memory store ──────────────────────────────────────────────────────────
//   key: `${route}:${identifier}`
//   value: { count, windowStart }
interface WindowEntry {
  count: number;
  windowStart: number;
}
const store = new Map<string, WindowEntry>();

// Cleanup stale windows every 5 minutes to prevent unbounded memory growth.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      // 10 minute TTL — generous to handle long windows
      if (now - entry.windowStart > 10 * 60_000) {
        store.delete(key);
      }
    }
  }, 5 * 60_000);
}

// ── Core function ────────────────────────────────────────────────────────────
export function rateLimit(
  request: NextRequest,
  options: RateLimitOptions,
  /** Optional route key — defaults to request.nextUrl.pathname */
  routeKey?: string,
): RateLimitResult {
  const { limit, windowMs = 60_000 } = options;
  const now = Date.now();

  // Resolve client identifier from standard proxy headers
  const forwarded = request.headers.get('x-forwarded-for');
  const identifier = forwarded
    ? (forwarded.split(',')[0]?.trim() ?? 'anonymous')
    : (request.headers.get('x-real-ip') ?? 'anonymous');

  const key = `${routeKey ?? request.nextUrl?.pathname ?? new URL(request.url).pathname}:${identifier}`;

  const entry = store.get(key);

  // Check if we are in a new window
  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return {
      ok: true,
      remaining: limit - 1,
      resetAt: now + windowMs,
      identifier,
    };
  }

  // Increment within the same window
  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  const resetAt = entry.windowStart + windowMs;

  return {
    ok: entry.count <= limit,
    remaining,
    resetAt,
    identifier,
  };
}

// ── Response headers helper ───────────────────────────────────────────────────
// Adds standard RFC 6585 / RateLimit-* headers to a headers object.
export function rateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  return {
    'RateLimit-Limit':     String(limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset':     String(Math.ceil(result.resetAt / 1000)), // Unix seconds
    'Retry-After':         result.ok ? '0' : String(Math.ceil((result.resetAt - Date.now()) / 1000)),
  };
}
