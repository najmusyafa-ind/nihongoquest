'use client';

// src/components/ThemeProvider.tsx
// Wires up themeStore to the DOM on mount.
// Must be a Client Component — uses useEffect to run browser-side only.
// suppressHydrationWarning on <html> in layout.tsx prevents SSR mismatch.

import { useEffect } from 'react';
import { useThemeStore, initThemeWatcher } from '@/store/themeStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Zustand actions are stable references (created once), but eslint-plugin-react-hooks
  // can't infer that. We read directly from getState() to avoid the deps warning.
  useEffect(() => {
    // Sync theme to DOM on first mount (after rehydration)
    useThemeStore.getState()._syncToDOM();
    // Start listening to OS preference changes
    const cleanup = initThemeWatcher();
    return cleanup;
  }, []); // empty deps — intentional; getState() reads store at call time, not closure

  return <>{children}</>;
}
