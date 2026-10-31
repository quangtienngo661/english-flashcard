import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import { SETTINGS_DEFAULTS, type AppSettings, type SettingsService } from '../../settings/index.js';
import { AiAdapter, type AdapterOutcome, type AdapterRequest, type ModelDescription } from '../adapters/ai-adapter.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import { ABANDON_GRACE_MS, RESULT_TTL_MS } from '../ai.constants.js';
import type { AiOperation, AiProviderName } from '../ai.types.js';
import type { LiveConfigReader } from '../configs/live-config.reader.js';
import type { StoredPrompt } from '../prompts/prompts.repository.js';
import { PROMPT_GUARD } from '../prompts/prompt-rules.js';
import { CallQueue, ConcurrencyLimit } from './call-queue.js';
import type { AdminSpend } from './admin-spend.service.js';
import type { CallLedger, CallRecord } from './call-ledger.service.js';
import { fingerprint } from './fingerprint.js';
import type { OperationsRepository } from './operations.repository.js';
import type { ReadinessCheck, ReadinessService } from './readiness.service.js';
import type { RunOutcome } from './run-rules.js';
import { RunnerService, type ExecuteInput } from './runner.service.js';
import type { Selection } from './selection.js';

const USER = '00000000-0000-4000-8000-000000000001';
const OTHER_USER = '00000000-0000-4000-8000-000000000002';
const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const START = new Date('2026-10-20T05:00:00.000Z');
const OP: AiOperation = 'generate_cloze';
const DATA = { word: 'borrow', part_of_speech: 'verb', level: 'A2', meaning_vi: 'mượn', context_label: null };
const OTHER_DATA = { ...DATA, word: 'lend', meaning_vi: 'cho mượn' };
const GOOD = JSON.stringify({ sentence: 'Can I ___ your pen?', accepted_answers: ['borrow'], translation_vi: 'Mình mượn bút nhé?' });
const TWO_BLANKS = JSON.stringify({ sentence: 'I ___ it, you ___ it.', accepted_answers: ['borrow'], translation_vi: 'x' });
const USAGE = { inputTokens: 100, cachedInputTokens: 0, outputTokens: 50, reasoningTokens: 0 };
const SECRET_KEY = 'sk-test-never-logged';

const ok = (text = GOOD): AdapterOutcome => ({ kind: 'ok', text, usage: USAGE, providerRequestId: 'req_1' });
const fail = (error: Extract<AdapterOutcome, { kind: 'error' }>['error'], httpStatus: number | null = null, retryAfterMs: number | null = null):
  AdapterOutcome => ({ kind: 'error', error, httpStatus, providerErrorCode: null, retryAfterMs, providerRequestId: null });

const selectionOf = (provider: AiProviderName = 'fake', modelId = 'fake:ok'): Selection => ({
  operation: OP, modelRef: '00000000-0000-4000-8000-0000000000b1', provider, modelId, effort: 'low', thinking: null,
  maxOutputTokens: 1_200, price: { input: 0.1, cachedInput: null, output: 0.5 },
});

type Step = (req: AdapterRequest, signal: AbortSignal) => AdapterOutcome | Promise<AdapterOutcome>;

class ScriptedAdapter extends AiAdapter {
  readonly requests: AdapterRequest[] = [];
  constructor(readonly provider: AiProviderName, private readonly steps: Step[]) {
    super();
  }
  async call(req: AdapterRequest, signal: AbortSignal): Promise<AdapterOutcome> {
    this.requests.push(req);
    const step = this.steps[Math.min(this.requests.length - 1, this.steps.length - 1)];
    return step(req, signal);
  }
  async describeModel(): Promise<ModelDescription> {
    return { kind: 'not-found' };
  }
}

type MemoryRow = {
  id: string; userId: string; operationId: string; operation: string; fingerprint: string;
  status: 'running' | 'succeeded' | 'permanent_failure'; attemptId: string; startedAt: Date; deadlineAt: Date;
  result: unknown; meta: unknown; finishedAt: Date | null; expiresAt: Date | null;
};

/** Applies the same conditions as the SQL of OperationsRepository; `findBarrier` makes N finds wait for each other. */
class MemoryOperations {
  readonly rows = new Map<string, MemoryRow>();
  calls: string[] = [];
  private waiting: Array<() => void> = [];
  private nextId = 1;
  constructor(private findBarrier = 0) {}

  private key(userId: string, operationId: string) {
    return `${userId}|${operationId}`;
  }

  byId(id: string) {
    return [...this.rows.values()].find((row) => row.id === id);
  }

  async find(userId: string, operationId: string, now: Date) {
    this.calls.push('find');
    if (this.findBarrier > 0) {
      await new Promise<void>((resolve) => {
        this.waiting.push(resolve);
        if (this.waiting.length >= this.findBarrier) {
          for (const release of this.waiting) release();
          this.waiting = [];
          this.findBarrier = 0;
        }
      });
    }
    const key = this.key(userId, operationId);
    const row = this.rows.get(key);
    if (row && row.expiresAt && row.expiresAt <= now) this.rows.delete(key);
    const found = this.rows.get(key);
    return found ? {
      id: found.id, status: found.status, fingerprint: found.fingerprint, attemptId: found.attemptId, deadlineAt: found.deadlineAt,
      result: found.result, meta: found.meta,
    } : null;
  }

  async claim(row: { userId: string; operationId: string; operation: string; fingerprint: string; attemptId: string; startedAt: Date; deadlineAt: Date }) {
    this.calls.push('claim');
    const key = this.key(row.userId, row.operationId);
    if (this.rows.has(key)) return null;
    const id = `row-${this.nextId++}`;
    this.rows.set(key, { ...row, id, status: 'running', result: null, meta: null, finishedAt: null, expiresAt: null });
    return id;
  }

