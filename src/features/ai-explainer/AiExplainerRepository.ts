// src/features/ai-explainer/AiExplainerRepository.ts
// Cache management for Gemini API responses

import { db } from '@/lib/db';

import { aiExplanationCache } from '../../../db/schema';

import { and, eq, gte, sql } from 'drizzle-orm';

import type { AiExplanationCache } from '@/types/entities';
import { childLogger } from '@/lib/logger';

const log = childLogger('AiExplainerRepo');



/**
 * Generate a deterministic cache key from a prompt string.
 * Uses SHA-256 via Web Crypto API (available in Node.js 18+).
 */
async function generateCacheKey(prompt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(prompt.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const AiExplainerRepository = {
  /**
   * Look up cached AI explanation by prompt.
   * Returns null if not cached.
   */
  async getFromCache(prompt: string): Promise<AiExplanationCache | null> {
    try {
      const cacheKey = await generateCacheKey(prompt);
      // M-1 fix: TTL — only return cache hits created within the last 30 days.
      // Prevents stale AI responses from surviving indefinitely as Gemini improves.
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const results = await db
        .select()
        .from(aiExplanationCache)
        .where(
          and(
            eq(aiExplanationCache.cacheKey, cacheKey),
            gte(aiExplanationCache.createdAt, thirtyDaysAgo)
          )
        )
        .limit(1);
      return results[0] ?? null;
    } catch (error) {
      log.error('[AiExplainerRepository] getFromCache failed:', error);
      return null; // Cache miss on error â€” will fallback to Gemini
    }
  },

  /**
   * Save a new AI response to cache.
   */
  async saveToCache(params: {
    prompt: string;
    response: string;
    model: string;
  }): Promise<void> {
    try {
      const cacheKey = await generateCacheKey(params.prompt);
      await db
        .insert(aiExplanationCache)
        .values({
          cacheKey,
          prompt: params.prompt,
          response: params.response,
          model: params.model,
          hitCount: 0,
        })
        .onConflictDoNothing(); // Race condition safe
    } catch (error) {
      log.error('[AiExplainerRepository] saveToCache failed:', error);
      // Don't throw â€” cache save failure is not critical
    }
  },

  /**
   * Increment hit count for a cached response.
   */
  async incrementHitCount(cacheId: string): Promise<void> {
    try {
      await db
        .update(aiExplanationCache)
        .set({ hitCount: sql`${aiExplanationCache.hitCount} + 1` })
        .where(eq(aiExplanationCache.id, cacheId));
    } catch (error) {
      log.error('[AiExplainerRepository] incrementHitCount failed:', error);
      // Non-critical â€” don't throw
    }
  },
};






