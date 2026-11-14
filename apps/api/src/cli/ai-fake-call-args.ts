import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { AI_OPERATIONS, OPERATION_ID_PATTERN, type AiOperation, type AiService } from '../ai/index.js';

// Arguments of `pnpm ai:fake-call` (plan Task 19). Kept apart from the entry file, which runs on import.

export const AI_FAKE_CALL_USAGE = 'usage: pnpm ai:fake-call <generate_cloze|lookup_word|translate_sentence|generate_meaning_question|generate_sentence_mcq'
  + '|check_private_word> --user <uuid>'
  + ' --data <json|@file> [--operation-id <id>] [--parallel N (1–50)] [--purpose learner|test]\n'
  + '       pnpm ai:fake-call delete-user-data --user <uuid>';

const PURPOSES = ['learner', 'test'] as const;
const CALL_FLAGS = new Set(['--user', '--data', '--operation-id', '--parallel', '--purpose']);
const DELETE_FLAGS = new Set(['--user']);
const uuid = z.uuid();

/** `ai:fake-call` uses the model chosen in the database: with a real key set that could be a real provider and cost money (B6-2). */
export function fakeCallRefusal(ai: { fakeEnabled: boolean; openaiApiKey: string | null; anthropicApiKey: string | null }): string | null {
  if (!ai.fakeEnabled) return 'ai:fake-call runs only with AI_FAKE_ENABLED=true';
  if (ai.openaiApiKey !== null) return 'ai:fake-call refuses to run while OPENAI_API_KEY is set (it could call a real provider)';
  if (ai.anthropicApiKey !== null) return 'ai:fake-call refuses to run while ANTHROPIC_API_KEY is set (it could call a real provider)';
  return null;
}

export type AiFakeCallArgs =
  | {
    ok: true; action: 'call'; operation: AiOperation; user: string; data: unknown; purpose: (typeof PURPOSES)[number];
    operationIds: string[];
  }
  | { ok: true; action: 'delete-user-data'; user: string }
  | { ok: false; error: string };

function readFlags(rest: string[], allowed: Set<string>): Map<string, string> | string {
  const flags = new Map<string, string>();
  for (let i = 0; i < rest.length; i += 2) {
    const [flag, value] = [rest[i], rest[i + 1]];
    if (!allowed.has(flag) || value === undefined || value.startsWith('--') || flags.has(flag)) return `bad argument ${flag}`;
    flags.set(flag, value);
  }
  return flags;
}

/**
 * The operation's input rules are not applied here: the gate applies them for both purposes (B6#18, plan review #11).
 * Each of the `--parallel` calls gets `--operation-id`, or a fresh uuid of its own.
 */
export function parseAiFakeCallArgs(
  argv: string[],
  readFile: (path: string) => string = (path) => readFileSync(path, 'utf8'),
): AiFakeCallArgs {
  const [action, ...rest] = argv;
  const deleting = action === 'delete-user-data';
  if (!deleting && !AI_OPERATIONS.includes(action as AiOperation)) return { ok: false, error: 'unknown operation' };
  const flags = readFlags(rest, deleting ? DELETE_FLAGS : CALL_FLAGS);
  if (typeof flags === 'string') return { ok: false, error: flags };
  const user = flags.get('--user');
  if (user === undefined || !uuid.safeParse(user).success) return { ok: false, error: '--user must be a uuid' };
  if (deleting) return { ok: true, action: 'delete-user-data', user: user.toLowerCase() };

  const dataText = flags.get('--data');
  if (dataText === undefined) return { ok: false, error: '--data required' };
  let data: unknown;
  try {
    data = JSON.parse(dataText.startsWith('@') ? readFile(dataText.slice(1)) : dataText);
  } catch {
    return { ok: false, error: '--data must be JSON or @file with JSON' };
  }
  const purpose = flags.get('--purpose') ?? 'learner';
  if (!PURPOSES.includes(purpose as never)) return { ok: false, error: '--purpose must be learner or test' };
  const parallelText = flags.get('--parallel');
  const parallel = parallelText === undefined ? 1 : Number(parallelText);
  if (!(Number.isInteger(parallel) && parallel >= 1 && parallel <= 50)) return { ok: false, error: '--parallel must be 1–50' };
  const operationId = flags.get('--operation-id');
  if (operationId !== undefined && !OPERATION_ID_PATTERN.test(operationId)) {
    return { ok: false, error: '--operation-id does not match OPERATION_ID_PATTERN' };
  }
  if (operationId !== undefined && purpose === 'test') return { ok: false, error: '--operation-id is for learner calls only' };
  return {
    ok: true, action: 'call', operation: action as AiOperation, user: user.toLowerCase(), data,
    purpose: purpose as (typeof PURPOSES)[number],
    operationIds: Array.from({ length: parallel }, () => operationId ?? randomUUID()),
  };
}

type Ai = Pick<AiService, 'run' | 'runAdminTest' | 'deleteUserData'>;

/** Starts every call at once in this process; prints one JSON line per call as it settles, each with `kind: ai_fake_call`. */
export async function runAiFakeCalls(
  ai: Ai, args: Extract<AiFakeCallArgs, { ok: true }>, print: (line: string) => void,
): Promise<void> {
  if (args.action === 'delete-user-data') {
    await ai.deleteUserData(args.user);
    print(JSON.stringify({ kind: 'ai_fake_call', deleted_for: args.user }));
    return;
  }
  await Promise.all(args.operationIds.map(async (operationId) => {
    const started = performance.now();
    const result = args.purpose === 'learner'
      ? await ai.run(args.operation, args.data, { operationId, userId: args.user, purpose: 'learner' })
      : (await ai.runAdminTest(args.operation, args.data, args.user)).result;
    print(JSON.stringify({
      kind: 'ai_fake_call', operation_id: result.operation_id, elapsed_ms: Math.round(performance.now() - started), result,
    }));
  }));
}
