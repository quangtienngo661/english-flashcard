import { describe, expect, it, vi } from 'vitest';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { EntryDeleteService } from './entry-delete.service.js';
import type { EntriesService } from './entries.service.js';
import {
  EntryUsageRegistry, REQUIRED_ENTRY_USAGE_MODULES, type EntryUsageModule, type EntryUsageProbe, type EntryUsageReason,
} from './entry-usage.js';

const ENTRY = '11111111-1111-4111-8111-111111111111';
type FakeSense = {
  id: string; state?: string; liveRevisionId?: string | null; replacesSenseId?: string | null;
  revisions?: Array<{ id: string; status?: string; publishedAt?: Date | null }>;
};

/** A never-published draft: open, no live revision, one draft revision. */
const draft = (id: string, over: Partial<FakeSense> = {}): FakeSense => ({
  id, state: 'open', liveRevisionId: null, replacesSenseId: null, revisions: [{ id: `${id}-r1`, status: 'draft', publishedAt: null }], ...over,
});

type Setup = {
  senses?: FakeSense[]; variants?: string[]; levels?: string[];
  /** The entry as the first read finds it (null = unknown or private) and as the row lock finds it. */
  found?: boolean; lockedRows?: number; formOfFrom?: boolean; sentences?: boolean; deleted?: number;
  probes?: Partial<Record<EntryUsageModule, EntryUsageReason[] | Error>>; skipProbes?: EntryUsageModule[];
};

function setup(opts: Setup = {}) {
  const calls: string[] = [];
  const senses = (opts.senses ?? [draft('s1')]).map((sense) => ({
    state: 'open', liveRevisionId: null, replacesSenseId: null, revisions: [], ...sense,
  }));
  const remaining = new Set(senses.map(({ id }) => id));
  const tx = {
    $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
      calls.push(`queryRaw:${strings.join('?').replace(/\s+/g, ' ').trim()}`);
      return Array.from({ length: opts.lockedRows ?? 1 }, () => ({ id: ENTRY }));
    }),
    sense: {
      findMany: vi.fn(async (args: unknown) => { calls.push('sense.findMany'); lastSenseRead = args; return senses; }),
      // The foreign key from a replacement to the sense it replaces is RESTRICT: a parent cannot go before its child.
      deleteMany: vi.fn(async (args: { where: { id: { in: string[] }; entryId: string } }) => {
        calls.push(`sense.deleteMany:${args.where.id.in.join(',')}`);
        for (const id of args.where.id.in) {
          const child = senses.find((s) => remaining.has(s.id) && s.replacesSenseId === id && !args.where.id.in.includes(s.id));
          if (child) throw new Error(`restrict: ${child.id} still replaces ${id}`);
        }
        for (const id of args.where.id.in) remaining.delete(id);
        return { count: args.where.id.in.length };
      }),
    },
    entryVariant: { findMany: vi.fn(async () => (opts.variants ?? []).map((id) => ({ id }))) },
    entryLevel: { findMany: vi.fn(async () => (opts.levels ?? []).map((id) => ({ id }))) },
    senseRevision: {
      findFirst: vi.fn(async (args: unknown) => { calls.push('senseRevision.findFirst'); lastFormOfRead = args; return opts.formOfFrom ? { id: 'r-other' } : null; }),
    },
    contextSentence: { findFirst: vi.fn(async () => (opts.sentences ? { id: 'c1' } : null)) },
    entry: { deleteMany: vi.fn(async () => { calls.push('entry.deleteMany'); return { count: opts.deleted ?? 1 }; }) },
  };
  let lastSenseRead: unknown; let lastFormOfRead: unknown;
  const entryFind = vi.fn(async () => (opts.found === false ? null : { lemma: 'deploy', pos: 'verb' }));
  const prisma = {
    entry: { findFirst: entryFind },
    $transaction: vi.fn(async (fn: (t: unknown) => unknown, options?: unknown) => { calls.push('transaction'); void options; return fn(tx); }),
  } as unknown as PrismaClient;
  const entries = { lockEntryKey: vi.fn(async () => { calls.push('lockEntryKey'); }) } as unknown as EntriesService;
  const registry = new EntryUsageRegistry();
  const probes = new Map<EntryUsageModule, EntryUsageProbe>();
  for (const module of REQUIRED_ENTRY_USAGE_MODULES) {
    if (opts.skipProbes?.includes(module)) continue;
    const result = opts.probes?.[module] ?? [];
    const probe: EntryUsageProbe = { module, reasonsFor: vi.fn(async () => {
      calls.push(`probe:${module}`);
      if (result instanceof Error) throw result;
      return result;
    }) };
    probes.set(module, probe);
    registry.register(probe);
  }
  const service = new EntryDeleteService(prisma, entries, registry);
  return { service, prisma, entries, tx, calls, probes, entryFind, senseRead: () => lastSenseRead, formOfRead: () => lastFormOfRead };
}

