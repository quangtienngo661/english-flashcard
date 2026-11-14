import { describe, expect, it, vi } from 'vitest';
import type { ContentService, EntryUsageScope } from '../content/index.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PipelineEntryUsageProbe } from './entry-usage.probe.js';

const scope = (over: Partial<EntryUsageScope> = {}): EntryUsageScope => ({
  entryId: 'e1', lemma: 'deploy', pos: 'verb', senseIds: ['s1', 's2'], revisionIds: ['r1'], variantIds: ['v1'], levelIds: ['l1'], ...over,
});

type Setup = { records?: string[]; keys?: string[]; items?: string[]; backfill?: boolean };

/** Statuses are those of the owning background job; a record or key of a reverted batch is filtered by the query, not here. */
function setup(rows: Setup = {}) {
  const tx = {
    batchRecord: { findMany: vi.fn(async () => (rows.records ?? []).map((status) => ({ batch: { job: { status } } }))) },
    publishJobItem: { findMany: vi.fn(async () => (rows.items ?? []).map((status) => ({ job: { job: { status } } }))) },
    backgroundJob: { findFirst: vi.fn(async () => (rows.backfill ? { id: 'j' } : null)) },
    $queryRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      void strings; void values;
      return (rows.keys ?? []).map((status) => ({ status }));
    }),
  };
  const register = vi.fn();
  const probe = new PipelineEntryUsageProbe({ registerEntryUsageProbe: register } as unknown as ContentService);
  return { tx, probe, register, reasons: (s: EntryUsageScope = scope()) => probe.reasonsFor(tx as unknown as Prisma.TransactionClient, s) };
}

describe('PipelineEntryUsageProbe (batch records, row keys, publish job items, background jobs)', () => {
  it('registers itself with Content when the module starts', () => {
    const { probe, register } = setup();
    probe.onModuleInit();
    expect(register).toHaveBeenCalledWith(probe);
    expect(probe.module).toBe('pipeline');
  });

  it('control: nothing refers to the entry and no backfill runs → no reason, and every source was looked at', async () => {
    const { reasons, tx } = setup();
    expect(await reasons()).toEqual([]);
    expect(tx.batchRecord.findMany).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.publishJobItem.findMany).toHaveBeenCalledTimes(1);
    expect(tx.backgroundJob.findFirst).toHaveBeenCalledTimes(1);
  });

  describe('rule 2: records of an import batch that has not been reverted', () => {
    it.each(['succeeded', 'partial', 'failed'])('a batch record of a %s batch → batch-record only', async (status) => {
      expect(await setup({ records: [status] }).reasons()).toEqual(['batch-record']);
    });

    it('the query asks for the entry, its senses, revisions, variants and levels, by record type, on batches with no reverted_at', async () => {
      const { reasons, tx } = setup();
      await reasons();
      const { where } = (tx.batchRecord.findMany.mock.calls[0] as unknown as [{ where: unknown }])[0];
      expect(where).toEqual({
        batch: { revertedAt: null },
        OR: [
          { recordType: 'entry', recordId: 'e1' },
          { recordType: 'sense', recordId: { in: ['s1', 's2'] } },
          { recordType: 'revision', recordId: { in: ['r1'] } },
          { recordType: 'variant', recordId: { in: ['v1'] } },
          { recordType: 'level', recordId: { in: ['l1'] } },
        ],
      });
    });

    it('empty id lists are left out of the query (an entry just pasted has only its own record)', async () => {
      const { reasons, tx } = setup();
      await reasons(scope({ senseIds: [], revisionIds: [], variantIds: [], levelIds: [] }));
      const { where } = (tx.batchRecord.findMany.mock.calls[0] as unknown as [{ where: { OR: unknown[] } }])[0];
      expect(where.OR).toEqual([{ recordType: 'entry', recordId: 'e1' }]);
    });

    it('a batch that is still queued or running also → active-job', async () => {
      expect(await setup({ records: ['running'] }).reasons()).toEqual(['batch-record', 'active-job']);
      expect(await setup({ records: ['succeeded', 'queued'] }).reasons()).toEqual(['batch-record', 'active-job']);
    });
  });

  describe('rule 2: the row keys a batch left for this lemma and pos (a re-upload would skip the row as already applied)', () => {
    it('a key of a batch that has not been reverted → batch-record, even when the batch recorded nothing of this entry', async () => {
      expect(await setup({ keys: ['succeeded'] }).reasons()).toEqual(['batch-record']);
    });

    it('a key of a running batch → batch-record and active-job', async () => {
      expect(await setup({ keys: ['running'] }).reasons()).toEqual(['batch-record', 'active-job']);
    });

    it('the SQL binds the entry\'s lemma and pos, reads only level and content keys and only batches with reverted_at NULL', async () => {
      const { reasons, tx } = setup();
      await reasons();
      const [strings, ...values] = tx.$queryRaw.mock.calls[0] as unknown as [TemplateStringsArray, ...unknown[]];
      const sql = strings.join('?').replace(/\s+/g, ' ');
      expect(values).toEqual(['deploy', 'verb']);
      expect(sql).toContain('b.reverted_at IS NULL');
      expect(sql).toContain("k.kind IN ('level', 'content')");
      expect(sql).toContain('k.row_key::jsonb ->> 1');
      expect(sql).toContain('k.row_key::jsonb ->> 2');
    });
  });

  describe('rule 2 and 3: publish job items', () => {
    it('a sense in a finished publish job (its report still lists the sense) → publish-job only', async () => {
      expect(await setup({ items: ['succeeded'] }).reasons()).toEqual(['publish-job']);
      expect(await setup({ items: ['partial'] }).reasons()).toEqual(['publish-job']);
      expect(await setup({ items: ['failed'] }).reasons()).toEqual(['publish-job']);
    });

    it('a sense in a queued or running publish job → publish-job and active-job', async () => {
      expect(await setup({ items: ['queued'] }).reasons()).toEqual(['publish-job', 'active-job']);
      expect(await setup({ items: ['succeeded', 'running'] }).reasons()).toEqual(['publish-job', 'active-job']);
    });

    it('asks for the entry\'s sense ids; an entry without senses is not looked up', async () => {
      const { reasons, tx } = setup({ items: ['succeeded'] });
      await reasons();
      expect(tx.publishJobItem.findMany).toHaveBeenCalledWith({
        where: { senseId: { in: ['s1', 's2'] } }, select: { job: { select: { job: { select: { status: true } } } } },
      });
      tx.publishJobItem.findMany.mockClear();
      expect(await reasons(scope({ senseIds: [] }))).toEqual([]);
      expect(tx.publishJobItem.findMany).not.toHaveBeenCalled();
    });
  });

  describe('rule 3: the inflection backfill walks every entry', () => {
    it('a queued or running content-inflections job → active-job', async () => {
      const { reasons, tx } = setup({ backfill: true });
      expect(await reasons()).toEqual(['active-job']);
      expect(tx.backgroundJob.findFirst).toHaveBeenCalledWith({
        where: { queue: 'content-inflections', status: { in: ['queued', 'running'] } }, select: { id: true },
      });
    });
  });

  it('everything at once: each reason once, in the order of the port', async () => {
    const all = await setup({ records: ['running', 'succeeded'], keys: ['succeeded'], items: ['running'], backfill: true }).reasons();
    expect(all).toEqual(['batch-record', 'publish-job', 'active-job']);
  });
});
