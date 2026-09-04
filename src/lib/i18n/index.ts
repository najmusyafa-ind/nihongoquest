// src/lib/i18n/index.ts — i18n utility with type-safe key access

import { en } from './en';
import { ja } from './ja';
import type { Language } from '@/types/enums';

const translations = { en, ja } as const;

type DeepKeyOf<T> = T extends object
  ? { [K in keyof T]: K extends string
      ? T[K] extends object
        ? `${K}.${DeepKeyOf<T[K]>}`
        : K
      : never
    }[keyof T]
  : never;

type TranslationPath = DeepKeyOf<typeof en>;

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current !== null && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // fallback to key
    }
  }
  return typeof current === 'string' ? current : path;
}

export function getTranslator(lang: Language) {
  const dict = translations[lang] as unknown as Record<string, unknown>;
  return function t(key: TranslationPath): string {
    return getNestedValue(dict, key);
  };
}

export { en, ja };
export type { TranslationPath };