  async reclaim(id: string, oldAttemptId: string, newAttemptId: string, startedAt: Date, deadlineAt: Date) {
    this.calls.push('reclaim');
    const row = this.byId(id);
    if (!row || row.attemptId !== oldAttemptId || row.status !== 'running') return false;
    Object.assign(row, { attemptId: newAttemptId, startedAt, deadlineAt });
    return true;
  }

  async finish(id: string, attemptId: string, done: { status: 'succeeded' | 'permanent_failure'; result: unknown; meta: unknown; finishedAt: Date; expiresAt: Date }) {
    this.calls.push('finish');
    const row = this.byId(id);
    if (!row || row.attemptId !== attemptId) return false;
    Object.assign(row, done);
    return true;
  }

  async drop(id: string, attemptId: string) {
    this.calls.push('drop');
    const row = this.byId(id);
    if (!row || row.attemptId !== attemptId) return false;
    this.rows.delete(this.key(row.userId, row.operationId));
    return true;
  }

  async storeFinal(row: Omit<MemoryRow, 'id' | 'status' | 'meta'>) {
    this.calls.push('storeFinal');
    const key = this.key(row.userId, row.operationId);
    if (this.rows.has(key)) return;
    this.rows.set(key, { ...row, id: `row-${this.nextId++}`, status: 'permanent_failure', meta: null });
  }

  seed(row: Partial<MemoryRow> & Pick<MemoryRow, 'status'>) {
    const full: MemoryRow = {
      id: `row-${this.nextId++}`, userId: USER, operationId: 'q1', operation: OP, fingerprint: fingerprint(OP, DATA),
      attemptId: 'attempt-old', startedAt: START, deadlineAt: new Date(START.getTime() + 10_000), result: null, meta: null,
      finishedAt: null, expiresAt: null, ...row,
    };
    this.rows.set(this.key(full.userId, full.operationId), full);
    return full;
  }
}

type Setup = {
  steps?: Step[];
  provider?: AiProviderName;
  registered?: AiProviderName[];
  readiness?: ReadinessCheck;
  selection?: Selection | null;
  ai?: Partial<AppSettings['ai']>;
  operations?: MemoryOperations;
  queue?: CallQueue;
  prompt?: StoredPrompt;
  /** Is the admin usd cap reached? A function gets the number of the check (1, 2, …). `'throws'`: the stub fails when asked. */
  spendReached?: boolean | 'throws' | ((check: number) => boolean);
};

function setup(input: Setup = {}) {
  const provider = input.provider ?? 'fake';
  const adapter = new ScriptedAdapter(provider, input.steps ?? [() => ok()]);
  const registry = new AiAdapterRegistry();
  for (const name of input.registered ?? [provider]) {
    registry.register(name === provider ? adapter : new ScriptedAdapter(name, [() => ok()]));
  }
  let settings: AppSettings = { ...SETTINGS_DEFAULTS, ai: { ...SETTINGS_DEFAULTS.ai, ...input.ai } };
  const selection = input.selection === undefined ? selectionOf(provider) : input.selection;
  const readinessChecks: Array<{ op: AiOperation; purpose: string }> = [];
  let prompt: StoredPrompt = input.prompt ?? { instructions: 'Write one sentence.', examples: [], revision: 3 };
  let readiness: ReadinessCheck = input.readiness ?? (selection ? { ready: true, selection, prompt } : { ready: false, reason: 'model-not-set' });
  const liveLoads: AiOperation[] = [];
  const records: Array<{ call: CallRecord; content: { request: unknown; response: string | null }; retention: number }> = [];
  const ledger = {
    record: vi.fn(async (call: CallRecord, content: { request: unknown; response: string | null }, retention: number) => {
      records.push({ call, content, retention });
      return `call-${records.length}`;
    }),
  } as unknown as CallLedger;
  const entries: LogEntry[] = [];
  const operations = input.operations ?? new MemoryOperations();
  const clock = new FakeClock(START);
  const limit = new ConcurrencyLimit();
  const spendChecks: Date[] = [];
  const spend = {
    reached: vi.fn(async (now: Date) => {
      spendChecks.push(now);
      if (input.spendReached === 'throws') throw new Error('the learner path never asks AdminSpend');
      return typeof input.spendReached === 'function' ? input.spendReached(spendChecks.length) : (input.spendReached ?? false);
    }),
  } as unknown as AdminSpend;
  const runner = new RunnerService(
    { get: async () => settings } as unknown as SettingsService,
    clock,
    operations as unknown as OperationsRepository,
    {
      check: async (op: AiOperation, purpose: string) => {
        readinessChecks.push({ op, purpose });
        // The ready answer carries the prompt of the same read as its selection.
        return readiness.ready ? { ...readiness, prompt } : readiness;
      },
    } as unknown as ReadinessService,
    {
      load: async (op: AiOperation) => {
        liveLoads.push(op);
        return { configId: 'c1', number: prompt.revision, prompt, selection };
      },
    } as unknown as LiveConfigReader,
    registry,
    ledger,
    input.queue ?? new CallQueue(() => limit.value),
    limit,
    new AppLogger({ write: (entry) => entries.push(entry) }),
    spend,
  );
  return {
    runner, adapter, operations, records, entries, clock, limit, readinessChecks, liveLoads, spendChecks,
    setSettings: (next: Partial<AppSettings['ai']>) => { settings = { ...settings, ai: { ...settings.ai, ...next } }; },
    setReadiness: (next: ReadinessCheck) => { readiness = next; },
    setPrompt: (next: StoredPrompt) => { prompt = next; },
  };
}

const learner = (overrides: Partial<Extract<ExecuteInput, { purpose: 'learner' }>> = {}): ExecuteInput => ({
  purpose: 'learner', operation: OP, data: DATA, operationId: 'q1', userId: USER, ...overrides,
});

const adminTest = (overrides: Partial<Extract<ExecuteInput, { purpose: 'test' | 'eval' }>> = {}): ExecuteInput => ({
  purpose: 'test', operation: OP, data: DATA, actorId: ADMIN, callOperationId: 'test-1', ...overrides,
});

