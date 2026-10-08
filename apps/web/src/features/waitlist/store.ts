import type { AppLocale } from '@/i18n/routing';
import { createMemoryStore } from './memory-store';

export type WaitlistState = {
  status: 'idle' | 'invalid_email' | 'missing_consent' | 'success' | 'error';
  email?: string;
};

export interface WaitlistStore {
  add(email: string, locale: AppLocale): Promise<'created' | 'exists'>;
}

let store: WaitlistStore | null = null;

// Only the memory store exists until Resend is wired (spec §8, LPE12): never deploy production with it.
export function getWaitlistStore(): WaitlistStore {
  if (!store) {
    store = createMemoryStore();
    if (process.env.NODE_ENV === 'production') {
      console.warn('[waitlist] Using the in-memory store: sign-ups are lost on restart. Configure a real store before launch.');
    }
  }
  return store;
}
