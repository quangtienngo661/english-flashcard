import { describe, expect, it, vi } from 'vitest';
import type { ContentService, PracticeSense } from '../../content/index.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { LearningService } from '../../learning/index.js';
import { SETTINGS_DEFAULTS } from '../../settings/index.js';
import { QuestionBuilder } from './question-builder.service.js';

const userId = '00000000-0000-4000-8000-000000000001';
const senseId = '00000000-0000-4000-8000-0000000000a1';
const tx = { name: 'tx' } as unknown as Prisma.TransactionClient;

const cat = {
  sense_id: senseId, entry_id: 'e1', scope: 'catalog', lemma: 'cat', meaning: { text: 'con mèo', language: 'vi' }, gloss_vi: 'con mèo',
  definition_en: null, form_of_entry_id: null, function_word: false, context_label: null, examples: [], variants: [], accepted: [],
  inflections: [],
} as unknown as PracticeSense;

function setup() {
  const content = {
    practiceSenses: vi.fn(async () => new Map([[senseId, cat]])),
    practiceCandidates: vi.fn(async () => new Map()),
  };
  const learning = { practiceGroupMates: vi.fn(async (_userId: string, ids: string[]) => new Map(ids.map((id) => [id, [] as string[]]))) };
  const builder = new QuestionBuilder(content as unknown as ContentService, learning as unknown as LearningService);
  return { builder, content, learning };
}

describe('QuestionBuilder — reads through the client it is given (PX4)', () => {
  it('PX4: build reads the sense, the group mates and the candidates through the given client', async () => {
    const { builder, content, learning } = setup();
    const built = await builder.build({
      userId, nativeLanguage: 'vi', senseId, chosenTypes: ['type_word'], promptStyle: 'meaning', previousType: null,
      avoidDistractors: [], settings: SETTINGS_DEFAULTS.practice, random: () => 0, db: tx,
    });
    expect(built).toMatchObject({ type: 'type_word' });
    expect(content.practiceSenses).toHaveBeenCalledExactlyOnceWith(userId, [senseId], 'vi', tx);
    expect(learning.practiceGroupMates).toHaveBeenCalledExactlyOnceWith(userId, [senseId], tx);
    expect(content.practiceCandidates).toHaveBeenCalledExactlyOnceWith(userId, [], 'vi', tx);
  });

  it('PX4: availability reads the group mates and the candidates through the given client', async () => {
    const { builder, content, learning } = setup();
    await builder.availability({ userId, nativeLanguage: 'vi', senseIds: [senseId], chosenTypes: ['mcq_definition'], db: tx });
    expect(learning.practiceGroupMates).toHaveBeenCalledExactlyOnceWith(userId, [senseId], tx);
    expect(content.practiceCandidates).toHaveBeenCalledExactlyOnceWith(userId, [senseId], 'vi', tx);
  });

  it('PX4: without a client the calls carry none, so the façades use the global client', async () => {
    const { builder, content } = setup();
    await builder.availability({ userId, nativeLanguage: 'vi', senseIds: [senseId], chosenTypes: ['type_word'] });
    expect(content.practiceCandidates).toHaveBeenCalledExactlyOnceWith(userId, [senseId], 'vi', undefined);
  });
});
