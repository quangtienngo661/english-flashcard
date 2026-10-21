import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
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
  const service = new HistoryService({ practiceSessionItem: { findMany: async () => [row] } } as unknown as PrismaClient, {} as PracticeStats);

  it('an AI question shows its sentence, options and right option; the translation only for a vi learner', async () => {
    const vi = (await service.history('u1', { page_size: 20 }, 'vi')).items[0];
    expect(vi).toMatchObject({ prompt: { sentence: 'We deployed it.' }, correct: { text: 'triển khai', choice_index: 1 },
      translation: 'Chúng tôi đã triển khai.' });
    expect((await service.history('u1', { page_size: 20 }, 'en')).items[0].translation).toBeNull();
  });
});
