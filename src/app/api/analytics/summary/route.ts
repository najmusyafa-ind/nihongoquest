// src/app/api/analytics/summary/route.ts
// Controller: GET /api/analytics/summary â†’ AnalyticsSummary
// Auth â†’ AnalyticsService â†’ typed response.
// Graceful degradation: Supabase paused OR user has no data â†’ EMPTY_SUMMARY (not 500)

import { NextResponse } from 'next/server';

import { NextRequest } from 'next/server';

import { isDemoMode } from '@/lib/demo-data';

import { cookies } from 'next/headers';

import type { AnalyticsSummary } from '@/types/quiz.types';

import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { childLogger } from '@/lib/logger';

const log = childLogger('api/analytics');



// â”€â”€ Demo data â€” shown when DEMO_MODE=true env var is set â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DEMO_SUMMARY: AnalyticsSummary = {
  accuracyByLevel: {
    N5: { level: 'N5', accuracyInPercent: 78, totalAnswered: 120 },
    N4: { level: 'N4', accuracyInPercent: 55, totalAnswered: 40 },
  },
  weakWords: [
    { flashcardId: 'demo-n5-17', kanji: 'é«˜ã„', hiragana: 'ãŸã‹ã„', meaningId: 'mahal / tinggi', errorCount: 7, lastAttempted: new Date() },
    { flashcardId: 'demo-n5-19', kanji: 'é¢ç™½ã„', hiragana: 'ãŠã‚‚ã—ã‚ã„', meaningId: 'menarik / lucu', errorCount: 5, lastAttempted: new Date() },
    { flashcardId: 'demo-n4-05', kanji: 'å§‹ã¾ã‚‹', hiragana: 'ã¯ã˜ã¾ã‚‹', meaningId: 'mulai (intransitif)', errorCount: 4, lastAttempted: new Date() },
  ],
  streakDays: 3,
  totalSessions: 12,
  totalCardsStudied: 160,
};

// â”€â”€ Empty state â€” shown to new users or when DB is unreachable â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Same shape as AnalyticsSummary. All zeros = "no data yet", not an error.
const EMPTY_SUMMARY: AnalyticsSummary = {
  accuracyByLevel: {},
  weakWords: [],
  streakDays: 0,
  totalSessions: 0,
  totalCardsStudied: 0,
};

type ErrorResponse = {
  error: { code: string; message: string; requestId: string };
};

export async function GET(request: NextRequest): Promise<NextResponse<AnalyticsSummary | ErrorResponse>> {
  const requestId = crypto.randomUUID();

  // â”€â”€ Rate Limiting â€” 30 req / 60 s â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const rl = await checkRateLimit(request, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) {
    const rlh = rateLimitHeaders(rl, 30);
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests.', requestId } },
      { status: 429, headers: rlh }
    );
  }

  // â”€â”€ Demo mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isDemoMode()) {
    return NextResponse.json(DEMO_SUMMARY, {
      headers: {
        'X-NihongoQuest-Mode': 'demo',
        'Cache-Control': 'private, max-age=120, stale-while-revalidate=30',
      },
    });
  }

  // â”€â”€ Auth check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  try {
    const { createServerClient } = await import('@supabase/ssr');
    const { AnalyticsService } = await import('@/features/analytics/AnalyticsService');

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '',
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* read-only */ },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Unauthenticated or guest user: return empty summary gracefully so the UI shows the friendly empty state
      return NextResponse.json(EMPTY_SUMMARY, {
        headers: { 'X-NihongoQuest-Empty-State': 'guest' },
      });
    }

    // â”€â”€ AnalyticsService may return empty data for new users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // If user has zero sessions, service returns an empty-shaped summary.
    // If DB is unreachable (Supabase paused), we catch below and return EMPTY_SUMMARY.
    try {
      const summary = await AnalyticsService.getSummary(user.id);
      return NextResponse.json(summary, {
        headers: {
          // private: only browser caches (not CDN) â€” data is user-specific
          // stale-while-revalidate: serve stale while fetching fresh in background
          'Cache-Control': 'private, max-age=120, stale-while-revalidate=30',
        },
      });
    } catch (dbError) {
      // DB unreachable or new user with no data â€” degrade gracefully.
      // Log for observability but do NOT surface 500 to the client.
      log.error('[/api/analytics/summary] DB error â€” returning empty state', { requestId, error: dbError });
      return NextResponse.json(EMPTY_SUMMARY, {
        headers: { 'X-NihongoQuest-Empty-State': 'true' },
      });
    }

  } catch (error) {
    // Outer catch: import failure, Supabase client init failure, auth check failure.
    // These are infrastructure issues â€” degrade gracefully with empty state.
    log.error('[/api/analytics/summary GET] Infrastructure error â€” returning empty state', { requestId, error });
    return NextResponse.json(EMPTY_SUMMARY, {
      headers: { 'X-NihongoQuest-Empty-State': 'true' },
    });
  }
}






