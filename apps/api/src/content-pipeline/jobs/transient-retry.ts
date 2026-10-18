import { Prisma } from '../../generated/prisma/client.js';

const TRANSIENT_PRISMA_CODES = ['P1001', 'P1002', 'P1017', 'P2034'];

export function isTransientDbError(err: unknown): boolean {
  try {
    if (err instanceof Prisma.PrismaClientKnownRequestError && TRANSIENT_PRISMA_CODES.includes(err.code)) return true;
    if (err instanceof Prisma.PrismaClientInitializationError
      && (err.errorCode === 'P1001' || err.errorCode === 'P1002')) return true;

    // Raw queries and driver adapters can put the SQLSTATE on different error wrappers. Limit the
    // traversal and remember objects so unexpected/circular error payloads cannot loop forever.
    const pending = [{ value: err, depth: 0 }];
    const visited = new Set<object>();
    while (pending.length > 0) {
      const { value, depth } = pending.pop()!;
      if (typeof value !== 'object' || value === null || visited.has(value)) continue;
      visited.add(value);
      const details = value as Record<string, unknown>;
      for (const key of ['code', 'originalCode', 'sqlState']) {
        const code = details[key];
        if (typeof code === 'string' && (code === '40001' || code === '40P01' || code.startsWith('08'))) return true;
      }
      if (depth < 4) {
        for (const key of ['meta', 'cause', 'driverAdapterError', 'originalError']) {
          pending.push({ value: details[key], depth: depth + 1 });
        }
      }
    }
  } catch {
    // An error detector must not replace the original failure with an unreadable-property error.
  }
  return false;
}

export async function withTransientRetry<T>(fn: () => Promise<T>, opts: {
  retries: number; baseMs: number; sleep?: (ms: number) => Promise<void>;
}): Promise<T> {
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); }));
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isTransientDbError(err) || attempt >= opts.retries) throw err;
      const base = opts.baseMs * 2 ** attempt;
      await sleep(base + Math.floor(Math.random() * base));
    }
  }
}
