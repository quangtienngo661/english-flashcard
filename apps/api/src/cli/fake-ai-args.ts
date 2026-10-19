import { z } from 'zod';
import type { EntitlementsService } from '../entitlements/index.js';

// Arguments of `pnpm entitlements:fake-ai` (plan Task 14). Kept apart from the entry file, which runs on import.

export const FAKE_AI_USAGE = 'usage: pnpm entitlements:fake-ai <reserve|confirm|release|refund> (--user <uuid> | --users <uuid,uuid,…>)'
  + ' --pool <ai_practice|ai_lookup> --op <string> [--parallel N (1–50)] [--report <id> (refund only, required)]';

const ACTIONS = ['reserve', 'confirm', 'release', 'refund'] as const;
const POOLS = ['ai_practice', 'ai_lookup'] as const;
const FLAGS = new Set(['--user', '--users', '--pool', '--op', '--parallel', '--report']);
const uuid = z.uuid();

export type FakeAiArgs =
  | {
    ok: true; action: (typeof ACTIONS)[number]; pool: (typeof POOLS)[number]; reportId: string | null;
    calls: Array<{ user: string; op: string }>;
  }
  | { ok: false; error: string };

/** One call per `--parallel` slot: op `<op>:i`, user `i mod n` of `--users`, so calls of different users overlap (B5E11). */
export function parseFakeAiArgs(argv: string[]): FakeAiArgs {
  const [action, ...rest] = argv;
  if (!ACTIONS.includes(action as never)) return { ok: false, error: 'unknown action' };
  const flags = new Map<string, string>();
  for (let i = 0; i < rest.length; i += 2) {
    const [flag, value] = [rest[i], rest[i + 1]];
    if (!FLAGS.has(flag) || value === undefined || value.startsWith('--') || flags.has(flag)) {
      return { ok: false, error: `bad argument ${flag}` };
    }
    flags.set(flag, value);
  }
  const pool = flags.get('--pool');
  if (!POOLS.includes(pool as never)) return { ok: false, error: 'unknown pool' };
  const op = flags.get('--op');
  if (!op) return { ok: false, error: '--op required' };
  if (flags.has('--user') === flags.has('--users')) return { ok: false, error: 'give exactly one of --user, --users' };
  const users = (flags.get('--users') ?? flags.get('--user')!).split(',');
  if (!users.every((user) => uuid.safeParse(user).success)) return { ok: false, error: 'user ids must be uuids' };
  const parallelText = flags.get('--parallel');
  const parallel = parallelText === undefined ? null : Number(parallelText);
  if (parallel !== null && !(Number.isInteger(parallel) && parallel >= 1 && parallel <= 50)) {
    return { ok: false, error: '--parallel must be 1–50' };
  }
  const reportId = flags.get('--report') ?? null;
  if ((action === 'refund') !== (reportId !== null)) return { ok: false, error: '--report is required for refund, only' };
  const calls = parallel === null
    ? [{ user: users[0].toLowerCase(), op }]
    : Array.from({ length: parallel }, (_, i) => ({ user: users[i % users.length].toLowerCase(), op: `${op}:${i + 1}` }));
  return { ok: true, action: action as (typeof ACTIONS)[number], pool: pool as (typeof POOLS)[number], reportId, calls };
}

type Ledger = Pick<EntitlementsService, 'reserve' | 'confirm' | 'release' | 'refund'>;

/** Starts every call at once in this process and prints one JSON line per call as it settles; a throw prints its error name. */
export async function runFakeAiCalls(
  entitlements: Ledger, args: Extract<FakeAiArgs, { ok: true }>, print: (line: string) => void,
): Promise<void> {
  await Promise.all(args.calls.map(async ({ user, op }) => {
    let result: unknown;
    try {
      result = args.action === 'refund'
        ? await entitlements.refund(user, args.pool, op, args.reportId!)
        : await entitlements[args.action](user, args.pool, op);
    } catch (error) {
      result = { error: error instanceof Error ? error.name : 'UnknownError' };
    }
    print(JSON.stringify({ user, op, result }));
  }));
}
