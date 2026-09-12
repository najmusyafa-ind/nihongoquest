// src/lib/rate-limit.ts
// Hybrid rate limiter: Upstash Redis (distributed) when configured, in-memory fallback for dev.
//
// Design:
//   PRODUCTION (Vercel): checkRateLimit() uses @upstash/ratelimit — shared across all Lambda instances.
//   DEVELOPMENT (local): Falls back to in-memory Map — sufficient for single-process dev server.
//
// Fix C-1: In-memory Map is per-Lambda-instance → not effective on Vercel. Upstash Redis is shared.
// Fix C-2: Identifier priority: x-real-ip (Vercel-injected, trusted) > x-forwarded-for (spoofable) > 'anonymous'
//
// Usage (async — await required):
//   const rl = await checkRateLimit(request, { limit: 20, windowMs: 60_000 });
//   if (!rl.ok) return NextResponse.json({ error: ... }, { status: 429 });

import type { NextRequest } from 'next/server';
import { childLogger } from '@/lib/logger';

const log = childLogger('rate-limit');

// ── Types ─────────────────────────────────────────────────────────────────────
export interface RateLimitOptions {
  /** Maximum requests allowed within the window. */
  limit: number;
  /** Window duration in milliseconds. Default: 60_000 (1 minute). */
  windowMs?: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;  // Unix timestamp (ms)
  identifier: string;
}

// ── C-2 Fix: Trusted Identifier Resolution ────────────────────────────────────
// x-real-ip is set by Vercel's edge network and cannot be spoofed by clients.
// x-forwarded-for first item CAN be spoofed (client-controlled header).
// Priority: x-real-ip > last x-forwarded-for value (proxy chain) > 'anonymous'
function resolveIdentifier(request: NextRequest): string {
  // x-real-ip: set by Vercel — most trustworthy
  const realIp = request.headers.get('x-real-ip');
  if (realIp?.trim()) return realIp.trim();

  // x-forwarded-for: prefer the LAST value (closest upstream proxy, harder to spoof)
  // NOT the first value (client-controlled and trivially spoofable)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',');
    const lastPart = parts[parts.length - 1]?.trim();
    if (lastPart) return lastPart;
  }

  return 'anonymous';
}

// ── In-memory fallback (development / no Upstash) ────────────────────────────
interface WindowEntry { count: number; windowStart: number; }
const _devStore = new Map<string, WindowEntry>();

// Cleanup stale windows every 5 minutes (dev only)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of _devStore.entries()) {
      if (now - entry.windowStart > 10 * 60_000) _devStore.delete(key);
    }
  }, 5 * 60_000);
}

function _inMemoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = _devStore.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    _devStore.set(key, { count: 1, windowStart: now });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs, identifier: key };
  }

  entry.count += 1;
  return {
    ok: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.windowStart + windowMs,
    identifier: key,
  };
}

// ── C-1 Fix: Main export — async, Upstash-first ───────────────────────────────
// Resolves to Upstash Redis if UPSTASH_REDIS_REST_URL is set, else in-memory.
export async function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions,
  routeKey?: string,
): Promise<RateLimitResult> {
  const { limit, windowMs = 60_000 } = options;
  const identifier = resolveIdentifier(request);
  const routePath = routeKey ?? request.nextUrl?.pathname ?? new URL(request.url).pathname;
  const key = `${routePath}:${identifier}`;
  const now = Date.now();

  const upstashUrl = process.env['UPSTASH_REDIS_REST_URL'];
  const upstashToken = process.env['UPSTASH_REDIS_REST_TOKEN'];

  // ── Upstash path (production) ──────────────────────────────────────────────
  if (upstashUrl && upstashToken) {
    try {
      const { Ratelimit } = await import('@upstash/ratelimit');
      const { Redis }     = await import('@upstash/redis');

      const redis = new Redis({ url: upstashUrl, token: upstashToken });
      const windowSec = Math.ceil(windowMs / 1000);

      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSec}s`),
        prefix:  'nihongoquest:rl',
        analytics: false, // keep it cheap on free tier
      });

      const { success, remaining, reset } = await ratelimit.limit(key);
      return {
        ok:         success,
        remaining:  remaining,
        resetAt:    reset,      // Upstash returns Unix ms
        identifier,
      };
    } catch {
      // Upstash unavailable — degrade to in-memory rather than blocking all requests
      log.warn('Upstash unavailable, falling back to in-memory rate limiter');
      return _inMemoryRateLimit(key, limit, windowMs);
    }
  }

  // ── In-memory fallback (development / demo) ────────────────────────────────
  const result = _inMemoryRateLimit(key, limit, windowMs);
  void now; // explicit — resetAt already computed inside _inMemoryRateLimit
  return result;
}

// ── Response headers helper (RFC 6585 / RateLimit-* headers) ─────────────────
export function rateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  const headers: Record<string, string> = {
    'RateLimit-Limit':     String(limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset':     String(Math.ceil(result.resetAt / 1000)),
  };
  // M-Mi-2 fix: Retry-After ONLY on 429, not on success responses (RFC 6585)
  if (!result.ok) {
    headers['Retry-After'] = String(Math.ceil((result.resetAt - Date.now()) / 1000));
  }
  return headers;
}

// ── Legacy sync export (kept for any edge-runtime callers) ────────────────────
// @deprecated — use checkRateLimit() instead. Will be removed in a future version.
export function rateLimit(
  request: NextRequest,
  options: RateLimitOptions,
  routeKey?: string,
): RateLimitResult {
  const { limit, windowMs = 60_000 } = options;
  const identifier = resolveIdentifier(request);
  const routePath = routeKey ?? request.nextUrl?.pathname ?? new URL(request.url).pathname;
  const key = `${routePath}:${identifier}`;
  return _inMemoryRateLimit(key, limit, windowMs);
}
