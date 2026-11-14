import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { InflectionsService } from '../inflections/inflections.service.js';
import type { SentencesService } from '../sentences/sentences.service.js';
import type { AudioService } from '../audio/audio.service.js';
import { WordsService, type WordSense } from './words.service.js';

const noAudio = { urlsForSenses: vi.fn(async (ids: string[]) => new Map(ids.map((id) => [id, { uk: null, us: null }]))) } as unknown as AudioService;

const sense = (id: string, pos: string): WordSense => ({
  sense_id: id, entry_id: `e-${pos}`, scope: 'catalog', lemma: 'deploy', pos, level: 'B1', context_label: null,
  meaning: { text: 'triển khai', language: 'vi', translation_missing: false }, definition_en: null, examples: [], topics: [],
  form_of: null, ai_suggested: false, pronunciation: { uk: null, us: null, custom: null, audio: { uk: null, us: null } },
});

describe('WordsService.wordPage — sentence_count (API (e))', () => {
  it("GE1/GE2: each sense carries the viewer's sentence count, 0 when it has none", async () => {
    const prisma = { $queryRaw: vi.fn(async () => []) };
    const counts = vi.fn(async () => new Map([['s1', 3]]));
    const service = new WordsService(prisma as unknown as PrismaClient, {} as InflectionsService, { counts } as unknown as SentencesService, noAudio);
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
    const service = new WordsService(prisma as unknown as PrismaClient, {} as InflectionsService, {} as SentencesService, noAudio);
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
      { counts: vi.fn(async () => new Map()) } as unknown as SentencesService, noAudio);
    const page = await service.wordPage('u1', 'lead', 'vi');
    expect(page.sections.flatMap((section) => section.senses.map((s) => s.pronunciation.uk))).toEqual(['lɛd']);
  });
});

describe('WordsService — audio urls in the pronunciation (round C, H9)', () => {
  const row = {
    sense_id: 's1', entry_id: 'e1', scope: 'catalog', lemma: 'lead', pos: 'noun', level: 'B1', context_label: null, examples: [],
    gloss_vi: 'chì', definition_en: null, topics: [], form_of_entry_id: null, form_kind: null, form_lemma: null, form_pos: null,
    ai_suggested: false, ipa_uk: 'lɛd', ipa_us: 'lɛd', ipa_custom: null,
  };

  it('a ready recording appears as audio.uk / audio.us', async () => {
    const audio = { urlsForSenses: vi.fn(async () => new Map([['s1', { uk: 'https://audio.example.com/tts/v1/a.mp3', us: null }]])) } as unknown as AudioService;
    const service = new WordsService({ $queryRaw: vi.fn(async () => [row]) } as unknown as PrismaClient, {} as InflectionsService, {} as SentencesService, audio);
    const cards = await service.cardContent('u1', ['s1'], 'vi');
    expect(cards.get('s1')?.pronunciation.audio).toEqual({ uk: 'https://audio.example.com/tts/v1/a.mp3', us: null });
    expect(audio.urlsForSenses).toHaveBeenCalledExactlyOnceWith(['s1']);
  });
});

// Giao diện mới M4.1: the word list carries the first sense's IPA and example, and the number of matching words.
describe('WordsService.search — ipa, example, total (giao diện mới M4.1)', () => {
  const word = (over: Record<string, unknown> = {}) => ({
    lemma: 'record', pos_list: ['noun'], level: 'B1', meaning_preview: 'hồ sơ', has_private: false, rank: 0, total: 1,
    ipa_uk: null, ipa_us: null, ipa_custom: null, example: null, ...over,
  });
  const search = async (rows: unknown[], query: Record<string, unknown> = {}) => {
    const prisma = { $queryRaw: vi.fn(async () => rows) };
    const service = new WordsService(prisma as unknown as PrismaClient, {} as InflectionsService, {} as SentencesService, noAudio);
    return { prisma, page: await service.search('u1', { page_size: 20, ...query }, 'vi') };
  };

  it('a catalog word with UK and US IPA returns the UK one', async () => {
    const { page } = await search([word({ ipa_uk: 'ˈrek.ɔːd', ipa_us: 'ˈrek.ɚd' })]);
    expect(page.items[0]!.ipa).toBe('ˈrek.ɔːd');
  });

  it('a word with only the US IPA returns the US one', async () => {
    const { page } = await search([word({ ipa_us: 'ˈrek.ɚd' })]);
    expect(page.items[0]!.ipa).toBe('ˈrek.ɚd');
  });

  it("a private word returns the learner's own IPA", async () => {
    const { page } = await search([word({ lemma: 'rizz', has_private: true, ipa_custom: 'rɪz' })]);
    expect(page.items[0]!.ipa).toBe('rɪz');
  });

  it('a word with no IPA returns null', async () => {
    const { page } = await search([word()]);
    expect(page.items[0]!.ipa).toBeNull();
  });

  it('example is the first example of that sense, null without one', async () => {
    const { page } = await search([word({ example: 'Keep a record.' }), word({ lemma: 'rest' })]);
    expect(page.items.map((item) => item.example)).toEqual(['Keep a record.', null]);
  });

  it('the row has exactly the documented fields', async () => {
    const { page } = await search([word({ ipa_uk: 'a', example: 'b' })]);
    expect(page.items[0]).toEqual({ lemma: 'record', pos_list: ['noun'], level: 'B1', meaning_preview: 'hồ sơ', has_private: false,
      ipa: 'a', example: 'b' });
  });

  it('total is the number of matching words, not the page size, for a filter spanning 3 pages of 20', async () => {
    const rows = Array.from({ length: 21 }, (_, n) => word({ lemma: `w${String(n).padStart(2, '0')}`, total: 45 }));
    const { page } = await search(rows, { level: 'B1' });
    expect(page.items).toHaveLength(20);
    expect(page.total).toBe(45);
    expect(page.next_page_token).not.toBeNull();
  });

  it('a page past the last word still reports the total (the count row comes without a word)', async () => {
    const { page } = await search([{ ...word({ total: 45 }), lemma: null, pos_list: null }]);
    expect(page).toEqual({ items: [], next_page_token: null, total: 45 });
  });

  it('no match at all: total 0', async () => {
    const { page } = await search([{ ...word({ total: 0 }), lemma: null, pos_list: null }]);
    expect(page).toEqual({ items: [], next_page_token: null, total: 0 });
  });

  it('the query reads the three IPA columns and the first example of the preview sense, and counts the words', async () => {
    const { prisma } = await search([word()]);
    const sql = (prisma.$queryRaw.mock.calls[0] as unknown as [TemplateStringsArray])[0].join('?');
    for (const part of ['r.ipa_uk', 'r.ipa_us', 'r.ipa_custom', 'r.examples[1]', 'COUNT(*)']) expect(sql).toContain(part);
  });

  it('meaning texts are joined only for the page, after LIMIT (a join per matched sense took 7 s on 9.8k words)', async () => {
    const { prisma } = await search([word()]);
    const sql = (prisma.$queryRaw.mock.calls[0] as unknown as [TemplateStringsArray])[0].join('?');
    const limit = sql.indexOf('LIMIT');
    expect(limit).toBeGreaterThan(0);
    expect(sql.indexOf('sense_revision_texts')).toBeGreaterThan(limit);
  });
});
