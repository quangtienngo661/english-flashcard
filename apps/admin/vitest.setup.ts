import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { toastQueue } from './src/ui/Toast';

// The toast queue is one per app (src/ui/Toast.tsx): empty it so a toast never leaks into the next test.
afterEach(() => toastQueue.clear());
