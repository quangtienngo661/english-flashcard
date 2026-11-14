import { describe, expect, it } from 'vitest';
import {
  AGID_SOURCE_ID, LEMMA_MAX as CONTENT_LEMMA_MAX, LEVELS, MEANING_MAX as CONTENT_MEANING_MAX, OWNER_SOURCE_ID, PRIVATE_POS_UNSET,
  SENTENCE_MAX as CONTENT_SENTENCE_MAX, VALID_POS,
} from '../content/index.js';
import {
  AI_LEVELS, AI_POS_UNSET, AI_SYSTEM_ACTOR_ID, AI_VALID_POS, LEMMA_MAX, MEANING_MAX, MODEL_ID_PATTERN, OPERATION_ID_PATTERN,
  SENTENCE_MAX,
} from './ai.constants.js';

describe('ai constants', () => {
  it('R17: the copied constants match Content', () => {
    expect(AI_VALID_POS).toEqual(VALID_POS);
    expect(AI_LEVELS).toEqual(LEVELS);
    expect(AI_POS_UNSET).toBe(PRIVATE_POS_UNSET);
    expect([MEANING_MAX, LEMMA_MAX, SENTENCE_MAX]).toEqual([CONTENT_MEANING_MAX, CONTENT_LEMMA_MAX, CONTENT_SENTENCE_MAX]);
  });

  it('AI_SYSTEM_ACTOR_ID is a lower-case uuid distinct from OWNER_SOURCE_ID and AGID_SOURCE_ID', () => {
    expect(AI_SYSTEM_ACTOR_ID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(AI_SYSTEM_ACTOR_ID).not.toBe(OWNER_SOURCE_ID);
    expect(AI_SYSTEM_ACTOR_ID).not.toBe(AGID_SOURCE_ID);
  });

  it("MODEL_ID_PATTERN rejects 'gpt-6-luna/../x' and accepts 'claude-haiku-5-5' and 'fake:ok'", () => {
    expect(MODEL_ID_PATTERN.test('gpt-6-luna/../x')).toBe(false);
    expect(MODEL_ID_PATTERN.test('claude-haiku-5-5')).toBe(true);
    expect(MODEL_ID_PATTERN.test('fake:ok')).toBe(true);
  });

  it("B6E10: OPERATION_ID_PATTERN accepts '<uuid>' and '<uuid>#2', rejects 'a b'", () => {
    const uuid = '5f0c2b8e-3a71-4c9e-9d2a-7b1e6f4a8c3d';
    expect(OPERATION_ID_PATTERN.test(uuid)).toBe(true);
    expect(OPERATION_ID_PATTERN.test(`${uuid}#2`)).toBe(true);
    expect(OPERATION_ID_PATTERN.test('a b')).toBe(false);
  });
});
