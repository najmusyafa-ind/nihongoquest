// src/app/api/quiz/start/route.ts
// Controller: POST /api/quiz/start â†’ { questions: QuizQuestion[] }
// Zod validate â†’ auth â†’ QuizService â†’ typed response

import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { isDemoMode, DEMO_CARDS_N5, DEMO_CARDS_N4 } from '@/lib/demo-data';

import { cookies } from 'next/headers';

import type { QuizQuestion, StartQuizResponse } from '@/types/quiz.types';

import type { JlptLevel } from '@/types/enums';

import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { childLogger } from '@/lib/logger';

const log = childLogger('api/quiz');



// â”€â”€ Request Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const StartQuizSchema = z.object({
  level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']),
  count: z.number().int().min(5).max(50).default(10),
});

type ErrorResponse = {
  error: { code: string; message: string; requestId: string; details?: unknown };
};

export async function POST(
  request: NextRequest
): Promise<NextResponse<StartQuizResponse | ErrorResponse>> {
  const requestId = crypto.randomUUID();

  // â”€â”€ Rate Limiting â€” 20 req / 60 s â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const rl = rateLimit(request, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    const rlh = rateLimitHeaders(rl, 20);
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests.', requestId } },
      { status: 429, headers: rlh }
    );
  }

  // â”€â”€ Parse body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = StartQuizSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body.', requestId, details: parsed.error.format() } },
      { status: 422 }
    );
  }

  const { level, count } = parsed.data;

  // â”€â”€ Demo mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isDemoMode()) {
    const { QuizService } = await import('@/features/quiz/QuizService');
    const demoPool = level === 'N4' ? DEMO_CARDS_N4 : DEMO_CARDS_N5;

    // Build demo questions from in-memory cards
    const safeCount = Math.min(count, demoPool.length);
    const shuffled = QuizService.shuffleArray(demoPool).slice(0, safeCount);
    const allCards  = [...DEMO_CARDS_N5, ...DEMO_CARDS_N4];

    const questions: QuizQuestion[] = shuffled.map(card =>
      QuizService.buildQuestion(card, allCards, level as JlptLevel)
    );

    return NextResponse.json(
      { questions },
      { headers: { 'X-NihongoQuest-Mode': 'demo' } }
    );
  }

  // â”€â”€ Auth check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  try {
    const { createServerClient } = await import('@supabase/ssr');
    const { QuizService } = await import('@/features/quiz/QuizService');

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
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required.', requestId } },
        { status: 401 }
      );
    }

    const questions = await QuizService.generateQuiz({ level: level as JlptLevel, count });
    return NextResponse.json({ questions }, { status: 200 });

  } catch (error) {
    log.error('[/api/quiz/start POST]', { requestId, error });
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to generate quiz.', requestId } },
      { status: 500 }
    );
  }
}






