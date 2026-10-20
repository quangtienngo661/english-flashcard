import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { EntriesService } from './entries.service.js';
import { revertRecords, type RevertRecord } from './revert.service.js';

const ENTRY = 'e1';

/** Fake client: every tx call is appended to `calls` in order, so tests can assert the statement order. */
function setup(opts: { reviewedAt?: Date | null; formOfRef?: boolean; levels?: Array<{ id: string; basis: string }> } = {}) {
  const calls: string[] = [];
  const levels = opts.levels ?? [];
  const tx = {
    $queryRaw: vi.fn(async (strings: TemplateStringsArray) => { calls.push(`$queryRaw:${strings.join('?').replace(/\s+/g, ' ').trim()}`); return [{ id: ENTRY }]; }),
    entry: {
      findUnique: vi.fn(async () => { calls.push('entry.findUnique'); return { inflectionsReviewedAt: opts.reviewedAt ?? null }; }),
      deleteMany: vi.fn(async () => { calls.push('entry.deleteMany'); return { count: 1 }; }),
    },
    senseRevision: {
      findFirst: vi.fn(async () => { calls.push('senseRevision.findFirst'); return opts.formOfRef ? { id: 'r1' } : null; }),
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

describe('revertRecords entry/level protection', () => {
  it('control: a plain imported entry is deleted', async () => {
    const { prisma, entries, tx } = setup();
    const report = await revertRecords(prisma, entries, entryRecord);
    expect(report.removed.entry).toBe(1);
    expect(report.skipped).toEqual([]);
    expect(tx.entry.deleteMany).toHaveBeenCalled();
  });

  it('T2: an entry with a reviewed inflection set is kept as entry-in-use', async () => {
    const { prisma, entries, tx } = setup({ reviewedAt: new Date() });
    const report = await revertRecords(prisma, entries, entryRecord);
    expect(report.skipped).toContainEqual({ type: 'entry', id: ENTRY, reason: 'entry-in-use' });
    expect(report.removed.entry).toBe(0);
    expect(tx.entry.deleteMany).not.toHaveBeenCalled();
  });

  it('T2: an entry a private word points at with form_of is kept', async () => {
    const { prisma, entries, tx } = setup({ formOfRef: true });
    const report = await revertRecords(prisma, entries, entryRecord);
    expect(report.skipped).toContainEqual({ type: 'entry', id: ENTRY, reason: 'entry-in-use' });
    expect(tx.entry.deleteMany).not.toHaveBeenCalled();
  });

  it('M5: a level confirmed by staff after the import is kept as level-confirmed', async () => {
    const { prisma, entries, tx } = setup({ levels: [{ id: 'l1', basis: 'editorial' }, { id: 'l2', basis: 'imported' }] });
    const report = await revertRecords(prisma, entries, [{ type: 'level', id: 'l1' }, { type: 'level', id: 'l2' }]);
    expect(report.skipped).toContainEqual({ type: 'level', id: 'l1', reason: 'level-confirmed' });
    expect(report.removed.level).toBe(1);
    expect(tx.entryLevel.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('FE22: revert locks the entry row before any check', async () => {
    const { prisma, entries, calls } = setup();
    await revertRecords(prisma, entries, entryRecord);
    expect(calls[0]).toBe('lockEntryKey');
    expect(calls[1]).toMatch(/^\$queryRaw:.*SELECT id FROM entries WHERE id = \?.*FOR UPDATE/);
    expect(calls.indexOf('entry.deleteMany')).toBeGreaterThan(1);
  });
});
