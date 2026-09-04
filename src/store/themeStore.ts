// src/store/themeStore.ts — Theme preference store (light | dark | system)
// Persisted in localStorage. Syncs to <html data-theme="..."> attribute.
// Listens to prefers-color-scheme media query when theme = 'system'.

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  /** User's explicit preference */
  theme: ThemePreference;
  /** The actual resolved theme (system preference resolved) */
  resolvedTheme: ResolvedTheme;
  /** Set user preference and sync to DOM */
  setTheme: (theme: ThemePreference) => void;
  /** Called internally when system preference changes */
  _syncToDOM: () => void;
}

/** Read the OS-level dark mode preference */
function getSystemPreference(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Apply resolved theme to <html> data attribute */
function applyThemeToDOM(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolved);
  // Also set color-scheme for native browser elements (scrollbars, inputs)
  document.documentElement.style.colorScheme = resolved;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',

      setTheme: (theme: ThemePreference) => {
        const resolved: ResolvedTheme =
          theme === 'system' ? getSystemPreference() : theme;
        applyThemeToDOM(resolved);
        set({ theme, resolvedTheme: resolved });
      },

      _syncToDOM: () => {
        const { theme } = get();
        const resolved: ResolvedTheme =
          theme === 'system' ? getSystemPreference() : theme;
        applyThemeToDOM(resolved);
        set({ resolvedTheme: resolved });
      },
    }),
    {
      name: 'nihongoquest-theme',
      // Only persist the user's preference — not resolvedTheme (derived)
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, sync to DOM immediately
        if (state) {
          state._syncToDOM();
        }
      },
    }
  )
);

/**
 * ThemeWatcher — call this once at app root to listen for OS theme changes.
 * When user has 'system' selected, the theme will follow the OS automatically.
 * Returns a cleanup function to remove the listener.
 */
export function initThemeWatcher(): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleChange = () => {
    const { theme, _syncToDOM } = useThemeStore.getState();
    // Only react to OS change when user preference is 'system'
    if (theme === 'system') {
      _syncToDOM();
    }
  };

  // Modern API
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }

  // Legacy fallback
  mediaQuery.addListener(handleChange);
  return () => mediaQuery.removeListener(handleChange);
}
