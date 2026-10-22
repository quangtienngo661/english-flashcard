import '@testing-library/jest-dom/vitest';

// The sign-out-pending flag (app-shell/session/session-store.ts) lives in sessionStorage: a test that leaves it set would sign the next one out.
afterEach(() => globalThis.sessionStorage?.clear());
