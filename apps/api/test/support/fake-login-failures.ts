import { vi } from 'vitest';

export type LoginFailureRow = { userId: string; ipKey: string; failedCount: number; lockedUntil: Date | null; updatedAt: Date };
type Key = { userId: string; ipKey: string };
type Where = { where: { userId_ipKey: Key } };

/** An in-memory `login_failures` table for unit specs: only the calls the credential decision and its callers make. */
export function fakeLoginFailures() {
  const rows = new Map<string, LoginFailureRow>();
  const id = (key: Key) => `${key.userId}|${key.ipKey}`;
  const table = {
    findUnique: vi.fn(async ({ where }: Where) => {
      const row = rows.get(id(where.userId_ipKey));
      return row ? { ...row } : null;
    }),
    upsert: vi.fn(async ({ where, create, update }: Where & {
      create: Omit<LoginFailureRow, 'lockedUntil'>; update: { failedCount: { increment: number }; updatedAt: Date };
    }) => {
      const current = rows.get(id(where.userId_ipKey));
      const next = current
        ? { ...current, failedCount: current.failedCount + update.failedCount.increment, updatedAt: update.updatedAt }
        : { lockedUntil: null, ...create };
      rows.set(id(where.userId_ipKey), next);
      return { ...next };
    }),
    update: vi.fn(async ({ where, data }: Where & { data: Partial<LoginFailureRow> }) => {
      const current = rows.get(id(where.userId_ipKey));
      if (!current) throw Object.assign(new Error('Record to update not found'), { code: 'P2025' });
      const next = { ...current, ...data };
      rows.set(id(where.userId_ipKey), next);
      return { ...next };
    }),
    deleteMany: vi.fn(async ({ where }: { where: { userId: string; ipKey?: string } }) => {
      let count = 0;
      for (const [key, row] of rows) {
        if (row.userId === where.userId && (where.ipKey === undefined || row.ipKey === where.ipKey)) { rows.delete(key); count += 1; }
      }
      return { count };
    }),
  };
  return {
    table,
    seed: (row: Partial<LoginFailureRow> & Key) => {
      rows.set(id(row), { failedCount: 0, lockedUntil: null, updatedAt: new Date(0), ...row });
    },
    get: (userId: string, ipKey: string) => rows.get(id({ userId, ipKey })),
    size: () => rows.size,
    writes: () => [table.upsert, table.update, table.deleteMany].flatMap((method) => method.mock.calls),
  };
}
