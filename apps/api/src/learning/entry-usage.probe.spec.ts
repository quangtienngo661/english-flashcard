import { describe, expect, it, vi } from 'vitest';
import type { ContentService, EntryUsageProbe, EntryUsageScope } from '../content/index.js';
import type { Prisma } from '../generated/prisma/client.js';
import { LearningEntryUsageProbe } from './entry-usage.probe.js';

const scope = (over: Partial<EntryUsageScope> = {}): EntryUsageScope => ({
  entryId: 'e1', lemma: 'deploy', pos: 'verb', senseIds: ['s1', 's2'], revisionIds: [], variantIds: [], levelIds: [], ...over,
});

function setup(rows: { item?: boolean; log?: boolean } = {}) {
  const tx = {
    learningItem: { findFirst: vi.fn(async () => (rows.item ? { id: 'i1' } : null)) },
    learningLogEntry: { findFirst: vi.fn(async () => (rows.log ? { id: 'l1' } : null)) },
  };
  const register = vi.fn();
  const probe = new LearningEntryUsageProbe({ registerEntryUsageProbe: register } as unknown as ContentService);
  return { tx, probe, register, reasons: (s: EntryUsageScope = scope()) => probe.reasonsFor(tx as unknown as Prisma.TransactionClient, s) };
}

describe('LearningEntryUsageProbe (Bước 3 tables refer to a sense by a plain id)', () => {
  it('registers itself with Content when the module starts', () => {
    const { probe, register } = setup();
    probe.onModuleInit();
    expect(register).toHaveBeenCalledWith(probe);
    expect(probe.module).toBe('learning');
  });

  it('control: nothing refers to the senses → no reason', async () => {
    const { reasons, tx } = setup();
    expect(await reasons()).toEqual([]);
    expect(tx.learningItem.findFirst).toHaveBeenCalledWith({ where: { senseId: { in: ['s1', 's2'] } }, select: { id: true } });
    expect(tx.learningLogEntry.findFirst).toHaveBeenCalledWith({ where: { senseId: { in: ['s1', 's2'] } }, select: { id: true } });
  });

  it('a learner holds a sense in a schedule (learning_items) → learner-data', async () => {
    expect(await setup({ item: true }).reasons()).toEqual(['learner-data']);
  });

  it('only the append-only log still mentions a sense (the item was removed, D33) → learner-data', async () => {
    expect(await setup({ log: true }).reasons()).toEqual(['learner-data']);
  });

  it('an entry without senses is not looked up at all', async () => {
    const { reasons, tx } = setup({ item: true, log: true });
    expect(await reasons(scope({ senseIds: [] }))).toEqual([]);
    expect(tx.learningItem.findFirst).not.toHaveBeenCalled();
    expect(tx.learningLogEntry.findFirst).not.toHaveBeenCalled();
  });

  it('implements the port Content defines', () => {
    const probe: EntryUsageProbe = setup().probe;
    expect(probe.module).toBe('learning');
  });
});
