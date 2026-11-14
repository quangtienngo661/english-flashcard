import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import { pickSuggestions, suggestionSeed, TopicSuggestionsService, SUGGESTION_MIN_SENSES } from './topic-suggestions.service.js';
import type { TopicSuggestionQueries } from './topic-suggestions.queries.js';

const pair = (code: string, level: string, count: number) => ({ topic_code: code, topic_name: code.toUpperCase(), level, count });
const PAIRS = [
  pair('business', 'B1', 52), pair('business', 'A2', 30), pair('food', 'A1', 40), pair('travel', 'A2', 38),
  pair('technology', 'B1', 25), pair('daily-life', 'A1', 19), pair('food', 'B2', 12), pair('travel', 'B1', 11),
];

describe('suggestionSeed (design §8.8)', () => {
  it('is fixed for a learner and a day, and changes with the day or the learner', () => {
    expect(suggestionSeed('u1', '2026-10-18')).toBe(suggestionSeed('u1', '2026-10-18'));
    expect(suggestionSeed('u1', '2026-10-19')).not.toBe(suggestionSeed('u1', '2026-10-18'));
    expect(suggestionSeed('u2', '2026-10-18')).not.toBe(suggestionSeed('u1', '2026-10-18'));
    expect(Number.isInteger(suggestionSeed('u1', '2026-10-18'))).toBe(true);
  });
});

describe('pickSuggestions', () => {
  it('GH1: the same seed picks the same pairs', () => {
    expect(pickSuggestions(PAIRS, 123)).toEqual(pickSuggestions(PAIRS, 123));
  });

  it('GH2: another day reshuffles (over a week, the first pick is not always the same)', () => {
    const firsts = new Set(Array.from({ length: 7 }, (_, d) => pickSuggestions(PAIRS, suggestionSeed('u1', `2026-10-1${d}`))[0].topic_code + pickSuggestions(PAIRS, suggestionSeed('u1', `2026-10-1${d}`))[0].level));
    expect(firsts.size).toBeGreaterThan(1);
  });

  it('at most 3, each a different topic, only pairs with at least 10 senses', () => {
    const picked = pickSuggestions([...PAIRS, pair('travel', 'C1', SUGGESTION_MIN_SENSES - 1)], 7);
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((p) => p.topic_code)).size).toBe(3);
    expect(picked.every((p) => p.count >= SUGGESTION_MIN_SENSES)).toBe(true);
  });

  it('GH3: only 2 pairs reach the threshold → 2; none → []', () => {
    expect(pickSuggestions([pair('food', 'A1', 10), pair('travel', 'A2', 11), pair('business', 'B1', 9)], 1)).toHaveLength(2);
    expect(pickSuggestions([pair('food', 'A1', 3)], 1)).toEqual([]);
  });
});

describe('TopicSuggestionsService', () => {
  const sample = (n: number) => ({ sense_id: `s${n}`, lemma: `w${n}`, pos: 'noun', meaning: `m${n}` });

  function setup(pairs = PAIRS) {
    const queries = {
      pairs: vi.fn(async () => pairs),
      samples: vi.fn(async () => Array.from({ length: 9 }, (_, i) => sample(i))),
    } as unknown as TopicSuggestionQueries;
    const identity = { getProfile: vi.fn(async () => ({ timezone: 'Asia/Ho_Chi_Minh' })) } as unknown as IdentityService;
    // 18:00 UTC on the 18th is already the 19th in Ho Chi Minh City.
    const service = new TopicSuggestionsService(queries, identity, new FakeClock(new Date('2026-10-18T18:00:00Z')));
    return { service, queries };
  }

  it('returns up to 3 cards with 4 samples each, in the learner language', async () => {
    const { service, queries } = setup();
    const { items } = await service.suggestions('u1', 'vi');
    expect(items).toHaveLength(3);
    for (const item of items) expect(item.samples).toHaveLength(4);
    expect(items[0]).toMatchObject({ topic: { code: expect.any(String), name: expect.any(String) }, level: expect.any(String), count: expect.any(Number) });
    expect(queries.pairs).toHaveBeenCalledWith('vi');
  });

  it('GH1: two calls on the same local day give the same cards and samples (day taken in the learner zone)', async () => {
    const { service } = setup();
    const first = await service.suggestions('u1', 'vi');
    expect(await service.suggestions('u1', 'vi')).toEqual(first);
    expect(first.items).toEqual((await setup().service.suggestions('u1', 'vi')).items);
    expect(pickSuggestions(PAIRS, suggestionSeed('u1', '2026-10-19')).map((p) => p.topic_code)).toEqual(first.items.map((i) => i.topic.code));
  });

  it('GH3: no pair over the threshold → items []', async () => {
    const { service, queries } = setup([pair('food', 'A1', 4)]);
    expect(await service.suggestions('u1', 'vi')).toEqual({ items: [] });
    expect(queries.samples).not.toHaveBeenCalled();
  });
});
