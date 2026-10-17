import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ContentService, type InflectionKind, type Level, type RevisionContent } from '../../src/content/index.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { testConfig } from '../support/test-config.js';

const transactionOptions = { timeout: 30_000, maxWait: 5_000 };
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;
type Seeded = { entryId: string; senseId: string };
type WordSense = { sense_id: string; entry_id: string; scope: string; lemma: string; pos: string; level: Level | null;
  context_label: string | null; meaning: { text: string; language: string; translation_missing: boolean };
  definition_en: string | null; examples: string[]; topics: Array<{ code: string; name: string }>;
  form_of: { entry_id: string; lemma: string; pos: string; kind: string } | null };

describe('word pages, headword search and lookup (e2e, isolated database)', () => {
  let ctx: TestApp;
  let content: ContentService;
  let actorId: string;
  let aId: string;
  let aToken: string;
  let bId: string;
  let bToken: string;

  const tx = <T>(action: (tx: Prisma.TransactionClient) => Promise<T>) => ctx.prisma.$transaction(action, transactionOptions);
  const catalog = async (lemma: string, pos: string, options: {
    level?: Level | null; gloss?: string; label?: string | null; topics?: string[]; formOf?: { entryId: string; kind: InflectionKind };
    publish?: boolean; variants?: string[];
  } = {}): Promise<Seeded> => {
    const ids = await tx(async (t) => {
      await content.lockEntryKey(t, lemma, pos);
      const { entry } = await content.ensureEntry(t, { lemma, pos, variants: options.variants ?? [] });
      if (options.level !== null) await content.setEditorialLevel(t, entry.id, options.level ?? 'A1');
      const sense = await content.createSense(t, { entryId: entry.id, contextLabel: options.label ?? null, source: 'ui', actorId,
        content: { glossVi: options.gloss ?? `nghĩa ${lemma}`, definitionEn: `Meaning of ${lemma}.`, examplesEn: [`An example of ${lemma}.`],
          topicCodes: options.topics ?? [], acceptedForms: [], ...(options.formOf ? { formOf: options.formOf } : {}) } satisfies RevisionContent });
      return { entryId: entry.id, senseId: sense.senseId };
    });
    if (options.publish !== false) expect(await content.publishItem({ senseId: ids.senseId, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    return ids;
  };
  const mine = (ownerId: string, lemma: string, options: { pos?: string | null; level?: Level | null; meaning?: string;
    formOf?: { entryId: string; kind: InflectionKind } } = {}) => tx((t) => content.createPrivateSense(t, {
    ownerId, lemma, pos: options.pos === undefined ? 'verb' : options.pos, meaning: { text: options.meaning ?? `riêng ${lemma}`, language: 'vi' },
    level: options.level ?? null, topicCodes: [], formOf: options.formOf ?? null,
  }));
  const inflect = (entryId: string, forms: Array<{ form: string; kind: InflectionKind }>, source: 'library' | 'reviewed' = 'reviewed') =>
    tx((t) => content.replaceInflections(t, entryId, source, forms));
  const get = (path: string, query: object = {}, token = aToken) =>
    ctx.http().get(path).set('Authorization', `Bearer ${token}`).query(query);
  const senseIds = (senses: WordSense[]) => senses.map(({ sense_id }) => sense_id);

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), config: testConfig() });
    content = ctx.app.get(ContentService);
  });
  beforeEach(async () => {
    await resetCatalog(ctx.prisma);
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(new Date('2026-10-17T12:00:00Z'));
    actorId = (await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' })).userId;
    aId = (await seedUser(ctx.prisma, { nativeLanguage: 'vi' })).userId;
    aToken = (await startSession(ctx, aId)).accessToken;
    bId = (await seedUser(ctx.prisma, { nativeLanguage: 'vi' })).userId;
    bToken = (await startSession(ctx, bId)).accessToken;
  });
  afterAll(async () => { await ctx?.close(); });

  it('B3#10: lookup "went" returns the went sense and via_inflection go/past', async () => {
    const go = await catalog('go', 'verb');
    await inflect(go.entryId, [{ form: 'went', kind: 'past' }, { form: 'gone', kind: 'past_participle' }]);
    const went = await catalog('went', 'verb', { formOf: { entryId: go.entryId, kind: 'past' } });
    const res = await get('/v1/lookup', { q: ' WENT ' });
    expect(res.status).toBe(200);
    expect(senseIds(res.body.senses)).toEqual([went.senseId]);
    expect(res.body.senses[0]).toMatchObject({ scope: 'catalog', lemma: 'went', pos: 'verb', level: 'A1', context_label: null,
      meaning: { text: 'nghĩa went', language: 'vi', translation_missing: false },
      form_of: { entry_id: go.entryId, lemma: 'go', pos: 'verb', kind: 'past' } });
    expect(res.body.via_inflection).toEqual([{ kind: 'past', base: { entry_id: go.entryId, lemma: 'go', pos: 'verb' },
      senses: [expect.objectContaining({ sense_id: go.senseId })] }]);
  });

  it('B3E13: lookup "leaves" → leaf (plural) and leave (third_person)', async () => {
    const leaf = await catalog('leaf', 'noun');
    const leave = await catalog('leave', 'verb');
    await inflect(leaf.entryId, [{ form: 'leaves', kind: 'plural' }]);
    await inflect(leave.entryId, [{ form: 'leaves', kind: 'third_person' }]);
    const res = await get('/v1/lookup', { q: 'leaves' });
    expect(res.body.senses).toEqual([]);
    expect(res.body.via_inflection.map(({ kind, base }: { kind: string; base: { lemma: string } }) => [base.lemma, kind]))
      .toEqual([['leaf', 'plural'], ['leave', 'third_person']]);
  });

  it('B3E14: lookup "deployed" with no deployed entry → deploy (past, past_participle)', async () => {
    const deploy = await catalog('deploy', 'verb');
    await inflect(deploy.entryId, [{ form: 'deployed', kind: 'past' }, { form: 'deployed', kind: 'past_participle' }], 'library');
    const res = await get('/v1/lookup', { q: 'deployed' });
    expect(res.body.senses).toEqual([]);
    expect(res.body.via_inflection.map(({ kind, senses }: { kind: string; senses: WordSense[] }) => [kind, senseIds(senses)]))
      .toEqual([['past', [deploy.senseId]], ['past_participle', [deploy.senseId]]]);
  });

  it('B3E15: an unknown form → empty arrays; a bad q → 400', async () => {
    await catalog('deploy', 'verb');
    expect((await get('/v1/lookup', { q: 'zzzz' })).body).toEqual({ senses: [], via_inflection: [] });
    for (const q of ['', '   ', 'a'.repeat(101)]) expect((await get('/v1/lookup', { q })).status).toBe(400);
    expect((await get('/v1/lookup')).status).toBe(400);
  });

  it('B3#11: GET /v1/words/left shows every pos of left and only the verb sense has form_of leave/past', async () => {
    const leave = await catalog('leave', 'verb');
    const verb = await catalog('left', 'verb', { formOf: { entryId: leave.entryId, kind: 'past' } });
    const adjective = await catalog('left', 'adjective', { gloss: 'bên trái' });
    const noun = await catalog('left', 'noun', { gloss: 'phía trái' });
    const res = await get('/v1/words/left');
    expect(res.status).toBe(200);
    expect(res.body.lemma).toBe('left');
    expect(res.body.sections.map(({ pos, senses }: { pos: string; senses: WordSense[] }) => [pos, senseIds(senses)])).toEqual([
      ['noun', [noun.senseId]], ['verb', [verb.senseId]], ['adjective', [adjective.senseId]]]);
    const forms = res.body.sections.flatMap(({ senses }: { senses: WordSense[] }) => senses.map(({ form_of }) => form_of));
    expect(forms).toEqual([null, { entry_id: leave.entryId, lemma: 'leave', pos: 'verb', kind: 'past' }, null]);
    expect((await get('/v1/words/nothing-here')).status).toBe(404);
  });

  it('the go page lists goes, going, went, gone with has_page true for went', async () => {
    const go = await catalog('go', 'verb');
    await inflect(go.entryId, [
      { form: 'goes', kind: 'third_person' }, { form: 'going', kind: 'present_participle' },
      { form: 'went', kind: 'past' }, { form: 'gone', kind: 'past_participle' }]);
    await catalog('went', 'verb', { formOf: { entryId: go.entryId, kind: 'past' } });
    await catalog('gone', 'adjective', { publish: false });
    const res = await get('/v1/words/go');
    expect(res.body.inflections).toEqual([
      { kind: 'third_person', form: 'goes', has_page: false }, { kind: 'present_participle', form: 'going', has_page: false },
      { kind: 'past', form: 'went', has_page: true }, { kind: 'past_participle', form: 'gone', has_page: false }]);
  });

  it('D42: March (noun) and march (verb) are two rows in GET /v1/words?q=march, two pages, and lookup "march" returns both', async () => {
    const month = await catalog('March', 'noun', { gloss: 'tháng ba' });
    const walk = await catalog('march', 'verb', { gloss: 'diễu hành' });
    const list = await get('/v1/words', { q: 'march' });
    expect(list.status).toBe(200);
    expect(list.body.items.map(({ lemma, pos_list }: { lemma: string; pos_list: string[] }) => [lemma, pos_list]))
      .toEqual([['March', ['noun']], ['march', ['verb']]]);
    expect(senseIds((await get('/v1/words/March')).body.sections[0].senses)).toEqual([month.senseId]);
    expect(senseIds((await get('/v1/words/march')).body.sections[0].senses)).toEqual([walk.senseId]);
    expect(senseIds((await get('/v1/lookup', { q: 'march' })).body.senses).sort()).toEqual([month.senseId, walk.senseId].sort());
  });

  it('GET /v1/words ranks exact → prefix → contains on lemma and variants, groups by lemma and pages with bound tokens', async () => {
    await catalog('bank', 'noun', { gloss: 'ngân hàng' });
    await catalog('bank', 'verb', { gloss: 'gửi tiền' });
    await catalog('banking', 'noun');
    await catalog('riverbank', 'noun');
    await catalog('colour', 'noun', { variants: ['bankcolor'] });
    await mine(aId, 'bank', { pos: 'noun', meaning: 'bờ sông của tôi' });
    const first = await get('/v1/words', { q: 'bank', page_size: 2 });
    expect(first.body.items).toEqual([
      { lemma: 'bank', pos_list: ['noun', 'verb'], level: 'A1', meaning_preview: 'ngân hàng', has_private: true },
      expect.objectContaining({ lemma: 'banking' }),
    ]);
    const second = await get('/v1/words', { q: 'bank', page_size: 2, page_token: first.body.next_page_token });
    expect(second.body.items.map(({ lemma }: { lemma: string }) => lemma)).toEqual(['colour', 'riverbank']);
    expect(second.body.next_page_token).toBeNull();
    // A token is bound to its query.
    expect((await get('/v1/words', { q: 'other', page_token: first.body.next_page_token })).status).toBe(400);
    // Another learner does not see A's private row.
    expect((await get('/v1/words', { q: 'bank' }, bToken)).body.items[0]).toMatchObject({ lemma: 'bank', has_private: false });
  });

  it('B3#12 (words): learner B never sees A\'s private entries through /v1/words, /v1/words/:lemma, /v1/lookup or mine=true', async () => {
    const yeet = await mine(aId, 'yeet');
    await inflect(yeet.entryId, [{ form: 'yeeted', kind: 'past' }], 'library');
    expect((await get('/v1/words', { q: 'yeet' })).body.items).toEqual([
      { lemma: 'yeet', pos_list: ['verb'], level: null, meaning_preview: 'riêng yeet', has_private: true }]);
    expect((await get('/v1/words', { mine: 'true' })).body.items.map(({ lemma }: { lemma: string }) => lemma)).toEqual(['yeet']);
    const page = await get('/v1/words/yeet');
    expect(page.body.sections[0].senses).toEqual([expect.objectContaining({ sense_id: yeet.senseId, scope: 'private', context_label: null })]);
    expect((await get('/v1/lookup', { q: 'yeeted' })).body.via_inflection).toHaveLength(1);
    expect((await get('/v1/words', { q: 'yeet' }, bToken)).body.items).toEqual([]);
    expect((await get('/v1/words', { mine: 'true' }, bToken)).body.items).toEqual([]);
    const foreign = await get('/v1/words/yeet', {}, bToken);
    expect(foreign.status).toBe(404);
    expect(foreign.body.type).toBe(problem('not-found'));
    expect((await get('/v1/lookup', { q: 'yeet' }, bToken)).body).toEqual({ senses: [], via_inflection: [] });
    expect((await get('/v1/lookup', { q: 'yeeted' }, bToken)).body).toEqual({ senses: [], via_inflection: [] });
    // Private context labels (p2, p3) are internal.
    await mine(aId, 'yeet', { meaning: 'nghĩa thứ hai' });
    expect((await get('/v1/words/yeet')).body.sections[0].senses.map(({ context_label }: WordSense) => context_label)).toEqual([null, null]);
  });

  it('the level filter uses the displayed level, derived included', async () => {
    const go = await catalog('go', 'verb', { level: 'A1' });
    const went = await catalog('went', 'verb', { level: null, publish: false, formOf: { entryId: go.entryId, kind: 'past' } });
    await tx((t) => content.addDerivedLevel(t, went.entryId, go.entryId));
    expect(await content.publishItem({ senseId: went.senseId, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    await catalog('hard', 'adjective', { level: 'B2' });
    await mine(aId, 'yeet', { level: 'A1' });
    expect((await get('/v1/words', { level: 'A1' })).body.items.map(({ lemma }: { lemma: string }) => lemma)).toEqual(['go', 'went', 'yeet']);
    expect((await get('/v1/words', { level: 'B2' })).body.items.map(({ lemma }: { lemma: string }) => lemma)).toEqual(['hard']);
    expect((await get('/v1/words', { pos: 'adjective' })).body.items.map(({ lemma }: { lemma: string }) => lemma)).toEqual(['hard']);
  });

  it('B3E16: a private word\'s form_of link survives the base entry\'s sense being replaced (the link is to the entry id)', async () => {
    const go = await catalog('go', 'verb');
    const goed = await mine(aId, 'goed', { formOf: { entryId: go.entryId, kind: 'past' } });
    await tx(async (t) => {
      await content.lockEntryKey(t, 'go', 'verb');
      await content.createSense(t, { entryId: go.entryId, contextLabel: null, replacesSenseId: go.senseId, source: 'ui', actorId,
        content: { glossVi: 'đi (mới)', definitionEn: null, examplesEn: ['Go now.'], topicCodes: [], acceptedForms: [] } });
    });
    const replacement = await ctx.prisma.sense.findFirstOrThrow({ where: { replacesSenseId: go.senseId } });
    await content.publishItem({ senseId: replacement.id, revision: 1 }, actorId);
    const page = await get('/v1/words/goed');
    expect(page.body.sections[0].senses[0].form_of).toEqual({ entry_id: go.entryId, lemma: 'go', pos: 'verb', kind: 'past' });
    expect(senseIds((await get('/v1/words/go')).body.sections[0].senses)).toEqual([replacement.id]);
    expect(goed.entryId).not.toBe(go.entryId);
  });

  it('cardContent returns visible senses in the viewer\'s language and skips others', async () => {
    const bank = await catalog('bank', 'noun');
    const draft = await catalog('draft', 'noun', { publish: false });
    const theirs = await mine(bId, 'yote');
    const own = await mine(aId, 'yeet');
    const cards = await content.cardContent(aId, [bank.senseId, draft.senseId, theirs.senseId, own.senseId, randomUUID()], 'en');
    expect([...cards.keys()].sort()).toEqual([bank.senseId, own.senseId].sort());
    expect(cards.get(bank.senseId)).toMatchObject({ meaning: { text: 'Meaning of bank.', language: 'en', translation_missing: false } });
    expect(cards.get(own.senseId)).toMatchObject({ scope: 'private', meaning: { text: 'riêng yeet', language: 'vi', translation_missing: true } });
  });

  it('no native_language → 403 profile-incomplete on every route', async () => {
    const incomplete = (await seedUser(ctx.prisma, { verified: true })).userId;
    const token = (await startSession(ctx, incomplete)).accessToken;
    for (const [path, query] of [['/v1/words', {}], ['/v1/words/go', {}], ['/v1/lookup', { q: 'go' }]] as const) {
      const res = await get(path, query, token);
      expect(res.status).toBe(403);
      expect(res.body.type).toBe(problem('profile-incomplete'));
    }
  });
});
