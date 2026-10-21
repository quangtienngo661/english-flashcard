import { describe, expect, it, vi } from 'vitest';
import type { ContentService, PracticeSense } from '../../content/index.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { LearningService } from '../../learning/index.js';
import { SETTINGS_DEFAULTS } from '../../settings/index.js';
import type { WordChecksRepository } from '../ai/word-checks.repository.js';
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
    practiceLemmaMeanings: vi.fn(async () => new Map()),
  };
  const learning = { practiceGroupMates: vi.fn(async (_userId: string, ids: string[]) => new Map(ids.map((id) => [id, [] as string[]]))) };
  const builder = new QuestionBuilder(content as unknown as ContentService, learning as unknown as LearningService,
    { get: async () => null } as unknown as WordChecksRepository);
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
    expect(content.practiceLemmaMeanings).toHaveBeenCalledExactlyOnceWith(userId, ['cat'], 'vi', tx);
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

  it('T6: availability counts only the filtered candidates', async () => {
    const { builder, content, learning } = setup();
    const mate = (id: string, lemma: string, gloss: string) => [id, {
      sense_id: id, entry_id: `e-${lemma}`, scope: 'catalog', lemma, meaning: { text: gloss, language: 'vi' }, gloss_vi: gloss,
      definition_en: null, form_of_entry_id: null, function_word: false,
    }] as const;
    const ids = ['a2', 'a3', 'a4'];
    content.practiceCandidates.mockImplementation((async () => new Map<string, unknown>([
      [senseId, cat], mate('a2', 'dog', 'con chó'), mate('a3', 'bird', 'con chim'), mate('a4', 'kitty', 'mèo con'),
    ])) as never);
    learning.practiceGroupMates.mockImplementation((async () => new Map([[senseId, ids]])) as never);
    const types = { chosenTypes: ['mcq_definition', 'type_word'] as never, userId, nativeLanguage: 'vi' as const, senseIds: [senseId] };
    expect((await builder.availability(types)).get(senseId)).toContain('mcq_definition');
    // "kitty" also has a sense "con mèo" outside the group, so only two candidates remain: not enough for 4 options.
    content.practiceLemmaMeanings.mockImplementation((async () => new Map([
      ['kitty', [{ gloss_vi: 'mèo con', definition_en: null }, { gloss_vi: 'con mèo', definition_en: null }]],
    ])) as never);
    expect((await builder.availability(types)).get(senseId)).not.toContain('mcq_definition');
    expect(content.practiceLemmaMeanings).toHaveBeenLastCalledWith(userId, expect.arrayContaining(['cat', 'kitty']), 'vi', undefined);
  });
});
