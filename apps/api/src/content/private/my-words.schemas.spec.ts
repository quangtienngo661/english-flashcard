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

describe('PATCH /v1/my-words body — ipa per sense (round C, H10)', () => {
  it('ipa alone is a change; an empty string and null clear it; slashes are dropped', () => {
    expect(myWordPatch.parse({ senses: [{ sense_id: SENSE, ipa: '/ˈfəʊbiə/' }] }).senses).toEqual([{ sense_id: SENSE, ipa: 'ˈfəʊbiə' }]);
    expect(myWordPatch.parse({ senses: [{ sense_id: SENSE, ipa: '' }] }).senses).toEqual([{ sense_id: SENSE, ipa: '' }]);
    expect(myWordPatch.parse({ senses: [{ sense_id: SENSE, ipa: null }] }).senses).toEqual([{ sense_id: SENSE, ipa: null }]);
  });

  it('101 characters → refused; 100 → accepted', () => {
    expect(myWordPatch.safeParse({ senses: [{ sense_id: SENSE, ipa: 'a'.repeat(101) }] }).success).toBe(false);
    expect(myWordPatch.safeParse({ senses: [{ sense_id: SENSE, ipa: 'a'.repeat(100) }] }).success).toBe(true);
  });
});
