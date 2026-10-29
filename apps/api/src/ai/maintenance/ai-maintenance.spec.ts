import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppLogger } from '../../common/logging/app-logger.js';
import { AiAdapter, type ModelDescription, type ModelInfo } from '../adapters/ai-adapter.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import type { AiProviderName } from '../ai.types.js';
import { AiMaintenance } from './ai-maintenance.js';

const NOW = new Date('2026-10-20T03:00:00Z');
const MINUTE = 60_000;
const INFO: ModelInfo = {
  shutdownAt: new Date('2027-01-01T00:00:00Z'), lifecycle: 'deprecated', effortLevels: ['low'], thinkingOff: 'disabled',
  structuredOutputs: true, maxOutputTokens: 8000,
};

class StubAdapter extends AiAdapter {
  description: ModelDescription = { kind: 'found', info: INFO };
  describeModel = vi.fn(async (_id: string, _signal: AbortSignal) => this.description);
  constructor(readonly provider: AiProviderName) { super(); }
  call(): never { throw new Error('not used'); }
}

/** The SQL text of a tagged-template call, with its values. */
const sqlOf = (call: unknown[]) => ({ text: (call[0] as TemplateStringsArray).join('?').replace(/\s+/g, ' '), values: call.slice(1) });

function setup() {
  const jobs = new Map<string, (now: Date) => Promise<unknown>>();
  const scheduler = { register: vi.fn((name: string, job: (now: Date) => Promise<unknown>) => { jobs.set(name, job); }) };
  const prisma = {
    $executeRaw: vi.fn(async (..._args: unknown[]) => 0),
    $queryRaw: vi.fn(async (..._args: unknown[]): Promise<Array<{ id: string }>> => []),
    aiModel: {
      findMany: vi.fn(async (): Promise<Array<{ id: string; provider: string; modelId: string }>> => []),
      update: vi.fn(async () => ({})),
    },
    aiEvalRun: { findMany: vi.fn(async (): Promise<Array<{ id: string }>> => []) },
    aiJudgePass: { findMany: vi.fn(async (_args?: unknown): Promise<Array<{ id: string; evalRunId: string | null; total: number | null; createdAt: Date }>> => []) },
  };
  const registry = new AiAdapterRegistry();
  const fake = new StubAdapter('fake');
  registry.register(fake);
  const queue = { enqueue: vi.fn(async () => true), enqueueJudgePass: vi.fn(async (_id: string) => true) };
  const passes = { release: vi.fn(async (_runId: string, _now: Date): Promise<string[]> => []) };
  const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn() } as unknown as AppLogger & { warn: ReturnType<typeof vi.fn> };
  const maintenance = new AiMaintenance(prisma as never, scheduler as never, registry, queue as never, logger, passes as never);
  maintenance.onModuleInit();
  return { jobs, scheduler, prisma, fake, queue, logger, passes };
}

