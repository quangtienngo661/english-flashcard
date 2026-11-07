import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { reviewIdFor } from './review-id.js';

const UUID_V8 = /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('reviewIdFor (session synonyms design §3.2: the learning log is keyed per item and word)', () => {
  const item = randomUUID();
  const asked = randomUUID();
  const typed = randomUUID();

  it('the asked word keeps the item id, as every review did before', () => {
    expect(reviewIdFor(item, asked, asked)).toBe(item);
  });

  it('another word gets a UUID derived from the item and the word: the same on every call', () => {
    const id = reviewIdFor(item, typed, asked);
    expect(id).toMatch(UUID_V8);
    expect(reviewIdFor(item, typed, asked)).toBe(id);
    expect(id).not.toBe(item);
  });

  it('a different word or a different item gives a different id', () => {
    const id = reviewIdFor(item, typed, asked);
    expect(reviewIdFor(item, randomUUID(), asked)).not.toBe(id);
    expect(reviewIdFor(randomUUID(), typed, asked)).not.toBe(id);
  });
});
