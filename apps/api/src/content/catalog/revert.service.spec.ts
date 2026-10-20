import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { EntriesService } from './entries.service.js';
import { revertRecords, type RevertContext, type RevertRecord } from './revert.service.js';

const ENTRY = 'e1';

/** Fake client: every tx call is appended to `calls` in order, so tests can assert the statement order. */
function setup(opts: { reviewedAt?: Date | null; formOfRefs?: string[]; levels?: Array<{ id: string; basis: string }> } = {}) {
  const calls: string[] = [];
  const levels = opts.levels ?? [];
  const refs = [...(opts.formOfRefs ?? [])].sort();
  const tx = {
    $queryRaw: vi.fn(async (strings: TemplateStringsArray) => { calls.push(`$queryRaw:${strings.join('?').replace(/\s+/g, ' ').trim()}`); return [{ id: ENTRY }]; }),
    entry: {
      findUnique: vi.fn(async () => { calls.push('entry.findUnique'); return { inflectionsReviewedAt: opts.reviewedAt ?? null }; }),
      deleteMany: vi.fn(async () => { calls.push('entry.deleteMany'); return { count: 1 }; }),
    },
    senseRevision: {
      // Revisions pointing at ENTRY with form_of; honours id filters so own-batch exclusions are real.
      findFirst: vi.fn(async (args: { where: { id?: { notIn?: string[] } } }) => {
        calls.push('senseRevision.findFirst');
        const id = refs.find((ref) => !args.where.id?.notIn?.includes(ref));
        return id === undefined ? null : { id };
      }),
      findMany: vi.fn(async (args: { where: { id?: { gt?: string } }; take?: number }) => {
        calls.push('senseRevision.findMany');
        return refs.filter((ref) => args.where.id?.gt === undefined || ref > args.where.id.gt).slice(0, args.take).map((id) => ({ id }));
      }),
    },
    sense: { findFirst: vi.fn(async () => { calls.push('sense.findFirst'); return null; }) },
    entryLevel: {
      findMany: vi.fn(async () => { calls.push('entryLevel.findMany'); return levels; }),
      deleteMany: vi.fn(async () => { calls.push('entryLevel.deleteMany'); return { count: 1 }; }),
    },
    entryVariant: { deleteMany: vi.fn(async () => ({ count: 0 })) },
  };
  const prisma = {
    entry: {
      findMany: vi.fn(async (args: { where: { scope?: string } }) => args.where.scope
        ? [{ id: ENTRY, lemma: 'run', pos: 'verb' }] : [{ id: ENTRY }]),
    },
    entryLevel: { findMany: vi.fn(async () => levels.map((level) => ({ id: level.id, entryId: ENTRY }))) },
    $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
  } as unknown as PrismaClient;
  const entries = { lockEntryKey: vi.fn(async () => { calls.push('lockEntryKey'); }) } as unknown as EntriesService;
  return { tx, prisma, entries, calls };
}

const entryRecord: RevertRecord[] = [{ type: 'entry', id: ENTRY }];
const FINISHED = new Date('2026-10-20T10:00:00.000Z');
const ctx = (over: Partial<RevertContext> = {}): RevertContext => ({ batchFinishedAt: FINISHED, ownRevisionIds: new Set(), ...over });

