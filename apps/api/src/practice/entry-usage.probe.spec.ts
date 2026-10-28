import { describe, expect, it, vi } from 'vitest';
import type { ContentService, EntryUsageScope } from '../content/index.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PracticeEntryUsageProbe } from './entry-usage.probe.js';

const SENSES = ['s1', 's2'];
const scope = (over: Partial<EntryUsageScope> = {}): EntryUsageScope => ({
  entryId: 'e1', lemma: 'deploy', pos: 'verb', senseIds: SENSES, revisionIds: [], variantIds: [], levelIds: [], ...over,
});

/** Every Practice table or array column that holds a sense id (Bước 4 and 7 models). */
const TABLES = ['practiceSession', 'practiceQuestion', 'practiceSessionItem', 'practiceReport', 'practiceAiRequest', 'practiceWordCheck'] as const;
type Table = (typeof TABLES)[number];

function setup(hit?: Table) {
  const tx = Object.fromEntries(TABLES.map((table) => [table, { findFirst: vi.fn(async () => (table === hit ? { id: 'x' } : null)) }])) as
    Record<Table, { findFirst: ReturnType<typeof vi.fn> }>;
  const register = vi.fn();
  const probe = new PracticeEntryUsageProbe({ registerEntryUsageProbe: register } as unknown as ContentService);
  return { tx, probe, register, reasons: (s: EntryUsageScope = scope()) => probe.reasonsFor(tx as unknown as Prisma.TransactionClient, s) };
}

describe('PracticeEntryUsageProbe (Bước 4 and 7 tables refer to a sense by a plain id)', () => {
  it('registers itself with Content when the module starts', () => {
    const { probe, register } = setup();
    probe.onModuleInit();
    expect(register).toHaveBeenCalledWith(probe);
    expect(probe.module).toBe('practice');
  });

  it('control: nothing refers to the senses → no reason, and every table was looked at', async () => {
    const { reasons, tx } = setup();
    expect(await reasons()).toEqual([]);
    for (const table of TABLES) expect(tx[table].findFirst, table).toHaveBeenCalledTimes(1);
  });

  it.each(TABLES)('a row of %s that holds one of the senses → learner-data', async (table) => {
    expect(await setup(table).reasons()).toEqual(['learner-data']);
  });

  it('the columns checked: session sense_ids and ai_sense_ids, question sense_id and distractor_sense_ids, and sense_id of items, reports, AI requests, word checks', async () => {
    const { reasons, tx } = setup();
    await reasons();
    const where = (table: Table) => (tx[table].findFirst.mock.calls[0][0] as { where: unknown }).where;
    expect(where('practiceSession')).toEqual({ OR: [{ senseIds: { hasSome: SENSES } }, { aiSenseIds: { hasSome: SENSES } }] });
    expect(where('practiceQuestion')).toEqual({ OR: [{ senseId: { in: SENSES } }, { distractorSenseIds: { hasSome: SENSES } }] });
    for (const table of ['practiceSessionItem', 'practiceReport', 'practiceAiRequest', 'practiceWordCheck'] as const) {
      expect(where(table), table).toEqual({ senseId: { in: SENSES } });
    }
  });

  it('a question made from one of the entry\'s revisions (sense_revision_id) is checked too, when the entry has revisions', async () => {
    const { reasons, tx } = setup();
    await reasons(scope({ revisionIds: ['r1', 'r2'] }));
    const { where } = tx.practiceQuestion.findFirst.mock.calls[0][0] as { where: unknown };
    expect(where).toEqual({ OR: [
      { senseId: { in: SENSES } }, { distractorSenseIds: { hasSome: SENSES } }, { senseRevisionId: { in: ['r1', 'r2'] } },
    ] });
  });

  it('an entry without senses is not looked up at all', async () => {
    const { reasons, tx } = setup('practiceQuestion');
    expect(await reasons(scope({ senseIds: [] }))).toEqual([]);
    for (const table of TABLES) expect(tx[table].findFirst, table).not.toHaveBeenCalled();
  });
});
