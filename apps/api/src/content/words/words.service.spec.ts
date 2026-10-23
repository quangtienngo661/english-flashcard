import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { InflectionsService } from '../inflections/inflections.service.js';
import type { SentencesService } from '../sentences/sentences.service.js';
import { WordsService, type WordSense } from './words.service.js';

const sense = (id: string, pos: string): WordSense => ({
  sense_id: id, entry_id: `e-${pos}`, scope: 'catalog', lemma: 'deploy', pos, level: 'B1', context_label: null,
  meaning: { text: 'triển khai', language: 'vi', translation_missing: false }, definition_en: null, examples: [], topics: [],
  form_of: null, ai_suggested: false,
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
