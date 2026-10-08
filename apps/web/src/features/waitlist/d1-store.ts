import type { WaitlistStore } from './store';

export function createD1Store(db: D1Database, now: () => Date = () => new Date()): WaitlistStore {
  return {
    async add(email, locale) {
      const result = await db.prepare(
        'INSERT INTO waitlist (email, locale, created_at) VALUES (?1, ?2, ?3) ON CONFLICT(email) DO NOTHING',
      ).bind(email, locale, now().toISOString()).run();
      return result.meta.changes === 1 ? 'created' : 'exists';
    },
  };
}
