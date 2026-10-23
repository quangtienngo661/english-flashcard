import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { ContentService } from '../../content/content.service.js';
import type { LearningService } from '../../learning/index.js';
import type { PracticeStats } from '../weak/practice-stats.js';
import { HistoryService } from './history.service.js';

const row = {
  id: 'it-1', sessionId: 'sess-1', senseId: 's1', answerRaw: '1', result: 'correct', skipped: false, tries: 1, hintLevel: 0,
  reviewAction: null, answeredAt: new Date('2026-10-21T03:00:00Z'), localDate: new Date('2026-10-21T00:00:00Z'),
  question: {
    type: 'meaning_in_sentence', promptStyle: 'sentence',
    prompt: { kind: 'meaning_in_sentence', sentence: 'We deployed it.', highlight: 'deployed', options: ['a', 'triển khai', 'b', 'c'],
      meaning_language: 'vi' },
    answerKey: { kind: 'mcq', correct_index: 1, option_private: [false, false, false, false], translation_vi: 'Chúng tôi đã triển khai.',
      reveal: { lemma: 'deploy', meaning: 'triển khai', definition_en: null }, asked_private: false },
  },
};

describe('HistoryService.history (B7E124)', () => {
  const service = new HistoryService({ practiceSessionItem: { findMany: async () => [row] } } as unknown as PrismaClient, {} as PracticeStats, {} as ContentService, {} as LearningService);

  it('an AI question shows its sentence, options and right option; the translation only for a vi learner', async () => {
    const vi = (await service.history('u1', { page_size: 20 }, 'vi')).items[0];
    expect(vi).toMatchObject({ prompt: { sentence: 'We deployed it.' }, correct: { text: 'triển khai', choice_index: 1 },
      translation: 'Chúng tôi đã triển khai.' });
    expect((await service.history('u1', { page_size: 20 }, 'en')).items[0].translation).toBeNull();
  });
});

describe('HistoryService.weakWords (design §8.7)', () => {
  const vi = (text: string) => ({ text, language: 'vi', translation_missing: false });
  const weak = (senseId: string) => ({
    item: { sense_id: senseId, level: 1 },
    stats: { wrong: 2, counted: 5, last_wrong_at: senseId === 's1' ? '2026-10-21T03:00:00.000Z' : '2026-10-20T03:00:00.000Z' },
  });
  const prisma = {
    $queryRaw: async () => [{ sense_id: 's1', lemma: 'deploy' }, { sense_id: 's2', lemma: 'rizz' }],
  } as unknown as PrismaClient;
  const stats = { weakSenses: async () => [weak('s1'), weak('s2')] } as unknown as PracticeStats;

  it('each row carries the meaning in the learner language, read through the Content facade', async () => {
    const calls: unknown[][] = [];
    const content = {
      practiceSenses: async (...args: unknown[]) => {
        calls.push(args);
        return new Map([['s1', { meaning: vi('triển khai') }], ['s2', { meaning: vi('sức hút') }]]);
      },
    } as unknown as ContentService;
    const page = await new HistoryService(prisma, stats, content, {} as LearningService).weakWords('u1', 'vi', { page_size: 20 });
    expect(page.items.map((i) => [i.lemma, i.meaning])).toEqual([['deploy', 'triển khai'], ['rizz', 'sức hút']]);
    expect(calls[0].slice(0, 3)).toEqual(['u1', ['s1', 's2'], 'vi']);
  });

  it('GG2: a weak word whose meaning is no longer visible has meaning null', async () => {
    const content = { practiceSenses: async () => new Map([['s1', { meaning: vi('triển khai') }]]) } as unknown as ContentService;
    const page = await new HistoryService(prisma, stats, content, {} as LearningService).weakWords('u1', 'vi', { page_size: 20 });
    expect(page.items.find((i) => i.sense_id === 's2')).toMatchObject({ lemma: 'rizz', meaning: null });
  });
});
