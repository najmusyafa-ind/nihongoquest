// src/app/api/sessions/route.ts – Get & create study sessions for current user
// Falls back to demo data if Supabase is not configured (dev mode)
// F4: cursor-based pagination on GET (?cursor=<ISO>&limit=<n>)
// F5: X-Request-Id on all error + success responses
//
// GAP-11 NOTE: This endpoint accepts session-level aggregates (correct/incorrect counts).
// Per-question study_results from QUIZ mode are NOT saved here because the study_results
// table requires flashcard_id (FK NOT NULL) — quiz questions carry vocabulary word strings,
// not flashcard UUIDs. Resolving word→UUID would require N extra DB queries per question.
// Future improvement: store quiz results in a separate `quiz_results` table without FK constraint.

import { NextRequest, NextResponse } from 'next/server';

import { isDemoMode, DEMO_SESSIONS } from '@/lib/demo-data';

import { cookies } from 'next/headers';

import { z } from 'zod';

import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { childLogger } from '@/lib/logger';
import { getOrCreateRequestId, requestIdHeader } from '@/lib/request-id';

const log = childLogger('api/sessions');

// ── Strict Validation Schema ──────────────────────────────────────────────────
const SessionPayloadSchema = z.object({
  id: z.string().uuid(),
  level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ABANDONED']),
  totalCards: z.number().int().min(1),
  correctCount: z.number().int().min(0),
  incorrectCount: z.number().int().min(0),
  skippedCount: z.number().int().min(0),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});

// ── Pagination query schema ───────────────────────────────────────────────────
const PaginationSchema = z.object({
  /** ISO timestamp cursor — exclusive lower bound (startedAt < cursor) */
  cursor: z.string().datetime().optional(),
  /** Number of records per page. Clamped to [1, 100] in repository. Default: 20 */
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SessionPayload = z.infer<typeof SessionPayloadSchema>;

// Typed API response DTO — no `any`
interface SessionsGetResponse {
  sessions: Array<{
    id: string;
    userId: string;
    level: string;
    status: string;
    totalCards: number;
    correctCount: number;
    incorrectCount: number;
    skippedCount: number;
    startedAt: Date;
    completedAt: Date | null;
  }>;
  /** Cursor for the next page — ISO string of the oldest startedAt in this page. */
  nextCursor: string | null;
  _demo?: boolean;
}

interface SessionPostResponse {
  ok: boolean;
  isClockAnomalous?: boolean;
  /** Achievement IDs newly unlocked in this session (empty array = none new). */
  newlyUnlocked?: string[];
  _demo?: boolean;
  message?: string;
}

// ── GET – list sessions (paginated) ──────────────────────────────────────────
export async function GET(request: NextRequest): Promise<NextResponse<SessionsGetResponse | { error: string; requestId: string }>> {
  const reqId = getOrCreateRequestId(request);

  // Rate Limiting — 30 req / 60 s
  const rlGet = rateLimit(request, { limit: 30, windowMs: 60_000 });
  if (!rlGet.ok) {
    return NextResponse.json(
      { error: 'Too many requests.', requestId: reqId },
      { status: 429, headers: { ...rateLimitHeaders(rlGet, 30), ...requestIdHeader(reqId) } }
    );
  }

  // Parse pagination params
  const { searchParams } = new URL(request.url);
  const paginationResult = PaginationSchema.safeParse({
    cursor: searchParams.get('cursor') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  });

  if (!paginationResult.success) {
    return NextResponse.json(
      { error: 'Invalid pagination params.', requestId: reqId },
      { status: 422, headers: requestIdHeader(reqId) }
    );
  }

  const { cursor, limit } = paginationResult.data;

  // Demo mode: return static sessions (no auth, no DB needed)
  if (isDemoMode()) {
    const demoSlice = DEMO_SESSIONS.slice(0, limit);
    return NextResponse.json(
      { sessions: demoSlice, nextCursor: null, _demo: true },
      { headers: { 'X-NihongoQuest-Mode': 'demo', ...requestIdHeader(reqId) } }
    );
  }

  try {
    const { createServerClient } = await import('@supabase/ssr');
    const { StudySessionService } = await import('@/features/study-session/StudySessionService');

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '',
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* read-only in route handler */ },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', requestId: reqId },
        { status: 401, headers: requestIdHeader(reqId) }
      );
    }

    const cursorDate = cursor ? new Date(cursor) : undefined;
    const sessions = await StudySessionService.getHistory(user.id, limit, cursorDate);

    // nextCursor = startedAt of the last item (client uses it for the next page)
    const lastSession = sessions[sessions.length - 1];
    const nextCursor = sessions.length === limit && lastSession
      ? (lastSession.startedAt instanceof Date
          ? lastSession.startedAt.toISOString()
          : String(lastSession.startedAt))
      : null;

    return NextResponse.json(
      { sessions, nextCursor },
      { headers: requestIdHeader(reqId) }
    );
  } catch (error) {
    log.error('[/api/sessions GET] Error:', { error, requestId: reqId });
    return NextResponse.json(
      { error: 'Failed to fetch sessions', requestId: reqId },
      { status: 500, headers: requestIdHeader(reqId) }
    );
  }
}

