import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AiBatchesService } from './ai-batches.service.js';

const NOW = new Date('2026-11-01T01:00:00Z');
const ID = '11111111-1111-4111-8111-111111111111';
const SOURCE = '22222222-2222-4222-8222-222222222222';
const ACTOR = '33333333-3333-4333-8333-333333333333';
const row = (over: Record<string, unknown> = {}) => ({
  id: ID, kind: 'test', operation: 'generate_cloze', status: 'running', config_id: null, config_version: null,
  fingerprint: null, source_id: null, parent_id: null, model: 'fake:ok', provider: 'fake', total: 5, done: 2,
  actor_id: ACTOR, created_at: NOW, started_at: NOW, finished_at: null,
  known_cost_usd: '9007199254740993.00000003', unknown_cost_calls: 1, calls: 3, retries: 1,
  input_tokens: 45n, cached_input_tokens: 3n, output_tokens: 20n, reasoning_tokens: 2n, ...over,
});
const NEW = { kind: 'test' as const, operation: 'generate_cloze', model: 'fake:ok', provider: 'fake', total: 5, actorId: ACTOR };

function setup() {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const prisma = {
    aiBatch: {
      create: vi.fn(async (_args: unknown) => ({ id: ID })),
      upsert: vi.fn(async (_args: unknown) => ({ id: ID })),
      updateMany: vi.fn(async (_args: unknown) => ({ count: 1 })),
    },
    $executeRaw: vi.fn(async (query: { sql: string; values: unknown[] }) => { statements.push(query); return 1; }),
    $queryRaw: vi.fn(async (query: { sql: string; values: unknown[] }): Promise<unknown[]> => { statements.push(query); return [row()]; }),
  };
  const identity = { emailsOf: vi.fn(async (_ids: string[]) => new Map([[ACTOR, 'admin@example.test']])) };
  return { service: new AiBatchesService(prisma as never, identity as never, new FakeClock(NOW)), prisma, statements, identity };
}

describe('AiBatchesService durable metadata', () => {
  it('creates quick batches without duplicating input/output, while keeping frozen prompt/fewshot', async () => {
    const { service, prisma } = setup();
    await expect(service.create({ ...NEW, snapshot: { instructions: 'Frozen', examples: [{ input: { word: 'fewshot' }, output: { answer: 'x' } }],
      input: { word: 'heldout' }, output: 'heldout answer', items: [{ input: 'heldout' }] } })).resolves.toBe(ID);
    expect(prisma.aiBatch.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      kind: 'test', actorId: ACTOR, total: 5, status: 'queued', createdAt: NOW,
      snapshot: { instructions: 'Frozen', examples: [{ input: { word: 'fewshot' }, output: { answer: 'x' } }] },
    }), select: { id: true } });
  });

  it('a source uses an atomic unique-source upsert and never overwrites an existing snapshot', async () => {
    const { service, prisma } = setup();
    await service.create({ ...NEW, kind: 'judge', sourceId: SOURCE, parentId: ID });
    const args = prisma.aiBatch.upsert.mock.calls[0]![0] as Record<string, unknown>;
    expect(args).toMatchObject({ where: { sourceId: SOURCE }, update: {}, create: { sourceId: SOURCE, parentId: ID }, select: { id: true } });
    expect(prisma.aiBatch.create).not.toHaveBeenCalled();
  });

  it.each([null, SOURCE])('uses the supplied transaction for create/upsert, with no write on the shared client (source %s)', async (sourceId) => {
    const { service, prisma } = setup();
    const tx = { aiBatch: { create: vi.fn(async () => ({ id: SOURCE })), upsert: vi.fn(async () => ({ id: SOURCE })) } };
    await expect(service.create({ ...NEW, sourceId }, tx as never)).resolves.toBe(SOURCE);
    expect(prisma.aiBatch.create).not.toHaveBeenCalled();
    expect(prisma.aiBatch.upsert).not.toHaveBeenCalled();
    const write = sourceId === null ? tx.aiBatch.create : tx.aiBatch.upsert;
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('start is conditional and preserves a first timestamp; finish never reopens a terminal batch', async () => {
    const { service, statements, prisma } = setup();
    await service.start(ID);
    expect(statements[0]!.sql).toContain('COALESCE(started_at,');
    expect(statements[0]!.sql).toContain("status IN ('queued', 'running')");
    await service.finish(ID, 'failed');
    expect(prisma.aiBatch.updateMany).toHaveBeenCalledWith({ where: { id: ID, status: { in: ['queued', 'running'] } }, data: { status: 'failed', finishedAt: NOW } });
  });
});

