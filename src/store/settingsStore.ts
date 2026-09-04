// src/store/settingsStore.ts — User study preferences store
// Persisted in localStorage. Controls session behavior.

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { JlptLevel } from '@/types/enums';

export type CardsPerSession = 10 | 20 | 50;
export type QuestionType = 'flashcard' | 'quiz' | 'mixed';

export const CARDS_PER_SESSION_OPTIONS: CardsPerSession[] = [10, 20, 50];
export const QUESTION_TYPE_OPTIONS: { value: QuestionType; labelEn: string; labelJa: string }[] = [
  { value: 'flashcard', labelEn: 'Flashcard',  labelJa: 'フラッシュカード' },
  { value: 'quiz',      labelEn: 'JLPT Quiz',  labelJa: 'JLPTクイズ' },
  { value: 'mixed',     labelEn: 'Mixed',       labelJa: 'ミックス' },
];

interface SettingsState {
  /** Number of cards shown per study session */
  cardsPerSession: CardsPerSession;
  /** Study mode type */
  questionType: QuestionType;
  /** Which JLPT levels are active for study */
  activeLevels: JlptLevel[];

  // Actions
  setCardsPerSession: (count: CardsPerSession) => void;
  setQuestionType: (type: QuestionType) => void;
  toggleLevel: (level: JlptLevel) => void;
  setActiveLevels: (levels: JlptLevel[]) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      cardsPerSession: 20,
      questionType: 'flashcard',
      activeLevels: ['N5'],

      setCardsPerSession: (count) => set({ cardsPerSession: count }),

      setQuestionType: (type) => set({ questionType: type }),

      toggleLevel: (level) => {
        const { activeLevels } = get();
        const isActive = activeLevels.includes(level);

        // Prevent deselecting all levels — minimum 1 must remain active
        if (isActive && activeLevels.length === 1) return;

        set({
          activeLevels: isActive
            ? activeLevels.filter((l) => l !== level)
            : [...activeLevels, level],
        });
      },

      setActiveLevels: (levels) => {
        // Guard: at least one level must be selected
        if (levels.length === 0) return;
        set({ activeLevels: levels });
      },
    }),
    {
      name: 'nihongoquest-settings',
    }
  )
);
