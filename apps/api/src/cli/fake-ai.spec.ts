import { describe, expect, it } from 'vitest';
import { runFakeAiCalls, parseFakeAiArgs } from './fake-ai-args.js';

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';

describe('parseFakeAiArgs', () => {
  it('a single reserve: one call with the given op', () => {
    expect(parseFakeAiArgs(['reserve', '--user', A, '--pool', 'ai_practice', '--op', 't1'])).toEqual({
      ok: true, action: 'reserve', pool: 'ai_practice', reportId: null, calls: [{ user: A, op: 't1' }],
    });
  });

  it('--parallel N gives ops <op>:1 … <op>:N for one user', () => {
    const parsed = parseFakeAiArgs(['confirm', '--user', A, '--pool', 'ai_lookup', '--op', 't1', '--parallel', '3']);
    expect(parsed).toMatchObject({ ok: true, action: 'confirm', pool: 'ai_lookup' });
    expect(parsed.ok && parsed.calls).toEqual([{ user: A, op: 't1:1' }, { user: A, op: 't1:2' }, { user: A, op: 't1:3' }]);
  });

  it('--users a,b,c --parallel 6 maps calls to a, b, c, a, b, c', () => {
    const parsed = parseFakeAiArgs(['reserve', '--users', `${A},${B},${C}`, '--pool', 'ai_practice', '--op', 'cap', '--parallel', '6']);
    expect(parsed.ok && parsed.calls.map((call) => call.user)).toEqual([A, B, C, A, B, C]);
    expect(parsed.ok && parsed.calls.map((call) => call.op)).toEqual(['cap:1', 'cap:2', 'cap:3', 'cap:4', 'cap:5', 'cap:6']);
  });

  it('refund carries --report; release takes no report', () => {
    expect(parseFakeAiArgs(['refund', '--user', A, '--pool', 'ai_practice', '--op', 't1', '--report', 'r-9']))
      .toMatchObject({ ok: true, action: 'refund', reportId: 'r-9' });
    expect(parseFakeAiArgs(['release', '--user', A, '--pool', 'ai_practice', '--op', 't1'])).toMatchObject({ ok: true, action: 'release' });
  });

  it.each([
    ['--parallel 0', ['reserve', '--user', A, '--pool', 'ai_practice', '--op', 't', '--parallel', '0']],
    ['--parallel 51', ['reserve', '--user', A, '--pool', 'ai_practice', '--op', 't', '--parallel', '51']],
    ['--parallel 2.5', ['reserve', '--user', A, '--pool', 'ai_practice', '--op', 't', '--parallel', '2.5']],
    ['an unknown pool', ['reserve', '--user', A, '--pool', 'practice_sessions', '--op', 't']],
    ['an unknown action', ['spend', '--user', A, '--pool', 'ai_practice', '--op', 't']],
    ['refund without --report', ['refund', '--user', A, '--pool', 'ai_practice', '--op', 't']],
    ['--user and --users together', ['reserve', '--user', A, '--users', `${A},${B}`, '--pool', 'ai_practice', '--op', 't']],
    ['--users with a non-uuid', ['reserve', '--users', `${A},bob`, '--pool', 'ai_practice', '--op', 't']],
    ['--user with a non-uuid', ['reserve', '--user', 'bob', '--pool', 'ai_practice', '--op', 't']],
    ['no user', ['reserve', '--pool', 'ai_practice', '--op', 't']],
    ['no --op', ['reserve', '--user', A, '--pool', 'ai_practice']],
    ['an unknown flag', ['reserve', '--user', A, '--pool', 'ai_practice', '--op', 't', '--force']],
    ['a flag without a value', ['reserve', '--user', A, '--pool', 'ai_practice', '--op']],
  ])('refuses %s', (_name, argv) => {
    expect(parseFakeAiArgs(argv).ok).toBe(false);
  });
});

describe('runFakeAiCalls', () => {
  it('starts every call at once, prints one JSON line per call, and passes the report id to refund', async () => {
    const started: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const entitlements = {
      reserve: async (user: string, pool: string, op: string) => { started.push(op); await gate; return { state: 'reserved', user, pool }; },
      refund: async (_u: string, _p: string, op: string, report: string) => ({ refunded: true, op, report }),
    };
    const lines: string[] = [];
    const parsed = parseFakeAiArgs(['reserve', '--users', `${A},${B}`, '--pool', 'ai_practice', '--op', 't', '--parallel', '2']);
    if (!parsed.ok) throw new Error(parsed.error);
    const run = runFakeAiCalls(entitlements as never, parsed, (line) => lines.push(line));
    await new Promise((resolve) => setImmediate(resolve));
    expect(started).toEqual(['t:1', 't:2']);
    release();
    await run;
    expect(lines.map((line) => JSON.parse(line)).sort((x, y) => x.op.localeCompare(y.op))).toEqual([
      { user: A, op: 't:1', result: { state: 'reserved', user: A, pool: 'ai_practice' } },
      { user: B, op: 't:2', result: { state: 'reserved', user: B, pool: 'ai_practice' } },
    ]);

    const refund = parseFakeAiArgs(['refund', '--user', A, '--pool', 'ai_lookup', '--op', 'x', '--report', 'r-1']);
    if (!refund.ok) throw new Error(refund.error);
    const out: string[] = [];
    await runFakeAiCalls(entitlements as never, refund, (line) => out.push(line));
    expect(JSON.parse(out[0]).result).toEqual({ refunded: true, op: 'x', report: 'r-1' });
  });

  it('a call that throws prints its error name, and the others still print', async () => {
    const entitlements = { release: async (_u: string, _p: string, op: string) => {
      if (op === 'e:1') throw new TypeError('boom');
      return { state: 'released' };
    } };
    const parsed = parseFakeAiArgs(['release', '--user', A, '--pool', 'ai_practice', '--op', 'e', '--parallel', '2']);
    if (!parsed.ok) throw new Error(parsed.error);
    const lines: string[] = [];
    await runFakeAiCalls(entitlements as never, parsed, (line) => lines.push(line));
    expect(lines.map((line) => JSON.parse(line).result).sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y))))
      .toEqual([{ error: 'TypeError' }, { state: 'released' }]);
  });
});
