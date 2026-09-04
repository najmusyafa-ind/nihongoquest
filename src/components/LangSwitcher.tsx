'use client';

// src/components/LangSwitcher.tsx — EN | JA toggle
// Persisted in Zustand langStore

import { useLangStore } from '@/store/langStore';

export function LangSwitcher() {
  const { lang, setLang } = useLangStore();

  return (
    <div
      role="group"
      aria-label="Language selector"
      className="inline-flex rounded-lg border border-(--color-border) bg-(--color-surface-hover) overflow-hidden shadow-inner"
    >
      {(['en', 'ja'] as const).map((l) => (
        <button
          key={l}
          id={`lang-${l}`}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`
            min-h-9 min-w-12 px-3.5 py-1.5
            text-[13px] font-semibold tracking-wider font-ui
            transition-colors duration-150 ease-out outline-none
            ${lang === l 
              ? 'bg-(--color-primary) text-white' 
              : 'bg-transparent text-(--color-muted) hover:text-(--color-text)'
            }
          `}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
