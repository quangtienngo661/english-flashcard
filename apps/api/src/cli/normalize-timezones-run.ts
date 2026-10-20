import type { PrismaClient } from '../generated/prisma/client.js';
import { normalizeStoredTimeZone } from '../identity/profile/timezone.js';

const PAGE_SIZE = 500;

/**
 * Rewrites every stored `users.timezone` to its canonical name (`normalizeStoredTimeZone`), a page of 500 users by id at a
 * time. A row is written only when its value changes, and only if it still holds the value that was read, so a concurrent
 * `PATCH /v1/me` is never overwritten. Reads ids and zones only, never emails. Safe to run again: a second run changes nothing.
 */
export async function normalizeTimezones(prisma: Pick<PrismaClient, 'user'>): Promise<{ scanned: number; changed: number }> {
  let scanned = 0;
  let changed = 0;
  let after: string | undefined;
  for (;;) {
    const page = await prisma.user.findMany({
      where: after === undefined ? {} : { id: { gt: after } },
      select: { id: true, timezone: true },
      orderBy: { id: 'asc' },
      take: PAGE_SIZE,
    });
    for (const { id, timezone } of page) {
      scanned += 1;
      const next = normalizeStoredTimeZone(timezone);
      if (next === timezone) continue;
      changed += (await prisma.user.updateMany({ where: { id, timezone }, data: { timezone: next } })).count;
    }
    if (page.length < PAGE_SIZE) return { scanned, changed };
    after = page[page.length - 1].id;
  }
}