describe('AiMaintenance', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => { ctx = setup(); });

  it('the five jobs are registered, in order', () => {
    expect([...ctx.jobs.keys()]).toEqual([
      'ai.operations-expire', 'ai.contents-expire', 'ai.models-refresh', 'ai.eval-runs-recover', 'ai.judge-passes-recover',
    ]);
  });

  it('ai.operations-expire deletes expired rows and running rows 20 s past their deadline', async () => {
    await ctx.jobs.get('ai.operations-expire')!(NOW);
    const { text, values } = sqlOf(ctx.prisma.$executeRaw.mock.calls[0]!);
    expect(text).toContain('DELETE FROM ai_operations WHERE expires_at <= ?');
    expect(text).toContain("OR (status = 'running' AND deadline_at + interval '20 seconds' <= ?)");
    expect(values).toEqual([NOW, NOW]);
  });

  it('ai.contents-expire deletes contents whose time has passed', async () => {
    await ctx.jobs.get('ai.contents-expire')!(NOW);
    const { text, values } = sqlOf(ctx.prisma.$executeRaw.mock.calls[0]!);
    expect(text).toContain('DELETE FROM ai_call_contents WHERE expires_at <= ?');
    expect(values).toEqual([NOW]);
  });

  describe('ai.models-refresh', () => {
    const id = randomUUID();
    beforeEach(() => {
      ctx.prisma.aiModel.findMany.mockResolvedValue([{ id, provider: 'fake', modelId: 'fake:ok' }]);
    });

    it('asks only for models checked more than 24 h ago', async () => {
      await ctx.jobs.get('ai.models-refresh')!(NOW);
      expect(ctx.prisma.aiModel.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { infoCheckedAt: { lt: new Date(NOW.getTime() - 24 * 60 * MINUTE) } },
      }));
    });

    it('B6E95: the claim updates no row → describeModel not called', async () => {
      await ctx.jobs.get('ai.models-refresh')!(NOW);
      const { text } = sqlOf(ctx.prisma.$queryRaw.mock.calls[0]!);
      expect(text).toContain("UPDATE ai_models SET info_checked_at = ? WHERE id = ?::uuid AND info_checked_at < ?::timestamptz - interval '24 hours' RETURNING id");
      expect(ctx.fake.describeModel).not.toHaveBeenCalled();
      expect(ctx.prisma.aiModel.update).not.toHaveBeenCalled();
    });

    it('found → information updated', async () => {
      ctx.prisma.$queryRaw.mockResolvedValue([{ id }]);
      await ctx.jobs.get('ai.models-refresh')!(NOW);
      expect(ctx.fake.describeModel).toHaveBeenCalledWith('fake:ok', expect.any(AbortSignal));
      expect(ctx.prisma.aiModel.update).toHaveBeenCalledWith({ where: { id }, data: {
        shutdownAt: INFO.shutdownAt, lifecycle: 'deprecated', effortLevels: ['low'], thinkingOff: 'disabled', structuredOutputs: true,
        maxOutputTokens: 8000,
      } });
    });

    it('unavailable → warn ai_model_refresh_failed, information kept', async () => {
      ctx.prisma.$queryRaw.mockResolvedValue([{ id }]);
      ctx.fake.description = { kind: 'unavailable' };
      await ctx.jobs.get('ai.models-refresh')!(NOW);
      expect(ctx.prisma.aiModel.update).not.toHaveBeenCalled();
      expect(ctx.logger.warn).toHaveBeenCalledWith('ai_model_refresh_failed', { model_ref: id, provider: 'fake', kind: 'unavailable' });
    });

    it('a model whose provider is not registered is skipped, not claimed', async () => {
      ctx.prisma.aiModel.findMany.mockResolvedValue([{ id, provider: 'openai', modelId: 'gpt-x' }]);
      await ctx.jobs.get('ai.models-refresh')!(NOW);
      expect(ctx.prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('one model failing does not stop the next', async () => {
      const other = randomUUID();
      ctx.prisma.aiModel.findMany.mockResolvedValue([
        { id, provider: 'fake', modelId: 'fake:ok' }, { id: other, provider: 'fake', modelId: 'fake:slow' },
      ]);
      ctx.prisma.$queryRaw.mockResolvedValueOnce([{ id }]).mockResolvedValueOnce([{ id: other }]);
      ctx.fake.describeModel.mockRejectedValueOnce(new Error('boom'));
      await ctx.jobs.get('ai.models-refresh')!(NOW);
      expect(ctx.prisma.aiModel.update).toHaveBeenCalledTimes(1);
      expect(ctx.prisma.aiModel.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: other } }));
    });
  });

  describe('ai.eval-runs-recover', () => {
    it('recover: a queued run of 11 minutes → enqueue(id); of 9 minutes → nothing', async () => {
      const old = randomUUID();
      const rows = [{ id: old, createdAt: new Date(NOW.getTime() - 11 * MINUTE) }, { id: randomUUID(), createdAt: new Date(NOW.getTime() - 9 * MINUTE) }];
      ctx.prisma.aiEvalRun.findMany.mockImplementation((async ({ where }: { where: { createdAt: { lt: Date } } }) =>
        rows.filter((row) => row.createdAt < where.createdAt.lt)) as never);
      await ctx.jobs.get('ai.eval-runs-recover')!(NOW);
      expect(ctx.prisma.aiEvalRun.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { status: 'queued', createdAt: { lt: new Date(NOW.getTime() - 10 * MINUTE) } },
      }));
      expect(ctx.queue.enqueue).toHaveBeenCalledTimes(1);
      expect(ctx.queue.enqueue).toHaveBeenCalledWith(old);
    });

    it('B6E92: a running run without heartbeat for 15 minutes → failed stalled, items kept', async () => {
      await ctx.jobs.get('ai.eval-runs-recover')!(NOW);
      const { text, values } = sqlOf(ctx.prisma.$executeRaw.mock.calls[0]!);
      expect(text).toContain("UPDATE ai_eval_runs SET status = 'failed', error = 'stalled', finished_at = ?");
      expect(text).toContain("WHERE status = 'running' AND heartbeat_at < ?");
      expect(text).not.toContain('items');
      expect(values).toEqual([NOW, new Date(NOW.getTime() - 15 * MINUTE)]);
    });
  });
});

