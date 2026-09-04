import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { type NextRequest } from 'next/server';
import { POST } from '@/app/api/explain/route';

// Helper: cast a standard Request to NextRequest for test purposes.
// NextRequest extends Request — in test environment we don't need the extra
// properties (cookies, nextUrl, page, ua) because the route handler only
// uses the standard Request API (json(), headers).
function toNextRequest(req: Request): NextRequest {
  return req as unknown as NextRequest;
}

describe('Explain API Route', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let originalEnv: any;

  beforeEach(() => {
    originalEnv = process.env;
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns demo mode response when GEMINI_API_KEY is not set', async () => {
    process.env = { ...originalEnv };
    delete process.env['GEMINI_API_KEY'];

    const req = new Request('http://localhost:3000/api/explain', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
      body: JSON.stringify({ word: '猫', hiragana: 'ねこ', lang: 'en' }),
    });

    const response = await POST(toNextRequest(req));

    expect(response.status).toBe(200);
    const data = await response.json() as { _demo: boolean; explanation: string };

    expect(data._demo).toBe(true);
    // buildStaticExplanation() returns one of 3 deterministic variants.
    // 'GEMINI_API_KEY' is present in ALL variants (EN/JA/ID) — stable anchor for this test.
    // '猫' (ねこ) charSum=29483 → variant 2 → contains 'Kanji breakdown:' + 'Spaced repetition'
    expect(data.explanation).toContain('Kanji breakdown');
    expect(data.explanation).toContain('GEMINI_API_KEY');

  });

  it('returns 400 if required parameters are missing', async () => {
    const req = new Request('http://localhost:3000/api/explain', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
      body: JSON.stringify({}),
    });

    const response = await POST(toNextRequest(req));

    expect(response.status).toBe(400);
    const data = await response.json() as { error: string };
    expect(data.error).toBe('Invalid request payload');
  });
});
