import { describe, expect, it, vi } from 'vitest';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import {
  catalogPracticeSensesByLemma, practiceCandidates, practiceLemmaMeanings, practiceOtherSenses, practiceRandomMeanings, practiceSenses,
} from './practice-senses.js';

const userId = '00000000-0000-4000-8000-000000000001';
const senseId = '00000000-0000-4000-8000-0000000000a1';
const clientWith = (rows: unknown[] = []) => ({ $queryRaw: vi.fn(async () => rows) });

type Part = { strings: string[]; values: unknown[] };
const render = (parts: string[], vals: unknown[]): string => parts.reduce((out, part, i) => {
  const v = vals[i - 1];
  const inner = typeof v === 'object' && v !== null && 'strings' in v ? render((v as Part).strings, (v as Part).values) : '?';
  return out + inner + part;
});
/** The SQL text of the client's n-th statement, with every bound value as `?`, plus the bound values (nested ones flattened). */
function statement(client: ReturnType<typeof clientWith>, n = 0): { text: string; values: unknown[] } {
  const [strings, ...values] = client.$queryRaw.mock.calls[n] as unknown as [string[], ...unknown[]];
  const flat = (vals: unknown[]): unknown[] => vals.flatMap((v) =>
    typeof v === 'object' && v !== null && 'strings' in v ? flat((v as Part).values) : [v]);
  return { text: render([...strings], values), values: flat(values) };
}

const ROW = {
  sense_id: senseId, entry_id: 'e1', scope: 'catalog', lemma: 'deploy', gloss_vi: 'triển khai', definition_en: 'to put into use',
  form_of_entry_id: null, function_word: false,
  inflections: [{ form: 'deployed', kind: 'past' }],
};

describe('practiceSenses / practiceCandidates — read through the client they are given (PX4)', () => {
  it('PX4: both run their one statement on the given client', async () => {
    const prisma = clientWith();
    const tx = clientWith();
    await practiceSenses(tx as unknown as Prisma.TransactionClient, userId, [senseId], 'vi');
    await practiceCandidates(tx as unknown as Prisma.TransactionClient, userId, [senseId], 'vi');
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    await practiceSenses(prisma as unknown as PrismaClient, userId, [senseId], 'vi');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
  });
});

describe('practiceSenses — the Bước 7 fields (design §4)', () => {
  const senseRow = (patch: Record<string, unknown> = {}) => ({
    ...ROW, pos: 'verb', level: 'B2', live_revision_id: 'r1', extra_forms: ['deployable'], context_label: null,
    examples: [], variants: [], accepted_forms: [], ...patch,
  });

  it('selects the part of speech, the displayed level, the live revision and the forms staff added for lower(lemma)', async () => {
    const client = clientWith();
    await practiceSenses(client as unknown as PrismaClient, userId, [senseId], 'vi');
    const { text } = statement(client);
    expect(text).toMatch(/\be\.pos\b/);
    expect(text).toContain('entry_levels');
    expect(text).toMatch(/s\.live_revision_id::text AS live_revision_id/);
    expect(text).toMatch(/word_form_additions w WHERE w\.lemma_key = lower\(e\.lemma\)/);
  });

  it('maps the row: pos, level, live_revision_id, extra_forms; a private pos "unspecified" reads null', async () => {
    const read = async (patch: Record<string, unknown>) => (await practiceSenses(
      clientWith([senseRow(patch)]) as unknown as PrismaClient, userId, [senseId], 'vi')).get(senseId);
    expect(await read({})).toMatchObject({
      pos: 'verb', level: 'B2', live_revision_id: 'r1', extra_forms: ['deployable'], inflections: [{ form: 'deployed', kind: 'past' }],
    });
    expect((await read({ scope: 'private', pos: 'unspecified', level: null }))).toMatchObject({ pos: null, level: null });
  });
});

describe('practiceCandidates — inflections by kind (design §7.5)', () => {
  it('selects the inflections and returns them on each candidate', async () => {
    const client = clientWith([ROW]);
    const result = await practiceCandidates(client as unknown as PrismaClient, userId, [senseId], 'vi');
    expect(statement(client).text).toContain('FROM entry_inflections i WHERE i.entry_id = e.id');
    expect(result.get(senseId)?.inflections).toEqual([{ form: 'deployed', kind: 'past' }]);
  });
});

describe('practiceOtherSenses — the other visible senses of the same entry (design §7.4, D17)', () => {
  it('one statement on the given client: same entry, not the sense itself, open, live and visible to the viewer', async () => {
    const client = clientWith([{ ...ROW, sense_id: 'other' }]);
    const result = await practiceOtherSenses(client as unknown as Prisma.TransactionClient, userId, senseId, 'vi');
    const { text, values } = statement(client);
    expect(text).toMatch(/s\.entry_id = \(SELECT o\.entry_id FROM senses o WHERE o\.id = \?::uuid\)/);
    expect(text).toMatch(/s\.id <> \?::uuid/);
    expect(text).toMatch(/vs\.state = 'open' AND vs\.live_revision_id IS NOT NULL/);
    expect(values.filter((v) => v === senseId)).toHaveLength(2);
    expect(values).toContain(userId);
    expect(result.map((sense) => sense.sense_id)).toEqual(['other']);
    expect(result[0].meaning).toEqual({ text: 'triển khai', language: 'vi', translation_missing: false });
  });
});

