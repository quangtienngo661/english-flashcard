import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TopicSuggestionQueries } from './topic-suggestions.queries.js';
import { pickSuggestions, TopicSuggestionsService } from './topic-suggestions.service.js';

const randomInt = vi.hoisted(() => vi.fn<(min: number, max: number) => number>());

vi.mock('node:crypto', async (importOriginal) => ({
  ...await importOriginal<typeof import('node:crypto')>(),
  randomInt,
}));

const pair = (code: string, level: string, count: number) => ({ topic_code: code, topic_name: code.toUpperCase(), level, count });
const PAIRS = [
  pair('business', 'B1', 52), pair('business', 'A2', 30), pair('food', 'A1', 40),
  pair('travel', 'A2', 38), pair('technology', 'B1', 25), pair('daily-life', 'A1', 19),
  pair('sports', 'A1', 9),
];

describe('pickSuggestions', () => {
  it('picks four distinct eligible topics, even with multiple levels for one topic', () => {
    // Both business levels appear among the first four eligible pairs in this shuffle.
    const picked = pickSuggestions(PAIRS, 14);
    expect(picked).toHaveLength(4);
    expect(new Set(picked.map((p) => p.topic_code)).size).toBe(4);
    expect(picked.every((p) => p.count >= 10)).toBe(true);
  });
});

describe('TopicSuggestionsService', () => {
  const samples = Array.from({ length: 4 }, (_, i) => ({
    sense_id: `s${i}`, lemma: `w${i}`, pos: 'noun', meaning: `m${i}`,
  }));

  beforeEach(() => {
    randomInt.mockReset().mockReturnValue(7);
  });

  function setup(pairs = PAIRS) {
    const queries = {
      pairs: vi.fn(async () => pairs),
      samples: vi.fn<TopicSuggestionQueries['samples']>().mockResolvedValue(samples),
    };
    const service = new TopicSuggestionsService(queries as unknown as TopicSuggestionQueries);
    return { service, queries };
  }

  it('picks the expected cards on two requests using their own seeds', async () => {
    randomInt.mockReturnValueOnce(7).mockReturnValueOnce(123);
    const { service, queries } = setup();

    const first = await service.suggestions('vi');
    const second = await service.suggestions('vi');

    expect(first.items.map(({ topic, level }) => [topic.code, level])).toEqual([
      ['technology', 'B1'], ['business', 'A2'], ['food', 'A1'], ['travel', 'A2'],
    ]);
    expect(second.items.map(({ topic, level }) => [topic.code, level])).toEqual([
      ['travel', 'A2'], ['food', 'A1'], ['daily-life', 'A1'], ['business', 'A2'],
    ]);
    expect(queries.samples.mock.calls).toEqual([
      ['technology', 'B1', 'vi', 7], ['business', 'A2', 'vi', 7], ['food', 'A1', 'vi', 7], ['travel', 'A2', 'vi', 7],
      ['travel', 'A2', 'vi', 123], ['food', 'A1', 'vi', 123], ['daily-life', 'A1', 'vi', 123], ['business', 'A2', 'vi', 123],
    ]);
    expect(first.items[0]).toEqual({ topic: { code: 'technology', name: 'TECHNOLOGY' }, level: 'B1', count: 25, samples });
  });

  it('returns both eligible topics and passes the requested locale to the queries', async () => {
    const { service, queries } = setup([pair('food', 'A1', 10), pair('travel', 'A2', 11), pair('business', 'B1', 9)]);
    const { items } = await service.suggestions('en');
    expect(items.map((item) => item.topic.code).sort()).toEqual(['food', 'travel']);
    expect(queries.pairs).toHaveBeenCalledWith('en');
    expect(queries.samples).toHaveBeenCalledWith('food', 'A1', 'en', 7);
  });

  it('returns an empty list without loading samples when no topic qualifies', async () => {
    const { service, queries } = setup([pair('food', 'A1', 9)]);
    expect(await service.suggestions('vi')).toEqual({ items: [] });
    expect(queries.samples).not.toHaveBeenCalled();
  });
});