describe('AiMaintenance ai.judge-passes-recover (nhóm B M3, B41)', () => {
  const RUN = randomUUID();
  const old = (over: Partial<{ id: string; evalRunId: string | null; total: number | null }> = {}) => ({
    id: randomUUID(), evalRunId: null, total: 3, createdAt: new Date(NOW.getTime() - 11 * MINUTE), ...over,
  });

  it('asks for queued passes older than 10 minutes only', async () => {
    const ctx = setup();
    await ctx.jobs.get('ai.judge-passes-recover')!(NOW);
    expect(ctx.prisma.aiJudgePass.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'queued', createdAt: { lt: new Date(NOW.getTime() - 10 * MINUTE) } },
    }));
  });

  it('a queued pass with its snapshot that Redis never took is enqueued again (job id = pass id)', async () => {
    const ctx = setup();
    const stuck = old();
    ctx.prisma.aiJudgePass.findMany.mockResolvedValue([stuck]);
    await ctx.jobs.get('ai.judge-passes-recover')!(NOW);
    expect(ctx.queue.enqueueJudgePass).toHaveBeenCalledExactlyOnceWith(stuck.id);
    expect(ctx.passes.release).not.toHaveBeenCalled();
  });

  it('a waiting pass (no snapshot) whose run has ended is released once per run, and the passes release returns are enqueued', async () => {
    const ctx = setup();
    const [a, b] = [old({ evalRunId: RUN, total: null }), old({ evalRunId: RUN, total: null })];
    ctx.prisma.aiJudgePass.findMany.mockResolvedValue([a, b]);
    ctx.passes.release.mockResolvedValue([a.id, b.id]);
    await ctx.jobs.get('ai.judge-passes-recover')!(NOW);
    expect(ctx.passes.release).toHaveBeenCalledExactlyOnceWith(RUN, NOW);
    expect(ctx.queue.enqueueJudgePass.mock.calls.map(([id]) => id)).toEqual([a.id, b.id]);
  });

  it('a waiting pass whose run has not ended (release gives nothing) is left alone', async () => {
    const ctx = setup();
    ctx.prisma.aiJudgePass.findMany.mockResolvedValue([old({ evalRunId: RUN, total: null })]);
    await ctx.jobs.get('ai.judge-passes-recover')!(NOW);
    expect(ctx.passes.release).toHaveBeenCalledTimes(1);
    expect(ctx.queue.enqueueJudgePass).not.toHaveBeenCalled();
  });

  it('a running pass without a heartbeat for 15 minutes → failed stalled, scores and items kept', async () => {
    const ctx = setup();
    await ctx.jobs.get('ai.judge-passes-recover')!(NOW);
    const { text, values } = sqlOf(ctx.prisma.$executeRaw.mock.calls[0]!);
    expect(text).toContain("UPDATE ai_judge_passes SET status = 'failed', error = 'stalled', finished_at = ?");
    expect(text).toContain("WHERE status = 'running' AND heartbeat_at < ?");
    expect(text).not.toContain('scores');
    expect(values).toEqual([NOW, new Date(NOW.getTime() - 15 * MINUTE)]);
  });

  it('one pass that cannot be recovered (the release throws) does not stop the rest of the hourly job', async () => {
    const ctx = setup();
    ctx.prisma.aiJudgePass.findMany.mockResolvedValue([old({ evalRunId: RUN, total: null }), old()]);
    ctx.passes.release.mockRejectedValue(new Error('db down'));
    await expect(ctx.jobs.get('ai.judge-passes-recover')!(NOW)).resolves.toBeUndefined();
    expect(ctx.queue.enqueueJudgePass).toHaveBeenCalledTimes(1);
    expect(ctx.logger.warn).toHaveBeenCalledWith('ai_judge_recover_failed', expect.objectContaining({ run_id: RUN }));
    expect(ctx.prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });
});
