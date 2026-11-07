import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { InflectionsService } from '../inflections/inflections.service.js';
import type { SentencesService } from '../sentences/sentences.service.js';
import { WordsService, type WordSense } from './words.service.js';

const sense = (id: string, pos: string): WordSense => ({
  sense_id: id, entry_id: `e-${pos}`, scope: 'catalog', lemma: 'deploy', pos, level: 'B1', context_label: null,
  meaning: { text: 'triển khai', language: 'vi', translation_missing: false }, definition_en: null, examples: [], topics: [],
  form_of: null, ai_suggested: false, pronunciation: { uk: null, us: null, custom: null, audio: { uk: null, us: null } },
});

describe('WordsService.wordPage — sentence_count (API (e))', () => {
  it("GE1/GE2: each sense carries the viewer's sentence count, 0 when it has none", async () => {
    const prisma = { $queryRaw: vi.fn(async () => []) };
    const counts = vi.fn(async () => new Map([['s1', 3]]));
    const service = new WordsService(prisma as unknown as PrismaClient, {} as InflectionsService, { counts } as unknown as SentencesService);
    vi.spyOn(service as unknown as { senses: () => Promise<WordSense[]> }, 'senses').mockResolvedValue([sense('s1', 'verb'), sense('s2', 'noun')]);
    const page = await service.wordPage('u1', 'deploy', 'vi');
    expect(page.sections.flatMap((s) => s.senses.map((x) => [x.sense_id, x.sentence_count]))).toEqual([['s1', 3], ['s2', 0]]);
    expect(counts).toHaveBeenCalledWith('u1', ['s1', 's2']);
  });
});

// Round C (H9): every WordSense carries the pronunciation of its live revision.
describe('WordsService — pronunciation on every sense (round C, H9)', () => {
  const row = (over: Record<string, unknown> = {}) => ({
    sense_id: 's1', entry_id: 'e1', scope: 'catalog', lemma: 'lead', pos: 'noun', level: 'B1', context_label: null,
    examples: [], gloss_vi: 'chì', definition_en: null, topics: [], form_of_entry_id: null, form_kind: null, form_lemma: null,
    form_pos: null, ai_suggested: false, ipa_uk: null, ipa_us: null, ipa_custom: null, ...over,
  });
  const read = async (rows: unknown[]) => {
    const prisma = { $queryRaw: vi.fn(async () => rows) };
    const service = new WordsService(prisma as unknown as PrismaClient, {} as InflectionsService, {} as SentencesService);
    return { service, prisma, cards: await service.cardContent('u1', ['s1'], 'vi') };
  };

  it('a catalog sense with UK and US ipa: uk, us, custom null, audio all null until the files exist', async () => {
    const { cards } = await read([row({ ipa_uk: 'lɛd', ipa_us: 'lɛd' })]);
    expect(cards.get('s1')?.pronunciation).toEqual({ uk: 'lɛd', us: 'lɛd', custom: null, audio: { uk: null, us: null } });
  });

  it('a private word: uk and us null, the learner note in custom', async () => {
    const { cards } = await read([row({ scope: 'private', ipa_custom: 'ˈfəʊbiə' })]);
    expect(cards.get('s1')?.pronunciation).toEqual({ uk: null, us: null, custom: 'ˈfəʊbiə', audio: { uk: null, us: null } });
  });

  it('no ipa at all: three nulls', async () => {
    const { cards } = await read([row()]);
    expect(cards.get('s1')?.pronunciation).toEqual({ uk: null, us: null, custom: null, audio: { uk: null, us: null } });
  });

  it('only the US ipa: uk stays null', async () => {
    const { cards } = await read([row({ ipa_us: 'liːd' })]);
    expect(cards.get('s1')?.pronunciation).toMatchObject({ uk: null, us: 'liːd' });
  });

  it('the query reads the three columns of the live revision', async () => {
    const { prisma } = await read([row()]);
    const strings = (prisma.$queryRaw.mock.calls[0] as unknown as [TemplateStringsArray])[0].join('?');
    for (const column of ['r.ipa_uk', 'r.ipa_us', 'r.ipa_custom']) expect(strings).toContain(column);
  });

  it('wordPage keeps the field on every sense', async () => {
    const prisma = { $queryRaw: vi.fn().mockResolvedValueOnce([row({ ipa_uk: 'lɛd' })]).mockResolvedValue([]) };
    const service = new WordsService(prisma as unknown as PrismaClient,
      { inflectionsOf: vi.fn(async () => new Map()) } as unknown as InflectionsService,
      { counts: vi.fn(async () => new Map()) } as unknown as SentencesService);
    const page = await service.wordPage('u1', 'lead', 'vi');
    expect(page.sections.flatMap((section) => section.senses.map((s) => s.pronunciation.uk))).toEqual(['lɛd']);
  });
});