describe('practiceRandomMeanings — a random sample of catalog meanings (design §7.4 step 3)', () => {
  const row = (lemma: string, glossVi: string | null = `nghĩa ${lemma}`) => ({ ...ROW, sense_id: lemma, lemma, gloss_vi: glossVi });

  it('catalog only, open and live, with a Vietnamese gloss, in random order, bounded by count × 4', async () => {
    const client = clientWith();
    await practiceRandomMeanings(client as unknown as PrismaClient, userId, ['deploy'], 3, 'vi');
    const { text, values } = statement(client);
    expect(text).toMatch(/e\.scope = 'catalog'/);
    expect(text).toMatch(/s\.state = 'open' AND s\.live_revision_id IS NOT NULL/);
    expect(text).toMatch(/gloss\.text IS NOT NULL/);
    expect(text).toMatch(/ORDER BY random\(\) LIMIT \?/);
    expect(values).toContain(12);
  });

  it('drops the excluded lemmas (any case) and keeps at most count', async () => {
    const client = clientWith([row('Deploy'), row('bank'), row('river'), row('tree'), row('stone')]);
    const result = await practiceRandomMeanings(client as unknown as PrismaClient, userId, ['deploy'], 3, 'vi');
    expect(result.map((sense) => sense.lemma)).toEqual(['bank', 'river', 'tree']);
  });

  it('count 0 reads nothing', async () => {
    const client = clientWith();
    expect(await practiceRandomMeanings(client as unknown as PrismaClient, userId, [], 0, 'vi')).toEqual([]);
    expect(client.$queryRaw).not.toHaveBeenCalled();
  });
});

describe('practiceLemmaMeanings — scoped so the lemma indexes can be used (T6)', () => {
  it('states the entry scope and open/live conditions on the rows themselves, bounded by the lemmas', async () => {
    const client = clientWith();
    await practiceLemmaMeanings(client as unknown as PrismaClient, userId, ['Quick']);
    const [strings, ...values] = client.$queryRaw.mock.calls[0] as unknown as [string[], ...unknown[]];
    const text = render([...strings], values);
    expect(text).toMatch(/\be\.scope = 'catalog'/);
    expect(text).toMatch(/\be\.owner_user_id/);
    expect(text).toMatch(/\bs\.state = 'open'/);
    expect(text).toContain('lower(e.lemma) = ANY');
    expect(values).toContainEqual(['quick']);
  });
});

describe('catalogPracticeSensesByLemma — catalog senses of a lemma for eval rules (nhóm B M1-T6)', () => {
  const senseRow = (patch: Record<string, unknown> = {}) => ({
    ...ROW, pos: 'verb', level: 'B2', live_revision_id: 'r1', extra_forms: [], context_label: null, examples: [], variants: [], accepted_forms: [], ...patch,
  });

  it('Review focus 1: the lemma is trimmed and compared in lower case on catalog entries only; open senses with a live revision', async () => {
    const client = clientWith();
    await catalogPracticeSensesByLemma(client as unknown as PrismaClient, ' Deploy ', 'verb', 'vi');
    const { text, values } = statement(client);
    expect(text).toContain("e.scope = 'catalog'");
    expect(text).toContain('lower(e.lemma) = lower(?)');
    expect(text).toContain('e.pos = ?');
    expect(text).toContain("s.state = 'open'");
    expect(text).toContain('s.live_revision_id IS NOT NULL');
    expect(text).toMatch(/ORDER BY e\.pos, s\.created_at, s\.id$/);
    expect(values).toContain('Deploy');
    expect(values).toContain('verb');
    expect(values).not.toContain(' Deploy ');
  });

  it('a null part of speech takes every part of speech of the lemma', async () => {
    const client = clientWith();
    await catalogPracticeSensesByLemma(client as unknown as PrismaClient, 'run', null, 'vi');
    const { text, values } = statement(client);
    expect(text).not.toContain('e.pos = ?');
    expect(values).toContain('run');
  });

  it('it is no viewer query: private entries are never read', async () => {
    const client = clientWith();
    await catalogPracticeSensesByLemma(client as unknown as PrismaClient, 'run', null, 'vi');
    expect(statement(client).text).not.toContain('owner_user_id');
  });

  it('a blank lemma reads nothing', async () => {
    const client = clientWith();
    expect(await catalogPracticeSensesByLemma(client as unknown as PrismaClient, '   ', null, 'vi')).toEqual([]);
    expect(client.$queryRaw).not.toHaveBeenCalled();
  });

  it('a returned row maps to the object practiceSenses builds for it, in the query order', async () => {
    const rows = [senseRow(), senseRow({ sense_id: 'other', pos: 'noun', lemma: 'deploy' })];
    const list = await catalogPracticeSensesByLemma(clientWith(rows) as unknown as PrismaClient, 'deploy', null, 'vi');
    const one = (await practiceSenses(clientWith([senseRow()]) as unknown as PrismaClient, userId, [senseId], 'vi')).get(senseId);
    expect(list.map((sense) => sense.sense_id)).toEqual([senseId, 'other']);
    expect(list[0]).toEqual(one);
  });
});
