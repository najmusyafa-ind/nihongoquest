// src/store/langStore.ts — Language preference store (EN | JA)
// Persisted in localStorage

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '@/types/enums';
import { getTranslator } from '@/lib/i18n';
import type { TranslationPath } from '@/lib/i18n';

interface LangState {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationPath) => string;
}

export const useLangStore = create<LangState>()(
  persist(
    (set, get) => ({
      lang: 'en',
      setLang: (lang: Language) => {
        set({ lang });
      },
      t: (key: TranslationPath) => {
        const { lang } = get();
        return getTranslator(lang)(key);
      },
    }),
    {
      name: 'nihongoquest-lang',
    }
  )
);
