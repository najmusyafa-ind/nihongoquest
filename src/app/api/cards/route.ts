// src/app/api/cards/route.ts – Get flashcards by JLPT level
// Falls back to demo data if DATABASE_URL is not configured (dev mode)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FlashcardService } from '@/features/flashcard/FlashcardService';
import { getDemoCards, isDemoMode } from '@/lib/demo-data';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getOrCreateRequestId, requestIdHeader } from '@/lib/request-id';

const VALID_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;

const QuerySchema = z.object({
  level: z.enum(VALID_LEVELS),
  /** cardsPerSession from useSettingsStore — clamped to [5, 50] in service layer */
  count: z.coerce.number().int().min(5).max(50).default(20),
});

export async function GET(request: NextRequest) {
  const reqId = getOrCreateRequestId(request);

  // Rate limit: 60 req/min — generous for normal sessions, blocks scrapers
  const rl = rateLimit(request, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    const rlHeaders = rateLimitHeaders(rl, 60);
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a minute.', retryAfter: rlHeaders['Retry-After'], requestId: reqId } },
      { status: 429, headers: { ...rlHeaders, ...requestIdHeader(reqId) } },
    );
  }

  const { searchParams } = new URL(request.url);

  const parsed = QuerySchema.safeParse({
    level: searchParams.get('level'),
    count: searchParams.get('count') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.format(), requestId: reqId } },
      { status: 422, headers: requestIdHeader(reqId) },
    );
  }

  const { level, count } = parsed.data;

  // ── Demo Mode Fallback ──────────────────────────────────────────────────────
  // When DATABASE_URL is not set, return static seed cards so the UI still works.
  if (isDemoMode()) {
    const demoLevel = (level === 'N5' || level === 'N4') ? level : 'N5';
    const cards = getDemoCards(demoLevel, count);
    return NextResponse.json(
      { cards, _demo: true },
      { headers: { 'X-NihongoQuest-Mode': 'demo' } },
    );
  }
  // ────────────────────────────────────────────────────────────────────────────

  try {
    const cards = await FlashcardService.getSessionCards(level, count);
    return NextResponse.json({ cards }, { headers: requestIdHeader(reqId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch cards', details: message, requestId: reqId } },
      { status: 500, headers: requestIdHeader(reqId) },
    );
  }
}
