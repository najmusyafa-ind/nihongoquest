// src/hooks/useSpeechSynthesis.ts
//
// Custom hook wrapping the Web Speech API (SpeechSynthesis) for Japanese pronunciation.
// Design decisions:
//  - Returns `isSupported: false` on SSR or unsupported browsers — no throw, no crash.
//  - Always cancels an in-progress utterance before starting a new one (race-condition safe).
//  - Prefers a `ja-JP` voice; falls back to the first available voice if none found.
//  - Voices list is async-loaded (`voiceschanged` event) — hook reads voices lazily on speak().
//  - No `any` type. Explicit return type declared.

'use client';

import { useState, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UseSpeechSynthesisReturn {
  /** Speak the given text using ja-JP locale. No-op if not supported. */
  speak: (text: string) => void;
  /** Cancel the current utterance immediately. */
  cancel: () => void;
  /** True while the browser is actively speaking. */
  isSpeaking: boolean;
  /** False on SSR or browsers without SpeechSynthesis support. */
  isSupported: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true only on the client and only if SpeechSynthesis is available. */
function checkSupport(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Picks the best available Japanese voice.
 * Preference order:
 *  1. Any voice with lang === 'ja-JP'
 *  2. Any voice with lang starting with 'ja'
 *  3. undefined (browser will use its default voice)
 */
function pickJapaneseVoice(): SpeechSynthesisVoice | undefined {
  if (!checkSupport()) return undefined;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'ja-JP') ??
    voices.find((v) => v.lang.startsWith('ja')) ??
    undefined
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const isSupported = checkSupport();
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Keep ref to the active utterance so we can cancel it.
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    utteranceRef.current = null;
  }, [isSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;

      // Cancel any in-progress speech before starting a new one (race-condition safe).
      cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;   // Slightly slower for learners
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Assign best available Japanese voice (may be undefined — browser picks default).
      const voice = pickJapaneseVoice();
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, cancel]
  );

  return { speak, cancel, isSpeaking, isSupported };
}
