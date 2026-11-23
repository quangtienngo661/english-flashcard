import { isTransientDbError } from '../../common/db/transient-db-error.js';

export { isTransientDbError };

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