async function refusal(run: Promise<unknown>): Promise<ProblemDetailsException> {
  const error = await run.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(ProblemDetailsException);
  return error as ProblemDetailsException;
}

const reasonsOf = (error: ProblemDetailsException) => error.extensions?.reasons;
const writes = (calls: string[]) => calls.filter((call) => call.includes('deleteMany'));

describe('EntryDeleteService.deleteEntry', () => {
  it('control: a never-published entry nothing refers to is deleted, its senses first, under the entry key lock and the row lock', async () => {
    const { service, calls, tx, entries } = setup({ senses: [draft('s1'), draft('s2')], variants: ['v1'], levels: ['l1'] });
    await expect(service.deleteEntry(ENTRY)).resolves.toBeUndefined();
    expect(entries.lockEntryKey).toHaveBeenCalledWith(tx, 'deploy', 'verb');
    expect(calls[0]).toBe('transaction');
    expect(calls[1]).toBe('lockEntryKey');
    expect(calls[2]).toMatch(/^queryRaw:SELECT id FROM entries WHERE id = \?::uuid AND scope = 'catalog' FOR UPDATE$/);
    // The check reads everything after the lock, then deletes senses and the entry last.
    expect(calls.indexOf('sense.findMany')).toBeGreaterThan(2);
    expect(calls.indexOf('probe:learning')).toBeLessThan(calls.indexOf('sense.deleteMany:s1,s2'));
    expect(calls.at(-1)).toBe('entry.deleteMany');
    expect(tx.entry.deleteMany).toHaveBeenCalledWith({ where: { id: ENTRY, scope: 'catalog' } });
  });

  it('an entry without any sense (just pasted) is deleted without a sense delete', async () => {
    const { service, tx } = setup({ senses: [] });
    await service.deleteEntry(ENTRY);
    expect(tx.sense.deleteMany).not.toHaveBeenCalled();
    expect(tx.entry.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('unknown id, or a private entry (the read filters scope catalog): 404 not-found, no transaction', async () => {
    const { service, prisma, entryFind } = setup({ found: false });
    const error = await refusal(service.deleteEntry(ENTRY));
    expect(error.getStatus()).toBe(404);
    expect(error.problemType).toBe('not-found');
    expect(entryFind).toHaveBeenCalledWith({ where: { id: ENTRY, scope: 'catalog' }, select: { lemma: true, pos: true } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('the entry vanished between the first read and the row lock: 404 and nothing is deleted', async () => {
    const { service, calls, probes } = setup({ lockedRows: 0 });
    const error = await refusal(service.deleteEntry(ENTRY));
    expect(error.getStatus()).toBe(404);
    expect(writes(calls)).toEqual([]);
    for (const probe of probes.values()) expect(probe.reasonsFor).not.toHaveBeenCalled();
  });

  describe('rule 1: no sense was ever published', () => {
    const blocked = async (sense: FakeSense) => {
      const ctx = setup({ senses: [draft('s0'), sense] });
      const error = await refusal(ctx.service.deleteEntry(ENTRY));
      expect(error.getStatus()).toBe(409);
      expect(error.problemType).toBe('entry-in-use');
      expect(reasonsOf(error)).toEqual(['published-sense']);
      expect(writes(ctx.calls)).toEqual([]);
    };

    it('a live revision blocks, whatever the state', async () => {
      await blocked(draft('s1', { liveRevisionId: 'r1' }));
      await blocked(draft('s1', { liveRevisionId: 'r1', state: 'unpublished' }));
      await blocked(draft('s1', { liveRevisionId: 'r1', state: 'retired' }));
    });

    it('a revision that has a publication time blocks, even when a later publish superseded it', async () => {
      await blocked(draft('s1', { state: 'retired', revisions: [{ id: 'a', status: 'superseded', publishedAt: new Date() }] }));
    });

    it('a revision with status published blocks even without a time', async () => {
      await blocked(draft('s1', { revisions: [{ id: 'a', status: 'published', publishedAt: null }] }));
    });

    it('state unpublished blocks even when no trace of the publication is left (cannot tell: treated as published)', async () => {
      await blocked(draft('s1', { state: 'unpublished' }));
    });

    it('a retired sense that never went live (a rejected replacement) does not block', async () => {
      const { service, tx } = setup({ senses: [draft('s1', { state: 'retired', revisions: [{ id: 'a', status: 'rejected', publishedAt: null }] })] });
      await service.deleteEntry(ENTRY);
      expect(tx.entry.deleteMany).toHaveBeenCalled();
    });

    it('draft, reviewed, rejected and superseded-by-edit revisions with no publication time do not block', async () => {
      const revisions = ['draft', 'reviewed', 'rejected', 'superseded'].map((status, i) => ({ id: `r${i}`, status, publishedAt: null }));
      const { service, tx } = setup({ senses: [draft('s1', { revisions })] });
      await service.deleteEntry(ENTRY);
      expect(tx.entry.deleteMany).toHaveBeenCalled();
    });
  });

  it('rule 2 (Content): a revision of another entry that says it is a form of this one blocks as form-of-link; own revisions are not counted', async () => {
    const { service, calls, formOfRead } = setup({ formOfFrom: true });
    const error = await refusal(service.deleteEntry(ENTRY));
    expect(reasonsOf(error)).toEqual(['form-of-link']);
    expect(writes(calls)).toEqual([]);
    expect(formOfRead()).toEqual({ where: { formOfEntryId: ENTRY, sense: { entryId: { not: ENTRY } } }, select: { id: true } });
  });

  it('rule 2 (Content): a learner context sentence on one of its senses blocks as learner-data', async () => {
    const { service, calls, tx } = setup({ sentences: true, senses: [draft('s1'), draft('s2')] });
    const error = await refusal(service.deleteEntry(ENTRY));
    expect(reasonsOf(error)).toEqual(['learner-data']);
    expect(writes(calls)).toEqual([]);
    expect(tx.contextSentence.findFirst).toHaveBeenCalledWith({ where: { senseId: { in: ['s1', 's2'] } }, select: { id: true } });
  });

  it.each(REQUIRED_ENTRY_USAGE_MODULES)('rule 2 (%s probe): its reasons block, the probe gets the entry\'s whole scope, nothing is written', async (module) => {
    const { service, calls, probes, tx } = setup({
      senses: [draft('s1', { revisions: [{ id: 'r1', status: 'superseded', publishedAt: null }, { id: 'r2', status: 'draft', publishedAt: null }] }), draft('s2')],
      variants: ['v1'], levels: ['l1', 'l2'],
      probes: { [module]: ['learner-data'] },
    });
    const error = await refusal(service.deleteEntry(ENTRY));
    expect(error.getStatus()).toBe(409);
    expect(reasonsOf(error)).toEqual(['learner-data']);
    expect(writes(calls)).toEqual([]);
    expect(probes.get(module)!.reasonsFor).toHaveBeenCalledWith(tx, {
      entryId: ENTRY, lemma: 'deploy', pos: 'verb', senseIds: ['s1', 's2'], revisionIds: ['r1', 'r2', 's2-r1'], variantIds: ['v1'], levelIds: ['l1', 'l2'],
    });
  });

  it('every reason is reported once, in a fixed order, and every probe runs even after one found something', async () => {
    const { service, probes, calls } = setup({
      senses: [draft('s1', { liveRevisionId: 'r1' })], formOfFrom: true, sentences: true,
      probes: { learning: ['learner-data'], practice: ['learner-data'], pipeline: ['active-job', 'batch-record', 'publish-job'] },
    });
    const error = await refusal(service.deleteEntry(ENTRY));
    expect(reasonsOf(error)).toEqual(['published-sense', 'form-of-link', 'learner-data', 'batch-record', 'publish-job', 'active-job']);
    for (const probe of probes.values()) expect(probe.reasonsFor).toHaveBeenCalledTimes(1);
    expect(writes(calls)).toEqual([]);
  });

  it('a missing probe is an error, not "nothing found": a plain Error (500), no write, no matter what else was checked', async () => {
    const { service, calls } = setup({ skipProbes: ['practice'] });
    const error = await service.deleteEntry(ENTRY).then(() => null, (e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ProblemDetailsException);
    expect((error as Error).message).toContain('practice');
    expect(writes(calls)).toEqual([]);
  });

  it('a probe that throws propagates (the transaction rolls back) and nothing is written', async () => {
    const { service, calls } = setup({ probes: { learning: new Error('boom') } });
    await expect(service.deleteEntry(ENTRY)).rejects.toThrow('boom');
    expect(writes(calls)).toEqual([]);
  });

  it('a refused delete writes nothing: no sense delete, no entry delete, in every refusal case', async () => {
    for (const opts of [
      { senses: [draft('s1', { liveRevisionId: 'r1' })] }, { formOfFrom: true }, { sentences: true },
      { probes: { learning: ['learner-data' as const] } }, { probes: { pipeline: ['batch-record' as const] } },
    ]) {
      const { service, tx } = setup(opts);
      await refusal(service.deleteEntry(ENTRY));
      expect(tx.sense.deleteMany).not.toHaveBeenCalled();
      expect(tx.entry.deleteMany).not.toHaveBeenCalled();
    }
  });

  it('a sense that replaces another goes first (the replaced-sense link is RESTRICT), also when listed the other way round', async () => {
    const { service, calls } = setup({ senses: [draft('b', { replacesSenseId: 'a' }), draft('a'), draft('c', { replacesSenseId: 'b' })] });
    await service.deleteEntry(ENTRY);
    const order = calls.filter((call) => call.startsWith('sense.deleteMany')).flatMap((call) => call.slice('sense.deleteMany:'.length).split(','));
    expect(order.indexOf('c')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('a'));
    expect([...order].sort()).toEqual(['a', 'b', 'c']);
  });

  it('the entry delete matching no row is an error (rolls back the sense deletes), not a silent success', async () => {
    const { service } = setup({ deleted: 0 });
    await expect(service.deleteEntry(ENTRY)).rejects.toThrow(/entry/i);
  });

  it('a database error on the sense delete (for example a restrict link from another entry) propagates and the entry is not deleted', async () => {
    const { service, tx } = setup({ senses: [draft('a')] });
    tx.sense.deleteMany.mockRejectedValueOnce(new Error('foreign key violation'));
    await expect(service.deleteEntry(ENTRY)).rejects.toThrow('foreign key violation');
    expect(tx.entry.deleteMany).not.toHaveBeenCalled();
  });

  it('senses that replace each other in a cycle cannot be ordered: an error before any sense delete', async () => {
    const { service, tx } = setup({ senses: [draft('a', { replacesSenseId: 'b' }), draft('b', { replacesSenseId: 'a' })] });
    await expect(service.deleteEntry(ENTRY)).rejects.toThrow(/cycle/);
    expect(tx.sense.deleteMany).not.toHaveBeenCalled();
    expect(tx.entry.deleteMany).not.toHaveBeenCalled();
  });
});

describe('EntryUsageRegistry', () => {
  it('all() throws until every required module registered, then returns the probes', () => {
    const registry = new EntryUsageRegistry();
    const probe = (module: EntryUsageModule): EntryUsageProbe => ({ module, reasonsFor: async () => [] });
    expect(() => registry.all()).toThrow(/learning, practice, pipeline/);
    registry.register(probe('learning')); registry.register(probe('practice'));
    expect(() => registry.all()).toThrow(/pipeline/);
    registry.register(probe('pipeline'));
    expect(registry.all().map((p) => p.module).sort()).toEqual(['learning', 'pipeline', 'practice']);
  });

  it('registering a module twice replaces the first probe (a hot-reloaded module does not double up)', async () => {
    const registry = new EntryUsageRegistry();
    for (const module of REQUIRED_ENTRY_USAGE_MODULES) registry.register({ module, reasonsFor: async () => [] });
    const replacement: EntryUsageProbe = { module: 'learning', reasonsFor: async () => ['learner-data'] };
    registry.register(replacement);
    expect(registry.all()).toHaveLength(3);
    expect(registry.all()).toContain(replacement);
  });
});
