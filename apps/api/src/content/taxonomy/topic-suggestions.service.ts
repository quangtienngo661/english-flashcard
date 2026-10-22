import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { localDate } from '../../common/time/local-date.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { TopicSuggestionQueries, type SuggestionPair, type SuggestionSample } from './topic-suggestions.queries.js';

/** A topic × level pair needs this many visible senses to be suggested (design §8.8, Claude tự quyết). */
export const SUGGESTION_MIN_SENSES = 10;
const MAX_SUGGESTIONS = 3;
const SAMPLES = 4;

export type TopicSuggestion = {
  topic: { code: string; name: string };
  level: string;
  count: number;
  samples: SuggestionSample[];
};

/** First 4 bytes of sha256(`userId|localDate`): fixed for a learner within a day, new the next day (D17). */
export function suggestionSeed(userId: string, day: string): number {
  return createHash('sha256').update(`${userId}|${day}`).digest().readUInt32BE(0);
}

/** mulberry32: a small seeded generator, so a seed always gives the same shuffle. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  const next = random(seed);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Seeded shuffle of the pairs that reach the threshold, then the first pair of each topic, up to `max`. */
export function pickSuggestions(pairs: SuggestionPair[], seed: number, max = MAX_SUGGESTIONS): SuggestionPair[] {
  const picked: SuggestionPair[] = [];
  for (const pair of shuffle(pairs.filter((p) => p.count >= SUGGESTION_MIN_SENSES), seed)) {
    if (picked.length === max) break;
    if (!picked.some((p) => p.topic_code === pair.topic_code)) picked.push(pair);
  }
  return picked;
}

@Injectable()
export class TopicSuggestionsService {
  constructor(
    @Inject(TopicSuggestionQueries) private readonly queries: TopicSuggestionQueries,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  /** `GET /v1/topics/suggestions`: up to 3 topics, a different one each, with 4 sample words; the same all day for a learner. */
  async suggestions(userId: string, language: 'vi' | 'en'): Promise<{ items: TopicSuggestion[] }> {
    const zone = (await this.identity.getProfile(userId))?.timezone ?? 'UTC';
    const seed = suggestionSeed(userId, localDate(zone, this.clock.now()));
    const picked = pickSuggestions(await this.queries.pairs(language), seed);
    const items = await Promise.all(picked.map(async (pair) => ({
      topic: { code: pair.topic_code, name: pair.topic_name },
      level: pair.level,
      count: pair.count,
      samples: shuffle(await this.queries.samples(pair.topic_code, pair.level, language), seed).slice(0, SAMPLES),
    })));
    return { items };
  }
}
