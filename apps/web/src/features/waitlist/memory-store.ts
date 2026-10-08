import type { WaitlistStore } from './store';

export function createMemoryStore(): WaitlistStore & { list(): string[] } {
  const emails = new Set<string>();
  return {
    // The check and the insert run in one synchronous step, so concurrent submits cannot both insert (LPE6).
    async add(email) {
      if (emails.has(email)) return 'exists';
      emails.add(email);
      return 'created';
    },
    list: () => [...emails],
  };
}