// ── POST – save completed session ────────────────────────────────────────────
export async function POST(
  request: NextRequest
): Promise<NextResponse<SessionPostResponse | { error: string; requestId: string; details?: unknown }>> {
  const reqId = getOrCreateRequestId(request);

  // Rate Limiting — 20 req / 60 s (write endpoint, stricter)
  const rlPost = rateLimit(request, { limit: 20, windowMs: 60_000 });
  if (!rlPost.ok) {
    return NextResponse.json(
      { error: 'Too many requests.', requestId: reqId },
      { status: 429, headers: { ...rateLimitHeaders(rlPost, 20), ...requestIdHeader(reqId) } }
    );
  }

  // Demo mode: accept the payload but don't persist (no-op)
  if (isDemoMode()) {
    return NextResponse.json(
      { ok: true, _demo: true, message: 'Demo mode — session not persisted' },
      { headers: { 'X-NihongoQuest-Mode': 'demo', ...requestIdHeader(reqId) } }
    );
  }

  try {
    const { createServerClient } = await import('@supabase/ssr');

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '',
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* read-only in route handler */ },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', requestId: reqId },
        { status: 401, headers: requestIdHeader(reqId) }
      );
    }

    // ── Strict Payload Validation (Zod — first security gate) ────────────────
    const rawBody: unknown = await request.json();
    const parsedBody = SessionPayloadSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      log.warn('[/api/sessions POST] Validation failed:', { error: parsedBody.error.format(), requestId: reqId });
      return NextResponse.json(
        { error: 'Invalid payload', requestId: reqId, details: parsedBody.error.format() },
        { status: 422, headers: requestIdHeader(reqId) }
      );
    }

    const body = parsedBody.data;

    // ── Clock Skew Detection (GAP-3 — Server-Time Validation) ────────────────
    // Compares client-supplied startedAt against server time.
    // Anomaly criteria (Option A — Save + Flag, no data loss):
    //   - Future drift > 24h  → likely device clock set ahead (streak manipulation)
    //   - Past drift > 30 days → likely replaying stale offline sessions
    // Session is ALWAYS saved. is_anomalous flag is logged and returned in header.
    const serverNow = Date.now();
    const clientStartMs = new Date(body.startedAt).getTime();
    const deltaMs = clientStartMs - serverNow;
    const FUTURE_THRESHOLD_MS = 24 * 60 * 60 * 1000;   // 24 hours
    const PAST_THRESHOLD_MS   = 30 * 24 * 60 * 60 * 1000; // 30 days

    const isClockAnomalous =
      deltaMs > FUTURE_THRESHOLD_MS ||     // far future
      -deltaMs > PAST_THRESHOLD_MS;        // far past

    if (isClockAnomalous) {
      log.warn('[/api/sessions POST] Clock skew anomaly detected', {
        userId: user.id,
        sessionId: body.id,
        clientStartedAt: body.startedAt,
        serverNowIso: new Date(serverNow).toISOString(),
        deltaSec: Math.round(deltaMs / 1000),
        requestId: reqId,
      });
    }

    // ── Persist Session (regardless of clock anomaly — Option A) ─────────────
    const { StudySessionRepository } = await import('@/features/study-session/StudySessionRepository');

    // Upsert-style: insert session if not exists, then mark complete
    // onConflictDoNothing handles idempotency (client UUID — ADR-005)
    await StudySessionRepository.createSession({
      id: body.id,
      userId: user.id,
      level: body.level,
      totalCards: body.totalCards,
      startedAt: new Date(body.startedAt),
    }).catch(() => {
      // Session may already exist if partially synced — that's OK
    });

    await StudySessionRepository.completeSession(body.id, {
      correctCount: body.correctCount,
      incorrectCount: body.incorrectCount,
      skippedCount: body.skippedCount,
    });

    // ── Achievement Evaluation (ADR-011, Option A — Service layer, synchronous) ─
    // Non-blocking: badge errors must NEVER fail the session save.
    // evaluateAndPersistUnlocks() uses ON CONFLICT DO NOTHING — fully idempotent.
    let newlyUnlocked: string[] = [];
    try {
      const { AchievementsService } = await import('@/features/achievements/AchievementsService');
      const { AchievementsRepository } = await import('@/features/achievements/AchievementsRepository');

      const stats = await AchievementsRepository.getStatsForUser(user.id);
      newlyUnlocked = await AchievementsService.evaluateAndPersistUnlocks({
        userId: user.id,
        stats,
        isClockAnomalous,
      });

      if (newlyUnlocked.length > 0) {
        log.info('[/api/sessions POST] Achievements unlocked:', {
          userId: user.id,
          sessionId: body.id,
          newlyUnlocked,
          requestId: reqId,
        });
      }
    } catch (achError) {
      // Non-blocking: log and continue. Session is already saved.
      log.error('[/api/sessions POST] Achievement evaluation failed (non-blocking):', {
        error: achError,
        userId: user.id,
        sessionId: body.id,
        requestId: reqId,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        isClockAnomalous,
        newlyUnlocked,
        // GAP-11: Per-question quiz results are not saved to study_results.
        // See file header comment for full explanation and future improvement path.
      },
      {
        status: 201,
        headers: {
          ...requestIdHeader(reqId),
          // Downstream clients can read this header to surface a gentle warning
          'X-NihongoQuest-Clock-Anomaly': isClockAnomalous ? '1' : '0',
        },
      }
    );
  } catch (error) {
    log.error('[/api/sessions POST] Error:', { error, requestId: reqId });
    return NextResponse.json(
      { error: 'Failed to save session', requestId: reqId },
      { status: 500, headers: requestIdHeader(reqId) }
    );
  }
}