describe('revertRecords entry/level protection', () => {
  it('control: a plain imported entry is deleted', async () => {
    const { prisma, entries, tx } = setup();
    const report = await revertRecords(prisma, entries, entryRecord, ctx());
    expect(report.removed.entry).toBe(1);
    expect(report.skipped).toEqual([]);
    expect(tx.entry.deleteMany).toHaveBeenCalled();
  });

  it('T2: an entry whose reviewed inflection set is newer than the batch is kept as entry-in-use', async () => {
    const { prisma, entries, tx } = setup({ reviewedAt: new Date(FINISHED.getTime() + 60_000) });
    const report = await revertRecords(prisma, entries, entryRecord, ctx());
    expect(report.skipped).toContainEqual({ type: 'entry', id: ENTRY, reason: 'entry-in-use' });
    expect(report.removed.entry).toBe(0);
    expect(tx.entry.deleteMany).not.toHaveBeenCalled();
  });

  it('a reviewed inflection set the batch itself wrote (before it finished) does not keep the entry', async () => {
    const { prisma, entries, tx } = setup({ reviewedAt: new Date(FINISHED.getTime() - 60_000) });
    const report = await revertRecords(prisma, entries, entryRecord, ctx());
    expect(report).toMatchObject({ removed: { entry: 1 }, skipped: [] });
    expect(tx.entry.deleteMany).toHaveBeenCalled();
  });

  it('a batch without finishedAt treats the reviewed inflection set as its own', async () => {
    const { prisma, entries } = setup({ reviewedAt: new Date() });
    const report = await revertRecords(prisma, entries, entryRecord, ctx({ batchFinishedAt: null }));
    expect(report).toMatchObject({ removed: { entry: 1 }, skipped: [] });
  });

  it('T2: an entry a revision outside the batch (another batch, a private word) points at with form_of is kept', async () => {
    const { prisma, entries, tx } = setup({ formOfRefs: ['r-mine', 'r-other'] });
    const report = await revertRecords(prisma, entries, entryRecord, ctx({ ownRevisionIds: new Set(['r-mine']) }));
    expect(report.skipped).toContainEqual({ type: 'entry', id: ENTRY, reason: 'entry-in-use' });
    expect(tx.entry.deleteMany).not.toHaveBeenCalled();
  });

  it('M5: a level confirmed by staff after the import is kept as level-confirmed', async () => {
    const { prisma, entries, tx } = setup({ levels: [{ id: 'l1', basis: 'editorial' }, { id: 'l2', basis: 'imported' }] });
    const report = await revertRecords(prisma, entries, [{ type: 'level', id: 'l1' }, { type: 'level', id: 'l2' }], ctx());
    expect(report.skipped).toContainEqual({ type: 'level', id: 'l1', reason: 'level-confirmed' });
    expect(report.removed.level).toBe(1);
    expect(tx.entryLevel.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('FE22: revert locks the entry row before any check', async () => {
    const { prisma, entries, calls } = setup();
    await revertRecords(prisma, entries, entryRecord, ctx());
    expect(calls[0]).toBe('lockEntryKey');
    expect(calls[1]).toMatch(/^\$queryRaw:.*SELECT id FROM entries WHERE id = \?.*FOR UPDATE/);
    expect(calls.indexOf('entry.deleteMany')).toBeGreaterThan(1);
  });
});

type Where = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Rev = { id: string; senseId: string; status: string; publishedAt: Date | null; revisionNo: number; formOfEntryId: string | null };

/** Small stateful fake of the content tables one fresh batch touches: entries "go" and "went", one sense and one
 * draft revision each, "went"'s revision pointing at "go" with form_of, both inflection sets reviewed by the batch. */
function batchWorld(goId: string, wentId: string) {
  const reviewedAt = new Date(FINISHED.getTime() - 60_000);
  const entryRows = new Map([
    [goId, { id: goId, lemma: 'go', pos: 'verb', inflectionsReviewedAt: reviewedAt }],
    [wentId, { id: wentId, lemma: 'went', pos: 'verb', inflectionsReviewedAt: reviewedAt }],
  ]);
  const senseRows = new Map([
    ['s-go', { id: 's-go', entryId: goId, liveRevisionId: null, replacesSenseId: null as string | null }],
    ['s-went', { id: 's-went', entryId: wentId, liveRevisionId: null, replacesSenseId: null as string | null }],
  ]);
  const revRows = new Map<string, Rev>([
    ['r-go', { id: 'r-go', senseId: 's-go', status: 'draft', publishedAt: null, revisionNo: 1, formOfEntryId: null }],
    ['r-went', { id: 'r-went', senseId: 's-went', status: 'draft', publishedAt: null, revisionNo: 1, formOfEntryId: goId }],
  ]);
  const idMatches = (id: string, cond: unknown): boolean => {
    if (cond === undefined) return true;
    if (typeof cond === 'string') return id === cond;
    const c = cond as { in?: string[]; notIn?: string[]; gt?: string };
    return (!c.in || c.in.includes(id)) && (!c.notIn || !c.notIn.includes(id)) && (c.gt === undefined || id > c.gt);
  };
  const revMatches = (r: Rev, w: Where) => idMatches(r.id, w.id)
    && (w.formOfEntryId === undefined || r.formOfEntryId === w.formOfEntryId)
    && (w.senseId === undefined || r.senseId === w.senseId)
    && (w.sense?.entryId === undefined || senseRows.get(r.senseId)?.entryId === w.sense.entryId);
  const revs = (args: { where: Where; orderBy?: unknown; take?: number }) => {
    const newestFirst = JSON.stringify(args.orderBy ?? '').includes('revisionNo');
    const list = [...revRows.values()].filter((r) => revMatches(r, args.where))
      .sort((a, b) => (newestFirst ? b.revisionNo - a.revisionNo : 0) || a.id.localeCompare(b.id))
      .map((r) => ({ ...r, sense: { entryId: senseRows.get(r.senseId)!.entryId } }));
    return args.take === undefined ? list : list.slice(0, args.take);
  };
  const db = {
    $queryRaw: vi.fn(async () => []),
    $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(db)),
    entry: {
      findMany: vi.fn(async ({ where }: { where: Where }) => [...entryRows.values()].filter((e) => idMatches(e.id, where.id))),
      findUnique: vi.fn(async ({ where }: { where: Where }) => entryRows.get(where.id) ?? null),
      deleteMany: vi.fn(async ({ where }: { where: Where }) => {
        if (!entryRows.has(where.id) || [...senseRows.values()].some((s) => s.entryId === where.id)) return { count: 0 };
        entryRows.delete(where.id);
        for (const r of revRows.values()) if (r.formOfEntryId === where.id) r.formOfEntryId = null; // onDelete: SetNull
        return { count: 1 };
      }),
    },
    sense: {
      findMany: vi.fn(async ({ where }: { where: Where }) => [...senseRows.values()]
        .filter((s) => idMatches(s.id, where.id) && (where.entryId === undefined || s.entryId === where.entryId))
        .map((s) => ({ ...s, _count: { revisions: [...revRows.values()].filter((r) => r.senseId === s.id).length,
          replacements: [...senseRows.values()].filter((o) => o.replacesSenseId === s.id).length } }))),
      findFirst: vi.fn(async () => null),
      deleteMany: vi.fn(async ({ where }: { where: Where }) => ({ count: senseRows.delete(where.id) ? 1 : 0 })),
    },
    senseRevision: {
      findMany: vi.fn(async (args: { where: Where; orderBy?: unknown; take?: number }) => revs(args)),
      findFirst: vi.fn(async (args: { where: Where; orderBy?: unknown }) => revs(args)[0] ?? null),
      deleteMany: vi.fn(async ({ where }: { where: Where }) => ({ count: revRows.delete(where.id) ? 1 : 0 })),
    },
    entryLevel: { findMany: vi.fn(async () => []), deleteMany: vi.fn(async () => ({ count: 0 })) },
    entryVariant: { findMany: vi.fn(async () => []), deleteMany: vi.fn(async () => ({ count: 0 })) },
  };
  const records: RevertRecord[] = [
    { type: 'entry', id: goId }, { type: 'entry', id: wentId }, { type: 'sense', id: 's-go' }, { type: 'sense', id: 's-went' },
    { type: 'revision', id: 'r-go' }, { type: 'revision', id: 'r-went' },
  ];
  const entries = { lockEntryKey: vi.fn(async () => undefined) } as unknown as EntriesService;
  return { prisma: db as unknown as PrismaClient, entries, records, entryRows };
}

describe('revertRecords of a fresh batch (its own inflections and form_of links)', () => {
  it.each([
    ['"go" first', 'e-a', 'e-b'],
    ['"went" first', 'e-b', 'e-a'],
  ])('a batch with an inflections cell and an internal "went -> go" pair reverts cleanly (%s)', async (_order, goId, wentId) => {
    const world = batchWorld(goId, wentId);
    const report = await revertRecords(world.prisma, world.entries, world.records,
      ctx({ ownRevisionIds: new Set(['r-go', 'r-went']) }));
    expect(report.skipped).toEqual([]);
    expect(report.removed).toEqual({ entry: 2, variant: 0, level: 0, sense: 2, revision: 2 });
    expect(world.entryRows.size).toBe(0);
  });
});
