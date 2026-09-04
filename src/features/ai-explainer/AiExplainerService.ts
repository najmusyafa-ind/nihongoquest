// src/features/ai-explainer/AiExplainerService.ts
// Gemini API with mandatory caching + exponential backoff (ADR-003, ADR-004)
//
// Model: gemini-3.6-flash (Google deprecated gemini-2.0-flash, returns 404)
// FIX F-4: Removed `sonner` import — this module is called from /api/explain (server-side).
//          sonner is a browser-only library; calling it on the server silently breaks or crashes.
//          The API route (/api/explain) handles user feedback via the HTTP response / client component.

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiExplainerRepository } from './AiExplainerRepository';
import { childLogger } from '@/lib/logger';

const log = childLogger('AiExplainerSvc');

// Google deprecated gemini-2.0-flash (returns 404).
// API explicitly recommends gemini-3.6-flash as the current model.
const GEMINI_MODEL = 'gemini-3.6-flash';

const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000] as const;
const MAX_RETRIES = RETRY_DELAYS_MS.length;

function getGeminiClient() {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  return new GoogleGenerativeAI(apiKey);
}

function buildPrompt(word: string, hiragana: string, lang: 'en' | 'ja' | 'id'): string {
  const langInstruction = {
    en: 'Explain in English',
    ja: '日本語で説明してください',
    id: 'Jelaskan dalam Bahasa Indonesia',
  }[lang];

  return `You are AI Sensei, a friendly Japanese language teacher. 
A student is learning the word「${word}」(${hiragana}).

${langInstruction}:
1. What does it mean and how is it used?
2. What particle or grammar pattern is it commonly used with?
3. Give 2 simple example sentences with translations.
4. Any memory tips to remember this word?

Keep it concise, friendly, and encouraging. Use emoji sparingly.`;
}

/**
 * Calls Gemini with exponential backoff on rate limit errors (ADR-004).
 * Throws on non-recoverable errors so the API route can serve a static fallback.
 * No toast calls here — this is a server-side function.
 */
async function callGeminiWithRetry(prompt: string, retryCount = 0): Promise<string> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: unknown) {
    const isRateLimit =
      error instanceof Error &&
      (error.message.includes('429') || error.message.includes('quota'));

    if (isRateLimit && retryCount < MAX_RETRIES) {
      const delayMs = RETRY_DELAYS_MS[retryCount] ?? 8000;
      log.warn(`[AiExplainerSvc] Gemini rate limit — retrying in ${delayMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise<void>(resolve => setTimeout(resolve, delayMs));
      return callGeminiWithRetry(prompt, retryCount + 1);
    }

    throw error;
  }
}

export const AiExplainerService = {
  /**
   * Explain a Japanese word or grammar point.
   * ALWAYS checks cache first (ADR-003).
   * Uses exponential backoff on Gemini rate limit errors (ADR-004).
   * Throws on failure — caller (API route) is responsible for fallback + user feedback.
   */
  async explainGrammar(
    word: string,
    hiragana: string,
    lang: 'en' | 'ja' | 'id' = 'en'
  ): Promise<string> {
    const prompt = buildPrompt(word, hiragana, lang);

    // ADR-003: Always check cache first
    const cached = await AiExplainerRepository.getFromCache(prompt);
    if (cached) {
      // Async — don't await, don't block the response
      void AiExplainerRepository.incrementHitCount(cached.id);
      return cached.response;
    }

    // Cache miss — call Gemini with retry
    try {
      const response = await callGeminiWithRetry(prompt);

      // Save to cache async — don't block response
      void AiExplainerRepository.saveToCache({
        prompt,
        response,
        model: GEMINI_MODEL,
      });

      return response;
    } catch (error) {
      log.error('[AiExplainerService] explainGrammar failed:', error);
      throw error; // Let the API route handle fallback and user feedback
    }
  },
};
