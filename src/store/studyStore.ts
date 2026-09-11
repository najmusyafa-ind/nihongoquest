// src/store/studyStore.ts — Offline study state with IndexedDB persistence
// Handles: offline cards cache, pending session sync queue, online sync
// GAP-2 FIX: Date objects stored via IndexedDB/JSON lose their prototype after
// deserialization and become plain strings. All Date fields must use toIsoSafe()
// instead of .toISOString() directly.

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { toast } from 'sonner';
import type { Flashcard, PendingStudySession } from '@/types/entities';

// ── Safe ISO string helper ───────────────────────────────────────────────────
// After JSON.parse from IndexedDB, Date instances become plain strings.
// This helper handles both cases safely without throwing.
function toIsoSafe(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value; // Already serialized by JSON
  return value.toISOString();
}

// Custom IndexedDB storage for Zustand
const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await idbGet(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await idbSet(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await idbDel(name);
  },
};

interface StudyState {
  // Offline card cache
  cachedCards: Record<string, Flashcard[]>; // key: JlptLevel

  // Pending sync queue — sessions completed while offline
  pendingSessions: PendingStudySession[];

  // Online status
  isOnline: boolean;
  isSyncing: boolean;

  // Actions
  setCachedCards: (level: string, cards: Flashcard[]) => void;
  addPendingSession: (session: PendingStudySession) => void;
  clearPendingSession: (sessionId: string) => void;
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  clearCache: () => void;

  /**
   * Sync all pending offline sessions to the server.
   * Called automatically when the device comes back online.
   * Idempotent — safe to call multiple times.
   */
  syncToServer: () => Promise<void>;
}

export const useStudyStore = create<StudyState>()(
  persist(
    (set, get) => ({
      cachedCards: {},
      pendingSessions: [],
      isOnline: true,
      isSyncing: false,

      setCachedCards: (level, cards) =>
        set((state) => ({
          cachedCards: { ...state.cachedCards, [level]: cards },
        })),

      addPendingSession: (session) =>
        set((state) => ({
          pendingSessions: [...state.pendingSessions, session],
        })),

      clearPendingSession: (sessionId) =>
        set((state) => ({
          pendingSessions: state.pendingSessions.filter(
            (s) => s.session.id !== sessionId
          ),
        })),

      setOnline: (online) => {
        set({ isOnline: online });
        // Auto-sync when coming back online
        if (online) {
          void get().syncToServer();
        }
      },

      setSyncing: (syncing) => set({ isSyncing: syncing }),

      clearCache: () => set({ cachedCards: {} }),

      syncToServer: async () => {
        const { pendingSessions, isSyncing } = get();

        // Guard: don't double-sync
        if (isSyncing || pendingSessions.length === 0) return;

        set({ isSyncing: true });

        // M-2 fix: Max retry limit — prevents IndexedDB bloat from corrupt sessions
        const MAX_SYNC_RETRIES = 5;

        let syncedCount = 0;
        let failedCount = 0;
        const deadLetterIds: string[] = [];

        for (const pending of pendingSessions) {
          // Dead-letter check: discard after MAX_SYNC_RETRIES attempts
          const retries = pending.retryCount ?? 0;
          if (retries >= MAX_SYNC_RETRIES) {
            deadLetterIds.push(pending.session.id);
            continue;
          }


          try {
            const response = await fetch('/api/sessions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: pending.session.id,
                level: pending.session.level,
                status: 'COMPLETED',
                totalCards: pending.session.totalCards,
                correctCount: pending.session.correctCount,
                incorrectCount: pending.session.incorrectCount,
                skippedCount: pending.session.skippedCount,
                // GAP-2 FIX: Use toIsoSafe() — after IndexedDB roundtrip, Date
                // objects are deserialized as plain strings (JSON loses prototype).
                startedAt: toIsoSafe(pending.session.startedAt) ?? new Date().toISOString(),
                completedAt: toIsoSafe(pending.session.completedAt),
                // Per-card results for analytics (study_results table)
                cardResults: pending.results.map(r => ({
                  flashcardId: r.flashcardId,
                  userAnswer: r.userAnswer,
                  result: r.result,
                })).filter(r => r.flashcardId != null),
              }),
            });

            if (response.ok) {
              get().clearPendingSession(pending.session.id);
              syncedCount++;
            } else {
              // Increment retryCount on non-OK response
              set((state) => ({
                pendingSessions: state.pendingSessions.map((s) =>
                  s.session.id === pending.session.id
                    ? { ...s, retryCount: (s.retryCount ?? 0) + 1 }
                    : s
                ),
              }));
              failedCount++;
            }
          } catch {
            // Network error — increment retryCount
            set((state) => ({
              pendingSessions: state.pendingSessions.map((s) =>
                s.session.id === pending.session.id
                  ? { ...s, retryCount: (s.retryCount ?? 0) + 1 }
                  : s
              ),
            }));
            failedCount++;
          }
        }

        // Discard dead-letter sessions (exceeded MAX_SYNC_RETRIES)
        if (deadLetterIds.length > 0) {
          set((state) => ({
            pendingSessions: state.pendingSessions.filter(
              (s) => !deadLetterIds.includes(s.session.id)
            ),
          }));
          toast.error(
            `${deadLetterIds.length} session${deadLetterIds.length > 1 ? 's' : ''} discarded after ${MAX_SYNC_RETRIES} failed attempts.`
          );
        }

        set({ isSyncing: false });

        if (syncedCount > 0) {
          toast.success(
            `${syncedCount} session${syncedCount > 1 ? 's' : ''} synced! / ${syncedCount}件のセッションが同期されました！ 🎉`
          );
        }

        if (failedCount > 0) {
          toast.error(
            `${failedCount} session${failedCount > 1 ? 's' : ''} failed to sync. Will retry when online.`
          );
        }
      },
    }),
    {
      name: 'nihongoquest-study',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
