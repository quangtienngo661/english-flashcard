import { describe, expect, it } from 'vitest';
import { myWordPatch } from './my-words.schemas.js';

const SENSE = '00000000-0000-4000-8000-0000000000b1';

describe('PATCH /v1/my-words body — examples per sense (Bước 7 plan choice 4)', () => {
  it('examples alone, a meaning alone, or both', () => {
    expect(myWordPatch.parse({ senses: [{ sense_id: SENSE, examples: [' We sat on the bank. '] }] }).senses)
      .toEqual([{ sense_id: SENSE, examples: ['We sat on the bank.'] }]);
    expect(myWordPatch.safeParse({ senses: [{ sense_id: SENSE, meaning: 'bờ sông' }] }).success).toBe(true);
    expect(myWordPatch.safeParse({ senses: [{ sense_id: SENSE, meaning: 'bờ sông', examples: [] }] }).success).toBe(true);
  });

  it('a sense item with neither, or with three examples → refused', () => {
    expect(myWordPatch.safeParse({ senses: [{ sense_id: SENSE }] }).success).toBe(false);
    expect(myWordPatch.safeParse({ senses: [{ sense_id: SENSE, examples: ['a.', 'b.', 'c.'] }] }).success).toBe(false);
  });
});