describe('RunnerService reads the live config (nhóm B M2, design §6.5)', () => {
  it('a learner call uses the prompt of its readiness read: the ledger and the meta carry the config number, the adapter gets the config text', async () => {
    const { runner, records, adapter, liveLoads } = setup({ prompt: { instructions: 'X', examples: [], revision: 7 } });
    const report = await runner.execute(learner());
    expect(report.result).toMatchObject({ status: 'succeeded', meta: { prompt_revision: 7 } });
    expect(records[0]!.call).toMatchObject({ promptRevision: 7 });
    expect(adapter.requests[0]!.instructions).toContain('X');
    expect(liveLoads).toEqual([]);
  });

  it('an admin test without a selection or prompt of its own reads the live config once, for both', async () => {
    const { runner, liveLoads, records } = setup({ prompt: { instructions: 'Live text.', examples: [], revision: 5 } });
    await runner.execute(adminTest());
    expect(liveLoads).toEqual([OP]);
    expect(records[0]!.call).toMatchObject({ promptRevision: 5 });
  });

  it('a config run brings its own selection and prompt: the live config is not read at all', async () => {
    const { runner, liveLoads, records } = setup();
    await runner.execute(adminTest({ selection: selectionOf('fake'), prompt: { instructions: 'Draft.', examples: [], revision: 9 } }));
    expect(liveLoads).toEqual([]);
    expect(records[0]!.call).toMatchObject({ promptRevision: 9 });
  });

  it('a draft text without a selection takes the live selection (one read)', async () => {
    const { runner, liveLoads } = setup();
    await runner.execute(adminTest({ prompt: { instructions: 'Draft.', examples: [], revision: null } }));
    expect(liveLoads).toEqual([OP]);
  });
});

