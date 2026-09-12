// src/app/api/achievements/route.ts — GET /api/achievements
// Auth-gated: returns achievement progress for the authenticated user.
// Falls back to demo data when DATABASE_URL is not configured.
// GAP-8 FIX: Uses canonical isDemoMode() from @/lib/demo-data (consistent across all routes).

import { NextRequest, NextResponse } from 'next/server';
import { AchievementsService } from '@/features/achievements/AchievementsService';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { isDemoMode } from '@/lib/demo-data';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Rate limit: 20 req/min — aggregate DB query, no need for high frequency
  const rl = await checkRateLimit(request, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    const rlHeaders = rateLimitHeaders(rl, 20);
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a minute.' } },
      { status: 429, headers: rlHeaders },
    );
  }

  // ── Demo Mode ──────────────────────────────────────────────────────────────
  if (isDemoMode()) {
    return NextResponse.json(AchievementsService.getDemoAchievements(), {
      headers: { 'X-NihongoQuest-Mode': 'demo' },
    });
  }

  // ── Auth Check (Zero Trust) ────────────────────────────────────────────────
  let userId: string;
  try {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies }            = await import('next/headers');
    const cookieStore            = await cookies();

    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']      ?? '',
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '',
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* read-only route */ },
        },
      },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Guest or unauthenticated user: return full catalog with 0 progress so badges are viewable
      const initialStats = {
        totalSessionsCount: 0,
        totalCardsCount: 0,
        maxStreakInDays: 0,
        perfectSessionsCount: 0,
        n5SessionsCount: 0,
        n4SessionsCount: 0,
        hasSpeedDemonSession: false,
      };
      return NextResponse.json(AchievementsService.evaluateAchievements(initialStats), {
        headers: { 'X-NihongoQuest-Empty-State': 'guest' },
      });
    }
    userId = user.id;
  } catch {
    // Supabase unavailable — return demo rather than crashing
    return NextResponse.json(
      { ...AchievementsService.getDemoAchievements(), _fallback: true },
      { headers: { 'X-NihongoQuest-AI-Fallback': 'auth-unavailable' } },
    );
  }

  // ── Fetch Stats + Evaluate ─────────────────────────────────────────────────
  try {
    const { AchievementsRepository } = await import('@/features/achievements/AchievementsRepository');

    // Run both queries in parallel — zero extra latency vs the previous single query
    const [stats, persistedTimestamps] = await Promise.all([
      AchievementsRepository.getStatsForUser(userId),
      AchievementsRepository.getUnlockedTimestamps(userId),
    ]);

    // ADR-011: Pass persisted timestamps so achievements display real unlock dates
    const response = AchievementsService.evaluateAchievements(stats, persistedTimestamps);

    return NextResponse.json(response, {
      // Cache for 60s — achievements don't change per-second
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  } catch (error) {
    // Log full detail server-side — never expose internal error.message to client (CISO finding)
    const { childLogger } = await import('@/lib/logger');
    const log = childLogger('api/achievements');
    log.error('[/api/achievements GET] Evaluation failed:', { error, userId });

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to evaluate achievements.',
        },
      },
      { status: 500 },
    );
  }
}

// Local isDemoMode removed — GAP-8 FIX: use canonical @/lib/demo-data#isDemoMode instead.
