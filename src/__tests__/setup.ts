// src/__tests__/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// JSDOM does not implement window.matchMedia — mock it globally.
// Required by any component that checks prefers-reduced-motion.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock GSAP
vi.mock('gsap', () => {
  return {
    default: {
      fromTo: vi.fn(),
      to: vi.fn(),
      set: vi.fn(),
      timeline: () => ({
        to: vi.fn().mockReturnThis(),
        fromTo: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
      }),
    },
  };
});

// Mock @gsap/react
// useGSAP signature: (callbackOrConfig, deps?) — both typed broadly for mock flexibility
vi.mock('@gsap/react', () => ({
  useGSAP: (
    callbackOrConfig: (() => void) | { callback?: () => void }
  ) => {
    // Determine if first arg is a function or config object
    const cb =
      typeof callbackOrConfig === 'function'
        ? callbackOrConfig
        : callbackOrConfig?.callback;
    if (typeof cb === 'function') {
      try {
        cb();
      } catch {
        // ignore errors during mock execution
      }
    }
    // Return contextSafe so components can destructure it:
    // const { contextSafe } = useGSAP(...)
    return {
      contextSafe: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
    };
  },
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
}));