describe('RunnerService.execute — learner', () => {
  it('B6E1: ok → succeeded, one record', async () => {
    const { runner, records, operations } = setup();
    const report = await runner.execute(learner());
    expect(report.result).toEqual({
      status: 'succeeded', operation_id: 'q1',
      result: { sentence: 'Can I ___ your pen?', accepted_answers: ['borrow'], translation_vi: 'Mình mượn bút nhé?' },
      meta: {
        operation: OP, provider: 'fake', model: 'fake:ok', effort: 'low', prompt_revision: 3, schema_version: 1, replayed: false,
      },
    });
    expect(records).toHaveLength(1);
    expect(records[0].call).toMatchObject({
      operationId: 'q1', aiOperationId: 'row-1', attempt: 1, purpose: 'learner', outcome: 'succeeded', userId: USER,
      promptRevision: 3, model: 'fake:ok', effort: 'low', maxOutputTokens: 1_200, usage: USAGE, providerRequestId: 'req_1',
    });
    const row = [...operations.rows.values()][0];
    expect(row.status).toBe('succeeded');
    expect(row.expiresAt?.getTime()).toBe((row.finishedAt as Date).getTime() + RESULT_TTL_MS);
  });

  it('B6E2: timeout → transient timeout, one record with outcome timeout and cost unknown, no retry', async () => {
    const { runner, records, adapter, operations } = setup({ steps: [() => fail('timeout')] });
    const report = await runner.execute(learner());
    expect(report.result).toEqual({ status: 'transient_failure', operation_id: 'q1', reason: 'timeout' });
    expect(adapter.requests).toHaveLength(1);
    expect(records).toHaveLength(1);
    expect(records[0].call.outcome).toBe('timeout');
    expect(operations.rows.size).toBe(0);
  });

  it('B6E3/B6#5: server then ok → succeeded, records attempt 1 and 2', async () => {
    const { runner, records } = setup({ steps: [() => fail('server', 503), () => ok()] });
    const report = await runner.execute(learner());
    expect(report.result.status).toBe('succeeded');
    expect(records.map((entry) => [entry.call.attempt, entry.call.outcome])).toEqual([[1, 'provider-error'], [2, 'succeeded']]);
    expect(report.calls.map((call) => call.attempt)).toEqual([1, 2]);
  });

  it('B6E4: server twice → provider-error, two records', async () => {
    const { runner, records, adapter } = setup({ steps: [() => fail('server', 503)] });
    const report = await runner.execute(learner());
    expect(report.result).toEqual({ status: 'transient_failure', operation_id: 'q1', reason: 'provider-error' });
    expect(adapter.requests).toHaveLength(2);
    expect(records).toHaveLength(2);
  });

  it('B6E6: retry-after 1 000 → waits about a second before the second call', async () => {
    const { runner, adapter } = setup({ steps: [() => fail('rate_limited', 429, 1_000), () => ok()] });
    const started = performance.now();
    const report = await runner.execute(learner());
    expect(report.result.status).toBe('succeeded');
    expect(adapter.requests).toHaveLength(2);
    expect(performance.now() - started).toBeGreaterThanOrEqual(990);
  });

  it('B6E13/B6#3: same id and data again → replayed, no adapter call, no record', async () => {
    const { runner, adapter, records } = setup();
    await runner.execute(learner());
    const again = await runner.execute(learner());
    expect(again.result).toMatchObject({ status: 'succeeded', operation_id: 'q1', meta: { replayed: true, prompt_revision: 3 } });
    expect(adapter.requests).toHaveLength(1);
    expect(records).toHaveLength(1);
    expect(again.calls).toEqual([]);
  });

  it('B6E14: same id, other data → input-mismatch, nothing written', async () => {
    const { runner, adapter, operations } = setup();
    await runner.execute(learner());
    const before = JSON.stringify([...operations.rows.values()]);
    const report = await runner.execute(learner({ data: OTHER_DATA }));
    expect(report.result).toEqual({ status: 'permanent_failure', operation_id: 'q1', reason: 'input-mismatch' });
    expect(adapter.requests).toHaveLength(1);
    expect(JSON.stringify([...operations.rows.values()])).toBe(before);
  });

  it('B6E15/B6E75: a running row → in_progress, no adapter call', async () => {
    const operations = new MemoryOperations();
    operations.seed({ status: 'running', deadlineAt: new Date(START.getTime() + 5_000) });
    const { runner, adapter, records } = setup({ operations });
    const report = await runner.execute(learner());
    expect(report.result).toEqual({ status: 'in_progress', operation_id: 'q1' });
    expect(adapter.requests).toHaveLength(0);
    expect(records).toHaveLength(0);
  });

  it('B6E16/B6E17: a running row past deadline + 20 s → reclaimed and run', async () => {
    const operations = new MemoryOperations();
    const seeded = operations.seed({ status: 'running', deadlineAt: new Date(START.getTime() - ABANDON_GRACE_MS - 1) });
    const { runner, adapter } = setup({ operations });
    const report = await runner.execute(learner());
    expect(report.result.status).toBe('succeeded');
    expect(adapter.requests).toHaveLength(1);
    expect(operations.calls).toContain('reclaim');
    expect(operations.byId(seeded.id)?.attemptId).not.toBe('attempt-old');
    expect(operations.byId(seeded.id)?.status).toBe('succeeded');
  });

  it('B6E18: succeeded row → replay', async () => {
    const operations = new MemoryOperations();
    const stored = { status: 'succeeded', operation_id: 'q1', result: { sentence: 'Old ___.' } };
    operations.seed({
      status: 'succeeded', result: stored, meta: { operation: OP, provider: 'fake', model: 'fake:old', effort: null, prompt_revision: 1, schema_version: 1, replayed: false },
      expiresAt: new Date(START.getTime() + 60_000),
    });
    const { runner, adapter } = setup({ operations });
    const report = await runner.execute(learner());
    expect(report.result).toEqual({ ...stored, meta: expect.objectContaining({ model: 'fake:old', replayed: true }) });
    expect(adapter.requests).toHaveLength(0);
  });

  it('B6E19: transient → row dropped, the next call runs again', async () => {
    const { runner, adapter, operations } = setup({ steps: [() => fail('timeout'), () => ok()] });
    await runner.execute(learner());
    expect(operations.rows.size).toBe(0);
    const again = await runner.execute(learner());
    expect(again.result.status).toBe('succeeded');
    expect(adapter.requests).toHaveLength(2);
  });

  it('B6E20/B6#8: refused → stored, the next call replays it without calling', async () => {
    const { runner, adapter } = setup({ steps: [() => ({ kind: 'refused', text: null, usage: USAGE, providerRequestId: null })] });
    const first = await runner.execute(learner());
    expect(first.result).toEqual({ status: 'permanent_failure', operation_id: 'q1', reason: 'refused' });
    const again = await runner.execute(learner());
    expect(again.result).toEqual(first.result);
    expect(adapter.requests).toHaveLength(1);
  });

  it('B6#18: word of 150 characters → bad-input, stored with expires_at = now + 24 h, no adapter call, no record', async () => {
    const { runner, adapter, records, operations } = setup();
    const report = await runner.execute(learner({ data: { ...DATA, word: 'w'.repeat(150) } }));
    expect(report.result).toEqual({ status: 'permanent_failure', operation_id: 'q1', reason: 'bad-input' });
    expect(adapter.requests).toHaveLength(0);
    expect(records).toHaveLength(0);
    const row = [...operations.rows.values()][0];
    expect(row.status).toBe('permanent_failure');
    expect(row.expiresAt?.getTime()).toBe(START.getTime() + RESULT_TTL_MS);
  });

  it('B6E20: the same bad-input id again → replayed, no adapter call', async () => {
    const { runner, adapter, operations } = setup();
    const bad = { ...DATA, word: 'w'.repeat(150) };
    await runner.execute(learner({ data: bad }));
    const again = await runner.execute(learner({ data: bad }));
    expect(again.result).toEqual({ status: 'permanent_failure', operation_id: 'q1', reason: 'bad-input' });
    expect(adapter.requests).toHaveLength(0);
    expect(operations.calls.filter((call) => call === 'storeFinal')).toHaveLength(1);
  });

  it('bad-input on a reclaimed row → finish, not storeFinal', async () => {
    const operations = new MemoryOperations();
    const bad = { ...DATA, word: 'w'.repeat(150) };
    const seeded = operations.seed({
      status: 'running', fingerprint: fingerprint(OP, bad), deadlineAt: new Date(START.getTime() - ABANDON_GRACE_MS - 1),
    });
    const { runner } = setup({ operations });
    await runner.execute(learner({ data: bad }));
    expect(operations.calls).toEqual(['find', 'reclaim', 'finish']);
    expect(operations.byId(seeded.id)?.status).toBe('permanent_failure');
  });

  it("B6E10: '<uuid>' then '<uuid>#2' → two rows, each with its own deadline_at", async () => {
    const { runner, operations, clock } = setup();
    await runner.execute(learner({ operationId: 'q1' }));
    clock.advance(6_000);
    await runner.execute(learner({ operationId: 'q1#2' }));
    const rows = [...operations.rows.values()];
    expect(rows.map((row) => row.operationId)).toEqual(['q1', 'q1#2']);
    expect(rows.map((row) => row.deadlineAt.getTime() - row.startedAt.getTime())).toEqual([10_000, 10_000]);
    expect(rows[1].startedAt.getTime() - rows[0].startedAt.getTime()).toBe(6_000);
  });

  it('B6#7: two blanks → one record with outcome invalid-shape, result invalid-shape', async () => {
    const { runner, records, operations } = setup({ steps: [() => ok(TWO_BLANKS)] });
    const report = await runner.execute(learner());
    expect(report.result).toEqual({ status: 'transient_failure', operation_id: 'q1', reason: 'invalid-shape' });
    expect(records).toHaveLength(1);
    expect(records[0].call.outcome).toBe('invalid-shape');
    expect(operations.rows.size).toBe(0);
  });

  it('stopped → record outcome stopped, result invalid-shape', async () => {
    const { runner, records } = setup({
      steps: [() => ({ kind: 'stopped', detail: 'steered', text: null, usage: USAGE, providerRequestId: null })],
    });
    const report = await runner.execute(learner());
    expect(report.result).toEqual({ status: 'transient_failure', operation_id: 'q1', reason: 'invalid-shape' });
    expect(records[0].call.outcome).toBe('stopped');
  });

  it('B6E84: truncated → transient truncated', async () => {
    const { runner, records } = setup({
      steps: [() => ({ kind: 'truncated', text: '{"sentence":"Can', usage: USAGE, providerRequestId: null })],
    });
    const report = await runner.execute(learner());
    expect(report.result).toEqual({ status: 'transient_failure', operation_id: 'q1', reason: 'truncated' });
    expect(records[0].call.outcome).toBe('truncated');
    expect(records[0].content.response).toBe('{"sentence":"Can');
  });

  it('plan review #1: the adapter always receives an integer timeoutMs ≥ 1 (with a deadline at a fractional performance.now())', async () => {
    const { runner, adapter } = setup({ steps: [() => fail('server', 503), () => ok()] });
    await runner.execute(learner({ deadlineMs: 9_999.5 }));
    expect(adapter.requests).toHaveLength(2);
    for (const req of adapter.requests) {
      expect(Number.isInteger(req.timeoutMs)).toBe(true);
      expect(req.timeoutMs).toBeGreaterThanOrEqual(1);
      expect(req.timeoutMs).toBeLessThanOrEqual(9_999);
    }
  });

  it('plan review #1: a deadline passed before the retry → no second adapter call, no second record, timeout', async () => {
    const real = performance.now.bind(performance);
    let offset = 0;
    const spy = vi.spyOn(performance, 'now').mockImplementation(() => real() + offset);
    try {
      const { runner, adapter, records } = setup({
        steps: [() => {
          // The event loop stalls during the retry wait (a long GC pause): the budget is gone when the wait ends.
          setTimeout(() => { offset += 60_000; }, 10);
          return fail('server', 503);
        }],
      });
      const report = await runner.execute(learner());
      expect(report.result).toEqual({ status: 'transient_failure', operation_id: 'q1', reason: 'timeout' });
      expect(adapter.requests).toHaveLength(1);
      expect(records).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('plan review #16: a slot acquired with 1 500 ms left → busy, no adapter call', async () => {
    const { runner, adapter, records, operations } = setup();
    const report = await runner.execute(learner({ deadlineMs: 1_500 }));
    expect(report.result).toEqual({ status: 'transient_failure', operation_id: 'q1', reason: 'busy' });
    expect(adapter.requests).toHaveLength(0);
    expect(records).toHaveLength(0);
    expect(operations.rows.size).toBe(0);
  });

  it('busy: the queue returns null → transient busy, no record, row dropped', async () => {
    const queue = { acquire: async () => null, inFlight: () => 0 } as unknown as CallQueue;
    const { runner, adapter, records, operations } = setup({ queue });
    const report = await runner.execute(learner());
    expect(report.result).toEqual({ status: 'transient_failure', operation_id: 'q1', reason: 'busy' });
    expect(adapter.requests).toHaveLength(0);
    expect(records).toHaveLength(0);
    expect(operations.calls).toEqual(['find', 'claim', 'drop']);
  });

  it('the slot is released after the run, also after a retry', async () => {
    const queue = new CallQueue(() => 1);
    const { runner } = setup({ queue, steps: [() => fail('server', 503), () => ok()] });
    await runner.execute(learner());
    expect(queue.inFlight()).toBe(0);
  });

  it('B6E21/B6E35/B6E44: model-rejected and auth-failed → row dropped, next call runs', async () => {
    const { runner, adapter, operations } = setup({ steps: [() => fail('model_rejected', 404), () => fail('auth', 401), () => ok()] });
    expect((await runner.execute(learner())).result).toEqual({ status: 'permanent_failure', operation_id: 'q1', reason: 'model-rejected' });
    expect(operations.rows.size).toBe(0);
    expect((await runner.execute(learner())).result).toEqual({ status: 'permanent_failure', operation_id: 'q1', reason: 'auth-failed' });
    expect(operations.rows.size).toBe(0);
    expect((await runner.execute(learner())).result.status).toBe('succeeded');
    expect(adapter.requests).toHaveLength(3);
  });

  it('B6E22: two users, same id → both run', async () => {
    const { runner, adapter } = setup();
    await runner.execute(learner({ userId: USER }));
    const other = await runner.execute(learner({ userId: OTHER_USER }));
    expect(other.result).toMatchObject({ status: 'succeeded', meta: { replayed: false } });
    expect(adapter.requests).toHaveLength(2);
  });

  it('B6E23: replay keeps the old prompt_revision after the prompt changed', async () => {
    const { runner, setPrompt } = setup();
    await runner.execute(learner());
    setPrompt({ instructions: 'New text.', examples: [], revision: 4 });
    const again = await runner.execute(learner());
    expect(again.result).toMatchObject({ meta: { prompt_revision: 3, replayed: true } });
  });

  it('B6E24: an expired row is gone before the decision', async () => {
    const operations = new MemoryOperations();
    operations.seed({
      status: 'succeeded', result: { status: 'succeeded', operation_id: 'q1', result: {} }, meta: {},
      expiresAt: new Date(START.getTime() - 1),
    });
    const { runner, adapter } = setup({ operations });
    const report = await runner.execute(learner());
    expect(report.result).toMatchObject({ status: 'succeeded', meta: { replayed: false } });
    expect(adapter.requests).toHaveLength(1);
  });

  it.each([
    ['ai-disabled', { ready: false, reason: 'ai-disabled' } as ReadinessCheck, { reason: 'ai-disabled' }],
    [
      'daily-call-cap', { ready: false, reason: 'daily-call-cap', retry_after_seconds: 25_200 } as ReadinessCheck,
      { reason: 'daily-call-cap', retry_after_seconds: 25_200 },
    ],
  ])('B6E30/B6E88: readiness %s → unavailable, no adapter call, no row left', async (_name, readiness, expected) => {
    const { runner, adapter, operations, readinessChecks } = setup({ readiness });
    const report = await runner.execute(learner());
    expect(report.result).toEqual({ status: 'unavailable', operation_id: 'q1', ...expected });
    expect(adapter.requests).toHaveLength(0);
    expect(operations.rows.size).toBe(0);
    expect(readinessChecks).toEqual([{ op: OP, purpose: 'learner' }]);
  });

  it('unavailable on a reclaimed row → the row is dropped', async () => {
    const operations = new MemoryOperations();
    operations.seed({ status: 'running', deadlineAt: new Date(START.getTime() - ABANDON_GRACE_MS - 1) });
    const { runner } = setup({ operations, readiness: { ready: false, reason: 'ai-disabled' } });
    await runner.execute(learner());
    expect(operations.calls).toEqual(['find', 'reclaim', 'drop']);
    expect(operations.rows.size).toBe(0);
  });

  it('B6E43/B6#9: provider_quota → unavailable provider-quota, warn ai_provider_quota, no retry, row dropped', async () => {
    const { runner, adapter, entries, operations } = setup({ steps: [() => fail('provider_quota', 429)] });
    const report = await runner.execute(learner());
    expect(report.result).toEqual({ status: 'unavailable', operation_id: 'q1', reason: 'provider-quota' });
    expect(adapter.requests).toHaveLength(1);
    expect(entries).toContainEqual({ level: 'warn', event: 'ai_provider_quota', provider: 'fake', model: 'fake:ok' });
    expect(operations.rows.size).toBe(0);
  });

  it('a record’s content holds the assembled instructions and the data, never a key', async () => {
    const { runner, records, adapter } = setup();
    await runner.execute(learner());
    const request = records[0].content.request as Record<string, unknown>;
    expect(request).toEqual({
      instructions: adapter.requests[0].instructions, data: DATA, schema_name: 'generate_cloze_v1', effort: 'low', thinking: null,
      max_output_tokens: 1_200,
    });
    expect(String(request.instructions)).toContain('Write one sentence.');
    expect(String(request.instructions)).toContain(PROMPT_GUARD);
    expect(String(request.instructions)).not.toContain('borrow');
    expect(records[0].content.response).toBe(GOOD);
    expect(JSON.stringify(records)).not.toContain(SECRET_KEY);
    expect(records[0].retention).toBe(SETTINGS_DEFAULTS.ai.contentRetentionDays);
  });

  it('B6E40: meta.model is the model read at the start', async () => {
    const readiness: ReadinessCheck = { ready: true, selection: selectionOf('fake', 'fake:first'), prompt: { instructions: 'P', examples: [], revision: 3 } };
    const { runner, setReadiness } = setup({
      readiness,
      steps: [() => {
        setReadiness({ ready: true, selection: selectionOf('fake', 'fake:second'), prompt: { instructions: 'P', examples: [], revision: 3 } });
        return ok();
      }],
    });
    const report = await runner.execute(learner());
    expect(report.result).toMatchObject({ meta: { model: 'fake:first' } });
  });

  it('B6E46/AR9: invalid shape → transient invalid-shape, no partial result', async () => {
    const { runner } = setup({ steps: [() => ok('{"sentence":"Can I ___ your pen?"}')] });
    const report = await runner.execute(learner());
    expect(report.result).toEqual({ status: 'transient_failure', operation_id: 'q1', reason: 'invalid-shape' });
    expect(report.result).not.toHaveProperty('result');
  });

  it('B6E76/B6E78: two concurrent executes, the second claim conflicts → exactly one adapter call, one in_progress', async () => {
    const operations = new MemoryOperations(2);
    let finishCall: (() => void) | undefined;
    const { runner, adapter, records } = setup({
      operations,
      steps: [() => new Promise<AdapterOutcome>((resolve) => { finishCall = () => resolve(ok()); })],
    });
    const first = runner.execute(learner());
    const second = runner.execute(learner());
    const settled = await second;
    expect(settled.result).toEqual({ status: 'in_progress', operation_id: 'q1' });
    expect(operations.calls.filter((call) => call === 'claim')).toHaveLength(2);
    finishCall?.();
    expect((await first).result.status).toBe('succeeded');
    expect(adapter.requests).toHaveLength(1);
    expect(records).toHaveLength(1);
  });

  it('B6E79: two reclaims of one abandoned row → one runs', async () => {
    const operations = new MemoryOperations(2);
    operations.seed({ status: 'running', deadlineAt: new Date(START.getTime() - ABANDON_GRACE_MS - 1) });
    const { runner, adapter } = setup({ operations });
    const results = await Promise.all([runner.execute(learner()), runner.execute(learner())]);
    expect(results.map((report) => report.result.status).sort()).toEqual(['in_progress', 'succeeded']);
    expect(operations.calls.filter((call) => call === 'reclaim')).toHaveLength(2);
    expect(adapter.requests).toHaveLength(1);
  });

  it('B6E80: finish returns false → warn ai_operation_lost, the caller still gets succeeded', async () => {
    const operations = new MemoryOperations();
    const { runner, entries } = setup({
      operations,
      steps: [() => {
        // Another process reclaimed the row while this call was slow.
        const row = [...operations.rows.values()][0];
        row.attemptId = 'someone-else';
        return ok();
      }],
    });
    const report = await runner.execute(learner());
    expect(report.result.status).toBe('succeeded');
    expect(entries.some((entry) => entry.level === 'warn' && entry.event === 'ai_operation_lost')).toBe(true);
    expect([...operations.rows.values()][0].status).toBe('running');
  });

  it('B6E11: deadlineMs 4 000 → deadline_at = start + 4 s', async () => {
    let seen: Date | undefined;
    const operations = new MemoryOperations();
    const { runner } = setup({
      operations,
      steps: [() => {
        seen = [...operations.rows.values()][0].deadlineAt;
        return ok();
      }],
    });
    await runner.execute(learner({ deadlineMs: 4_000 }));
    expect(seen?.getTime()).toBe(START.getTime() + 4_000);
  });

  it('B6E12: the timeout is read per run', async () => {
    const operations = new MemoryOperations();
    const { runner, setSettings, adapter } = setup({ operations });
    await runner.execute(learner({ operationId: 'q1' }));
    setSettings({ callTimeoutSeconds: 30 });
    await runner.execute(learner({ operationId: 'q2' }));
    const rows = [...operations.rows.values()];
    expect(rows.map((row) => row.deadlineAt.getTime() - row.startedAt.getTime())).toEqual([10_000, 30_000]);
    expect(adapter.requests[1].timeoutMs).toBeGreaterThan(10_000);
  });

  it('each run hands the queue the max_concurrent_calls it read', async () => {
    const { runner, setSettings, limit } = setup();
    setSettings({ maxConcurrentCalls: 7 });
    await runner.execute(learner());
    expect(limit.value).toBe(7);
  });
});

describe('RunnerService.execute — test and eval', () => {
  it('B6E31/B6E62: purpose test with the switch off runs, never touches the repository, uses the draft prompt, meta.prompt_revision null', async () => {
    const { runner, operations, adapter, readinessChecks, records } = setup({ readiness: { ready: false, reason: 'ai-disabled' } });
    const report = await runner.execute(adminTest({ prompt: { instructions: 'Draft text.', examples: [], revision: null } }));
    expect(report.result).toMatchObject({ status: 'succeeded', operation_id: 'test-1', meta: { prompt_revision: null } });
    expect(operations.calls).toEqual([]);
    expect(readinessChecks).toEqual([]);
    expect(adapter.requests[0].instructions).toContain('Draft text.');
    expect(records[0].call).toMatchObject({
      purpose: 'test', operationId: 'test-1', aiOperationId: null, userId: ADMIN, promptRevision: null,
    });
    expect(report.rawOutput).toBe(GOOD);
  });

  it('purpose test without overrides uses the current selection and prompt', async () => {
    const { runner } = setup();
    const report = await runner.execute(adminTest());
    expect(report.result).toMatchObject({ meta: { model: 'fake:ok', prompt_revision: 3 } });
  });

  it('plan review #11: purpose test with a 150-character word → bad-input, no record', async () => {
    const { runner, adapter, records } = setup();
    const report = await runner.execute(adminTest({ data: { ...DATA, word: 'w'.repeat(150) } }));
    expect(report.result).toEqual({ status: 'permanent_failure', operation_id: 'test-1', reason: 'bad-input' });
    expect(adapter.requests).toHaveLength(0);
    expect(records).toHaveLength(0);
  });

  it('purpose test without a model → unavailable model-not-set', async () => {
    const { runner } = setup({ selection: null });
    const report = await runner.execute(adminTest());
    expect(report.result).toEqual({ status: 'unavailable', operation_id: 'test-1', reason: 'model-not-set' });
  });

  it('an eval selection whose provider is not registered → provider-not-configured', async () => {
    const { runner, adapter } = setup({ registered: ['fake'] });
    const report = await runner.execute(adminTest({ purpose: 'eval', selection: selectionOf('openai', 'gpt-6-luna') }));
    expect(report.result).toEqual({ status: 'unavailable', operation_id: 'test-1', reason: 'provider-not-configured' });
    expect(adapter.requests).toHaveLength(0);
  });

  it('an eval run with a selection override calls that model and reports each call', async () => {
    const { runner, adapter } = setup({ steps: [() => fail('server', 503), () => ok()] });
    const report = await runner.execute(adminTest({ purpose: 'eval', selection: { ...selectionOf('fake', 'fake:503-then-ok'), modelRef: null } }));
    expect(adapter.requests[0].model).toBe('fake:503-then-ok');
    expect(report.calls.map((call) => [call.attempt, call.outcome])).toEqual([[1, 'provider-error'], [2, 'succeeded']]);
    expect(report.calls[0]).toEqual({
      attempt: 1, outcome: 'provider-error', latency_ms: expect.any(Number), cost_usd: null, http_status: 503, call_id: 'call-1',
    });
    expect(report.calls[1].cost_usd).toBe('0.00003500');
  });
});

describe('RunnerService.execute — judge (nhóm B M3, design §5.4)', () => {
  const JUDGE_ANSWER = JSON.stringify({ codes: ['single_answer'], verdicts: ['pass'], reasons: ['only borrow fits'] });
  const JUDGE_DATA = {
    target_operation: 'generate_cloze',
    input: DATA,
    output: { sentence: 'Can I ___ your pen?', accepted_answers: ['borrow'], translation_vi: 'Mình mượn bút nhé?' },
    criteria: [{ code: 'single_answer', question: 'Is the given word the only answer?' }],
    context: null,
  };
  const judgeSelection = (): Selection => ({ ...selectionOf('fake'), operation: 'judge' });
  const judgeRun = (overrides: Partial<Extract<ExecuteInput, { purpose: 'judge' }>> = {}): ExecuteInput => ({
    purpose: 'judge', operation: 'judge', data: JUDGE_DATA, actorId: ADMIN, callOperationId: 'judge-P-I', selection: judgeSelection(),
    prompt: { instructions: 'J', examples: [], revision: 2 }, ...overrides,
  });

  it('runs on the selection and prompt it brings: the ledger and the adapter see the judge, the live config is never read', async () => {
    const { runner, records, adapter, liveLoads, readinessChecks, operations } = setup({ steps: [() => ok(JUDGE_ANSWER)] });
    const report = await runner.execute(judgeRun());
    expect(report.result).toEqual({
      status: 'succeeded', operation_id: 'judge-P-I',
      result: { codes: ['single_answer'], verdicts: ['pass'], reasons: ['only borrow fits'] },
      meta: { operation: 'judge', provider: 'fake', model: 'fake:ok', effort: 'low', prompt_revision: 2, schema_version: 1, replayed: false },
    });
    expect(records[0]!.call).toMatchObject({
      purpose: 'judge', operation: 'judge', operationId: 'judge-P-I', aiOperationId: null, userId: ADMIN, promptRevision: 2,
    });
    expect(adapter.requests[0]!.schema.name).toBe('judge_v1');
    expect(adapter.requests[0]!.data).toEqual(JUDGE_DATA);
    expect(adapter.requests[0]!.instructions).toContain('J');
    expect(liveLoads).toEqual([]);
    expect(readinessChecks).toEqual([]);
    expect(operations.calls).toEqual([]);
  });

  it('call_id of the call summary is the id the ledger returned', async () => {
    const { runner } = setup({ steps: [() => fail('server', 503), () => ok(JUDGE_ANSWER)] });
    const report = await runner.execute(judgeRun());
    expect(report.calls.map((call) => [call.attempt, call.call_id])).toEqual([[1, 'call-1'], [2, 'call-2']]);
  });

  it('criteria [] → permanent_failure bad-input, the adapter is not called and nothing is recorded', async () => {
    const { runner, adapter, records } = setup();
    const report = await runner.execute(judgeRun({ data: { ...JUDGE_DATA, criteria: [] } }));
    expect(report.result).toEqual({ status: 'permanent_failure', operation_id: 'judge-P-I', reason: 'bad-input' });
    expect(adapter.requests).toHaveLength(0);
    expect(records).toHaveLength(0);
  });

  it('an answer outside the judge shape is an invalid-shape failure recorded on the judge operation', async () => {
    const { runner, records } = setup({ steps: [() => ok(GOOD)] });
    const report = await runner.execute(judgeRun());
    expect(report.result).toEqual({ status: 'transient_failure', operation_id: 'judge-P-I', reason: 'invalid-shape' });
    expect(records.map((entry) => [entry.call.operation, entry.call.outcome])).toEqual([['judge', 'invalid-shape']]);
  });

  it('a provider that is not registered → provider-not-configured', async () => {
    const { runner, adapter } = setup({ registered: ['fake'] });
    const report = await runner.execute(judgeRun({ selection: { ...judgeSelection(), provider: 'anthropic', modelId: 'claude-x' } }));
    expect(report.result).toEqual({ status: 'unavailable', operation_id: 'judge-P-I', reason: 'provider-not-configured' });
    expect(adapter.requests).toHaveLength(0);
  });
});

describe('RunnerService — the admin usd cap (nhóm B M3, E7, B20)', () => {
  it('an eval call whose cap is reached after attempt 1 makes no second provider call and records once (Review focus 5)', async () => {
    const { runner, adapter, records, spendChecks } = setup({
      steps: [() => fail('rate_limited', 429, 1_000), () => ok()], spendReached: (check) => check >= 2,
    });
    const report = await runner.execute(adminTest({ purpose: 'eval' }));
    expect(report.result).toEqual({ status: 'unavailable', operation_id: 'test-1', reason: 'admin-usd-cap' });
    expect(adapter.requests).toHaveLength(1);
    expect(records).toHaveLength(1);
    expect(spendChecks).toHaveLength(2);
    expect(report.calls.map((call) => call.attempt)).toEqual([1]);
  });

  it('reached from the start: the adapter is never called and nothing is recorded', async () => {
    const { runner, adapter, records } = setup({ spendReached: true });
    const report = await runner.execute(adminTest({ purpose: 'eval' }));
    expect(report.result).toEqual({ status: 'unavailable', operation_id: 'test-1', reason: 'admin-usd-cap' });
    expect(adapter.requests).toHaveLength(0);
    expect(records).toHaveLength(0);
  });

  it('a test call is checked too, and a judge call', async () => {
    const test = setup({ spendReached: true });
    expect((await test.runner.execute(adminTest())).result).toMatchObject({ status: 'unavailable', reason: 'admin-usd-cap' });
    expect(test.adapter.requests).toHaveLength(0);
    const judge = setup({ spendReached: true });
    const report = await judge.runner.execute({
      purpose: 'judge', operation: 'judge', actorId: ADMIN, callOperationId: 'judge-P-I', selection: { ...selectionOf('fake'), operation: 'judge' },
      prompt: { instructions: 'J', examples: [], revision: 1 },
      data: { target_operation: OP, input: DATA, output: { sentence: 'x ___', accepted_answers: ['a'], translation_vi: 'y' }, criteria: [{ code: 'single_answer', question: 'Q' }], context: null },
    });
    expect(report.result).toEqual({ status: 'unavailable', operation_id: 'judge-P-I', reason: 'admin-usd-cap' });
    expect(judge.adapter.requests).toHaveLength(0);
  });

  it('with room under the cap an eval call runs once per attempt as before, and the check runs before each attempt', async () => {
    const { runner, adapter, spendChecks } = setup({ steps: [() => fail('server', 503), () => ok()], spendReached: false });
    const report = await runner.execute(adminTest({ purpose: 'eval' }));
    expect(report.result.status).toBe('succeeded');
    expect(adapter.requests).toHaveLength(2);
    expect(spendChecks).toHaveLength(2);
  });

  it('a learner call never asks AdminSpend: a stub that throws changes nothing', async () => {
    const { runner, spendChecks } = setup({ spendReached: 'throws' });
    const report = await runner.execute(learner());
    expect(report.result.status).toBe('succeeded');
    expect(spendChecks).toEqual([]);
  });
});

describe('types', () => {
  it('AdapterOutcome satisfies the structural type of run-rules', () => {
    // A compile-time check (tsc runs on spec files): this assignment fails to type-check if AdapterOutcome stops fitting.
    const fits = (outcome: AdapterOutcome): RunOutcome => outcome;
    expect(fits(ok()).kind).toBe('ok');
  });
});
