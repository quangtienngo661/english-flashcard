import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ContentService, type CandidateSense, type PracticeSense } from '../../src/content/index.js';
import { seedUser } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { seedPracticeSense } from '../support/seed-practice.js';
import { seedVisibleSenses } from '../support/seed-senses.js';

const candidateOf = ({ sense_id, entry_id, scope, lemma, meaning, gloss_vi, definition_en, form_of_entry_id, function_word }: PracticeSense):
  CandidateSense => ({ sense_id, entry_id, scope, lemma, meaning, gloss_vi, definition_en, form_of_entry_id, function_word });

describe('content read for practice (e2e, isolated database)', () => {
  let ctx: TestApp;
  let content: ContentService;
  let viewer: string;
  let other: string;

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
    content = ctx.app.get(ContentService);
    viewer = (await seedUser(ctx.prisma, { nativeLanguage: 'vi' })).userId;
    other = (await seedUser(ctx.prisma, { nativeLanguage: 'vi' })).userId;
  });
  afterAll(async () => { await ctx?.close(); });

  it('returns meaning, gloss, definition, examples, variants, accepted variants and forms, inflections and the function-word flag of catalog senses', async () => {
    const base = await seedPracticeSense(ctx.prisma, { lemma: 'analyse', glossVi: 'phân tích' });
    const { senseId, entryId } = await seedPracticeSense(ctx.prisma, {
      lemma: 'analyze', glossVi: 'phân tích', definitionEn: 'to examine in detail', examples: ['We analyze data.', 'They analyzed it.'],
      variants: ['analyse'], acceptedForms: ['analyse', 'analyzes', 'analyze'],
      inflections: [{ form: 'analyzes', kind: 'third_person' }, { form: 'analyzed', kind: 'past' }],
      formOfEntryId: base.entryId, functionWord: true,
    });

    const vi = (await content.practiceSenses(viewer, [senseId], 'vi')).get(senseId);
    expect(vi).toEqual({
      sense_id: senseId, entry_id: entryId, scope: 'catalog', lemma: 'analyze',
      meaning: { text: 'phân tích', language: 'vi', translation_missing: false },
      gloss_vi: 'phân tích', definition_en: 'to examine in detail', form_of_entry_id: base.entryId, function_word: true,
      context_label: null, examples: ['We analyze data.', 'They analyzed it.'], variants: ['analyse'],
      accepted: ['analyse', 'analyzes'],
      inflections: [{ form: 'analyzes', kind: 'third_person' }, { form: 'analyzed', kind: 'past' }],
    } satisfies PracticeSense);
    // Same meaning rule as cardContent: an English learner sees the definition.
    expect((await content.practiceSenses(viewer, [senseId], 'en')).get(senseId)?.meaning)
      .toEqual({ text: 'to examine in detail', language: 'en', translation_missing: false });
    expect((await content.practiceCandidates(viewer, [senseId], 'vi')).get(senseId)).toEqual(candidateOf(vi!));
  });

  it('a variant with accepted_as_answer false is in variants but not in accepted', async () => {
    const { senseId, entryId } = await seedPracticeSense(ctx.prisma, { lemma: 'colour', glossVi: 'màu', variants: ['color', 'colr'] });
    await ctx.prisma.entryVariant.updateMany({ where: { entryId, text: 'colr' }, data: { acceptedAsAnswer: false } });

    const sense = (await content.practiceSenses(viewer, [senseId], 'vi')).get(senseId);
    expect(sense?.variants).toEqual(['color', 'colr']);
    expect(sense?.accepted).toEqual(['color']);
  });

  it('the viewer\'s own private sense is returned with scope private, examples [] and context_label null even when its stored label is p2', async () => {
    const { senseId } = await seedPracticeSense(ctx.prisma, { lemma: 'yeet', pos: 'unspecified', glossVi: 'ném mạnh', ownerUserId: viewer });
    await ctx.prisma.sense.update({ where: { id: senseId }, data: { contextLabel: 'p2' } });

    const sense = (await content.practiceSenses(viewer, [senseId], 'vi')).get(senseId);
    expect(sense).toMatchObject({ scope: 'private', examples: [], context_label: null, lemma: 'yeet',
      meaning: { text: 'ném mạnh', language: 'vi', translation_missing: false } });
    expect((await content.practiceCandidates(viewer, [senseId], 'vi')).get(senseId)?.scope).toBe('private');
  });

  it('another learner\'s private sense and a retired sense are absent from both reads', async () => {
    const theirs = await seedPracticeSense(ctx.prisma, { lemma: 'yote', pos: 'unspecified', glossVi: 'riêng', ownerUserId: other });
    const retired = await seedPracticeSense(ctx.prisma, { lemma: 'obsolete', glossVi: 'cũ' });
    await ctx.prisma.sense.update({ where: { id: retired.senseId }, data: { state: 'retired' } });
    const visible = await seedPracticeSense(ctx.prisma, { lemma: 'current', glossVi: 'hiện tại' });
    const ids = [theirs.senseId, retired.senseId, visible.senseId, randomUUID()];

    expect([...(await content.practiceSenses(viewer, ids, 'vi')).keys()]).toEqual([visible.senseId]);
    expect([...(await content.practiceCandidates(viewer, ids, 'vi')).keys()]).toEqual([visible.senseId]);
  });

  it('function_word follows the override (override false wins over a derived true)', async () => {
    const { senseId, entryId } = await seedPracticeSense(ctx.prisma, { lemma: 'upon', pos: 'preposition', glossVi: 'trên', functionWord: true });
    await ctx.prisma.entry.update({ where: { id: entryId }, data: { functionWordOverride: false } });

    expect((await content.practiceSenses(viewer, [senseId], 'vi')).get(senseId)?.function_word).toBe(false);
    expect((await content.practiceCandidates(viewer, [senseId], 'vi')).get(senseId)?.function_word).toBe(false);
  });

  it('practiceCandidates returns the same CandidateSense fields as practiceSenses for 2,000 ids in one call', async () => {
    const ids = await seedVisibleSenses(ctx.prisma, 2_000, 'cand');

    const candidates = await content.practiceCandidates(viewer, ids, 'vi');
    const senses = await content.practiceSenses(viewer, ids, 'vi');
    expect(candidates.size).toBe(2_000);
    for (const id of ids) expect(candidates.get(id)).toEqual(candidateOf(senses.get(id)!));
    expect(Object.keys(candidates.get(ids[0])!).sort()).toEqual([
      'definition_en', 'entry_id', 'form_of_entry_id', 'function_word', 'gloss_vi', 'lemma', 'meaning', 'scope', 'sense_id',
    ]);
  });
});