describe('AiBatchesService list and detail', () => {
  it('both list status filters and detail map failed/cancelled run or pass to cancelled', async () => {
    const { service, prisma, statements } = setup();
    await service.list({ kind: 'eval', status: 'cancelled' });
    const expression = "CASE WHEN (r.status = 'failed' AND r.error = 'cancelled') OR (p.status = 'failed' AND p.error = 'cancelled') THEN 'cancelled' ELSE coalesce(r.status, p.status, b.status) END";
    const listSql = statements[0]!.sql.replace(/\s+/g, ' ');
    expect(listSql.split(expression)).toHaveLength(3);
    expect(statements[0]!.values).toContain('cancelled');
    prisma.$queryRaw.mockResolvedValueOnce([row({ kind: 'judge', status: 'cancelled' })]);
    const detail = await service.get(ID);
    expect(detail.status).toBe('cancelled');
    expect(prisma.$queryRaw.mock.calls[1]![0].sql.replace(/\s+/g, ' ')).toContain(`${expression} AS status`);
  });
  it('keeps decimal totals exact and returns unknown total separately from its known subtotal', async () => {
    const { service } = setup();
    const result = await service.list({ from: '2026-11-01', to: '2026-11-01' });
    expect(result.items[0]).toMatchObject({ cost_usd: null, known_cost_usd: '9007199254740993.00000003', unknown_cost_calls: 1,
      input_tokens: 45, calls: 3, retries: 1, total: 5, done: 2, started_by_user: { id: ACTOR, email: 'admin@example.test', system: false } });
    expect(result.items[0]).not.toHaveProperty('actor_id');
    expect(result.items[0]).not.toHaveProperty('snapshot');
  });

  it('fully priced results report their exact total; no calls is a known zero', async () => {
    const { service, prisma } = setup();
    prisma.$queryRaw.mockResolvedValueOnce([row({ unknown_cost_calls: 0, known_cost_usd: '0.00000003' })]);
    expect((await service.list({})).items[0]!.cost_usd).toBe('0.00000003');
  });

  it('uses inclusive Vietnam dates, parameterized filters, source progress and SQL decimal aggregates', async () => {
    const { service, statements } = setup();
    await service.list({ from: '2026-10-31', to: '2026-11-01', operation: 'generate_cloze', kind: 'eval', status: 'failed' });
    const q = statements[0]!;
    expect(q.values).toEqual(expect.arrayContaining([new Date('2026-10-30T17:00:00Z'), new Date('2026-11-01T17:00:00Z'), 'generate_cloze', 'eval', 'failed']));
    expect(q.sql).toContain('ai_eval_runs');
    expect(q.sql).toContain('ai_judge_passes');
    expect(q.sql).toContain('ai_eval_run_items');
    expect(q.sql).toContain('sum(c.cost_usd)');
    expect(q.sql).toContain('::text AS known_cost_usd');
    expect(q.sql).toContain('NOT c.cost_known OR c.cost_usd IS NULL');
    expect(q.sql).toContain('count(DISTINCT c.operation_id)');
    expect(q.sql).toContain('c.attempt > 1');
    expect(q.sql).not.toContain('c.request');
    expect(q.sql).not.toContain('i.input');
  });

  it('rejects reversed and over-366-day ranges before querying and accepts 366 inclusive days', async () => {
    const { service, prisma } = setup();
    await expect(service.list({ from: '2026-11-02', to: '2026-11-01' })).rejects.toMatchObject({ status: 400 });
    await expect(service.list({ from: '2025-10-31', to: '2026-11-01' })).rejects.toMatchObject({ status: 400 });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    await service.list({ from: '2025-11-01', to: '2026-11-01' });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('pages equal timestamps by id and binds the cursor to date, operation, kind and status filters', async () => {
    const { service, prisma } = setup();
    prisma.$queryRaw.mockResolvedValueOnce([row(), row({ id: SOURCE })]);
    const query = { from: '2026-11-01', to: '2026-11-01', page_size: 1, kind: 'test' as const };
    const first = await service.list(query);
    expect(first.items).toHaveLength(1);
    expect(first.next_page_token).toEqual(expect.any(String));
    await service.list({ ...query, page_token: first.next_page_token! });
    const nextPage = prisma.$queryRaw.mock.calls[1]![0];
    expect(nextPage.sql).toContain('(b.created_at, b.id) <');
    // Imported timestamps may contain microseconds that are absent from the JS Date in the token.
    // The query boundary must resolve the immutable cursor row in PostgreSQL, not use that rounded Date.
    expect(nextPage.sql).toContain('SELECT anchor.created_at FROM ai_batches anchor WHERE anchor.id =');
    expect(nextPage.values).not.toContainEqual(NOW);
    for (const change of [{ kind: 'eval' }, { status: 'failed' }, { operation: 'lookup_word' }, { to: '2026-11-02' }]) {
      await expect(service.list({ ...query, ...change, page_token: first.next_page_token! } as never)).rejects.toMatchObject({ status: 400 });
    }
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed dates, unknown/content filters, page sizes and malformed cursor before querying', async () => {
    const { service, prisma } = setup();
    for (const query of [{ from: '2026-02-30' }, { level: 'B1' }, { search: 'heldout' }, { page_size: 0 }, { page_size: 101 }, { page_token: 'bad' }]) {
      await expect(service.list(query as never)).rejects.toMatchObject({ status: 400 });
    }
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it.each(['eval', 'judge'])('%s details expose only prompt configuration and source links, with no content lookup', async (kind) => {
    const { service, prisma } = setup();
    prisma.$queryRaw.mockResolvedValueOnce([row({ kind, source_id: SOURCE, snapshot: { instructions: 'Frozen', examples: [], input: 'heldout', items: ['secret'] } })]);
    const detail = await service.get(ID);
    expect(detail).toMatchObject({ source_id: SOURCE, snapshot: { instructions: 'Frozen', examples: [] }, items: [] });
    expect(JSON.stringify(detail)).not.toContain('heldout');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('quick detail reads only unexpired test-call contents and keeps metadata after expiry', async () => {
    const { service, prisma } = setup();
    prisma.$queryRaw.mockResolvedValueOnce([row({ snapshot: { instructions: 'Frozen', examples: [] } })]);
    prisma.$queryRaw.mockResolvedValueOnce([{ call_id: SOURCE, content: null }]);
    const detail = await service.get(ID);
    expect(detail.items).toEqual([{ call_id: SOURCE, content: null }]);
    expect(detail.known_cost_usd).toBe('9007199254740993.00000003');
    const query = prisma.$queryRaw.mock.calls[1]![0];
    expect(query.sql).toContain('cc.expires_at >');
    expect(query.sql).toContain("c.purpose = 'test'");
    expect(query.values).toContainEqual(NOW);
  });

  it('missing or malformed detail id gives 404/400 without a content query', async () => {
    const { service, prisma } = setup();
    await expect(service.get('bad')).rejects.toMatchObject({ status: 400 });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    prisma.$queryRaw.mockResolvedValueOnce([]);
    await expect(service.get(ID)).rejects.toMatchObject({ status: 404 });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
