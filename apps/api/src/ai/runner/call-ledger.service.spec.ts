import { describe, expect, it, vi } from 'vitest';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import { runWithOperationId } from '../../common/logging/request-context.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { CallLedger, type CallRecord } from './call-ledger.service.js';

const NOW = new Date('2026-10-20T05:00:00.000Z');
const USER = '00000000-0000-4000-8000-000000000001';
const SECRET_INSTRUCTIONS = 'Write one sentence with a blank.';
const SECRET_DATA = { word: 'borrow', meaning_vi: 'mượn' };
const SECRET_RESPONSE = '{"sentence":"Can I ___ your pen?"}';

const record = (overrides: Partial<CallRecord> = {}): CallRecord => ({
  operationId: 'q1', aiOperationId: '00000000-0000-4000-8000-0000000000c1', attempt: 1, purpose: 'learner',
  operation: 'generate_cloze', provider: 'openai', model: 'gpt-6-luna', effort: 'low', thinking: null, maxOutputTokens: 1_200,
  promptRevision: 1, outcome: 'succeeded', httpStatus: 200, providerErrorCode: null, latencyMs: 812,
  usage: { inputTokens: 600, cachedInputTokens: 0, outputTokens: 500, reasoningTokens: 120 }, providerRequestId: 'resp_1',
  userId: USER, price: { input: 0.1, cachedInput: null, output: 0.5 }, ...overrides,
});

function setup() {
  const calls: Array<Record<string, unknown>> = [];
  const contents: Array<Record<string, unknown>> = [];
  const counts: unknown[] = [];
  const prisma = {
    aiCall: {
      create: vi.fn((args: { data: Record<string, unknown> }) => {
        calls.push(args.data);
        return { kind: 'call' };
      }),
      count: vi.fn(async (args: unknown) => {
        counts.push(args);
        return 7;
      }),
    },
    aiCallContent: {
      create: vi.fn((args: { data: Record<string, unknown> }) => {
        contents.push(args.data);
        return { kind: 'content' };
      }),
    },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  } as unknown as PrismaClient;
  const entries: LogEntry[] = [];
  const logger = new AppLogger({ write: (entry) => entries.push(entry) });
  return { ledger: new CallLedger(prisma, logger), prisma, calls, contents, counts, entries };
}

const content = { request: { instructions: SECRET_INSTRUCTIONS, data: SECRET_DATA }, response: SECRET_RESPONSE };

describe('CallLedger.record', () => {
  it('writes the call with its cost, tokens and created_at from now, and returns its id', async () => {
    const { ledger, calls } = setup();
    const id = await ledger.record(record(), content, 7, NOW);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      id, operationId: 'q1', attempt: 1, purpose: 'learner', outcome: 'succeeded', inputTokens: 600, cachedInputTokens: 0,
      outputTokens: 500, reasoningTokens: 120, costUsd: '0.00031000', costKnown: true, userId: USER, createdAt: NOW,
    });
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('B6E65: retention 0 → no content row', async () => {
    const { ledger, contents } = setup();
    await ledger.record(record(), content, 0, NOW);
    expect(contents).toEqual([]);
  });

  it('B6E66: the content row expires after the retention read for this call', async () => {
    const { ledger, contents } = setup();
    const id = await ledger.record(record(), content, 1, NOW);
    expect(contents).toEqual([{
      callId: id, request: content.request, response: SECRET_RESPONSE, expiresAt: new Date('2026-10-21T05:00:00.000Z'),
    }]);
  });

  it('the call and its content are written in one transaction', async () => {
    const { ledger, prisma } = setup();
    await ledger.record(record(), content, 7, NOW);
    expect(prisma.$transaction).toHaveBeenCalledWith([{ kind: 'call' }, { kind: 'content' }]);
  });

  it('B6E64: no price → cost_usd null, cost_known false, tokens still written', async () => {
    const { ledger, calls } = setup();
    await ledger.record(record({ price: null }), content, 7, NOW);
    expect(calls[0]).toMatchObject({ costUsd: null, costKnown: false, inputTokens: 600, outputTokens: 500 });
  });

  it('B6E2: no usage (timeout) → tokens null, cost unknown', async () => {
    const { ledger, calls } = setup();
    await ledger.record(record({ outcome: 'timeout', usage: null, httpStatus: null }), content, 7, NOW);
    expect(calls[0]).toMatchObject({
      inputTokens: null, cachedInputTokens: null, outputTokens: null, reasoningTokens: null, costUsd: null, costKnown: false,
    });
  });

  it('B6E67: the log entry has exactly the listed fields plus level, event and (inside a request) operation_id, contains neither the instructions, the data, the response nor a key, and no value is [redacted]', async () => {
    const { ledger, entries } = setup();
    await runWithOperationId('req-1', () => ledger.record(
      record({ outcome: 'rate-limited', httpStatus: 429, providerErrorCode: 'rate_limit_exceeded' }), content, 7, NOW,
    ));
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      level: 'info', event: 'ai_call', operation_id: 'req-1', ai_op: 'q1', operation: 'generate_cloze', purpose: 'learner',
      provider: 'openai', model: 'gpt-6-luna', attempt: 1, outcome: 'rate-limited', latency_ms: 812, usage_in: 600, usage_cached: 0,
      usage_out: 500, usage_reasoning: 120, http_status: 429, provider_error: 'rate_limit_exceeded',
    });
    const text = JSON.stringify(entries[0]);
    for (const secret of [SECRET_INSTRUCTIONS, 'borrow', 'mượn', 'Can I', 'sk-']) expect(text).not.toContain(secret);
    expect(text).not.toContain('[redacted]');
  });

  it('the log entry outside a request has no operation_id and null usage fields without usage', async () => {
    const { ledger, entries } = setup();
    await ledger.record(record({ usage: null }), content, 7, NOW);
    expect(entries[0]).not.toHaveProperty('operation_id');
    expect(entries[0]).toMatchObject({ usage_in: null, usage_cached: null, usage_out: null, usage_reasoning: null });
  });
});

describe('CallLedger.countToday', () => {
  it('B6E69: at 2026-10-20T23:30Z countToday counts from 2026-10-20T17:00Z', async () => {
    const { ledger, counts } = setup();
    await expect(ledger.countToday(new Date('2026-10-20T23:30:00.000Z'))).resolves.toBe(7);
    expect(counts).toEqual([{ where: { createdAt: { gte: new Date('2026-10-20T17:00:00.000Z') } } }]);
  });

  it('at 16:59:59 Z still counts from the previous 17:00 Z', async () => {
    const { ledger, counts } = setup();
    await ledger.countToday(new Date('2026-10-20T16:59:59.000Z'));
    expect(counts).toEqual([{ where: { createdAt: { gte: new Date('2026-10-19T17:00:00.000Z') } } }]);
  });

  it('B6E89: countToday has no purpose filter (a test call counts)', async () => {
    const { ledger, counts } = setup();
    await ledger.countToday(NOW);
    expect(JSON.stringify(counts[0])).not.toContain('purpose');
    expect(JSON.stringify(counts[0])).not.toContain('outcome');
  });
});
