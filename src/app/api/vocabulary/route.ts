// src/app/api/vocabulary/route.ts
// Controller: GET /api/vocabulary?level=N5&q=taberu&cursor=2&limit=30&category=verb
// Max 30 lines of logic — Zod validate → Service call → typed response.
// Data source: StaticVocabularyRepository (JSON files) — not the flashcards DB table.

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import type { Flashcard } from '@/types/entities';

interface VocabularyResponse {
  cards:      Flashcard[];
  nextCursor: string | null;
  total:      number;
}

type ErrorResponse = {
  error: { code: string; message: string; requestId: string };
};

export async function GET(
  request: NextRequest
): Promise<NextResponse<VocabularyResponse | ErrorResponse>> {
  const requestId = crypto.randomUUID();

  // ── Rate Limiting — 60 req / 60 s ───────────────────────────────────────────
  const rl = rateLimit(request, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    const rlh = rateLimitHeaders(rl, 60);
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests.', requestId } },
      { status: 429, headers: rlh }
    );
  }

  const { searchParams } = request.nextUrl;
  const rawLevel    = searchParams.get('level')    ?? undefined;
  const rawSearch   = searchParams.get('q')        ?? undefined;
  const rawCursor   = searchParams.get('cursor')   ?? undefined;
  const rawLimit    = searchParams.get('limit')    ?? undefined;
  const rawCategory = searchParams.get('category') ?? undefined;

  // ── Auth check (vocabulary is a protected module) ────────────────────────────
  try {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies }            = await import('next/headers');
    const { VocabularyService }  = await import('@/features/vocabulary/VocabularyService');

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']      ?? '',
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
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required.', requestId } },
        { status: 401 }
      );
    }

    // ── Service call ──────────────────────────────────────────────────────────
    let result;
    try {
      result = await VocabularyService.getVocabularyPage(
        rawLevel, rawSearch, rawCursor, rawLimit, rawCategory
      );
    } catch (validationError) {
      const message = validationError instanceof Error
        ? validationError.message
        : 'Invalid request parameters.';
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message, requestId } },
        { status: 422 }
      );
    }

    return NextResponse.json({
      cards:      result.cards,
      nextCursor: result.nextCursor,
      total:      result.total,
    });

  } catch {
    // Auth failure (Supabase paused) — still serve static vocabulary data
    try {
      const { VocabularyService } = await import('@/features/vocabulary/VocabularyService');
      const result = await VocabularyService.getVocabularyPage(
        rawLevel, rawSearch, rawCursor, rawLimit, rawCategory
      );
      return NextResponse.json(
        { cards: result.cards, nextCursor: result.nextCursor, total: result.total },
        { headers: { 'X-NihongoQuest-Auth': 'bypassed-supabase-down' } }
      );
    } catch {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch vocabulary.', requestId } },
        { status: 500 }
      );
    }
  }
}
