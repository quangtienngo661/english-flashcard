import '@testing-library/jest-dom/vitest';

// The sign-out-pending flag (app-shell/session/session-store.ts) lives in sessionStorage: a test that leaves it set would sign the next one out.
afterEach(() => globalThis.sessionStorage?.clear());

// jsdom has no AnimationEvent; without it React listens for prefixed names only, so fireEvent.animationEnd never reaches onAnimationEnd.
if (typeof window !== 'undefined' && !('AnimationEvent' in window)) {
  (window as unknown as { AnimationEvent: typeof Event }).AnimationEvent = class AnimationEvent extends Event {};
}

// jsdom has no matchMedia; the app's ThemeProvider reads it. Tests that care replace it with their own mock.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList;
}
