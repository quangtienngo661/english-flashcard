import { describe, expect, it } from 'vitest';
import { normalizeLemma, normalizeText, splitHeadword } from './normalize.js';

describe('catalog normalization', () => {
  it('B2#13: splitHeadword keeps "turn to", "according to", "o\'clock", "\'re" whole and trims trailing space', () => {
    for (const headword of ['turn to ', 'according to', "o'clock", "'re", "'m", "'s"]) {
      expect(splitHeadword(headword)).toEqual({ lemma: headword.trim(), variants: [] });
    }
  });

  it('B2E3: "a.m./A.M./am/AM" keeps dots and case; "driver\'s license/driving licence" splits only at the slash', () => {
    expect(splitHeadword('a.m./A.M./am/AM')).toEqual({ lemma: 'a.m.', variants: ['A.M.', 'am', 'AM'] });
    expect(splitHeadword("driver's license/driving licence")).toEqual({
      lemma: "driver's license", variants: ['driving licence'],
    });
    expect(splitHeadword(' / a.m. // A.M. / / am / AM / ')).toEqual({
      lemma: 'a.m.', variants: ['A.M.', 'am', 'AM'],
    });
    expect(splitHeadword(' / / ')).toEqual({ lemma: '', variants: [] });
  });

  it('B2#13a: "emphasize/emphasize" gives no variant, repeated earlier segments are dropped, and "a.m./A.M." keeps A.M.', () => {
    expect(splitHeadword('emphasize/emphasize')).toEqual({ lemma: 'emphasize', variants: [] });
    expect(splitHeadword('emphasize / emphasise / emphasize / emphasise')).toEqual({
      lemma: 'emphasize', variants: ['emphasise'],
    });
    expect(splitHeadword('a.m./A.M.')).toEqual({ lemma: 'a.m.', variants: ['A.M.'] });
  });

  it('B2#12: text and lemmas trim, collapse whitespace and normalize NFC without changing case', () => {
    const text = ' \tCafe\u0301\n\r  March\u00a0 ';
    expect(normalizeText(text)).toBe('Café March');
    expect(normalizeLemma(text)).toBe('Café March');
    expect(normalizeLemma('March')).not.toBe(normalizeLemma('march'));
    expect(splitHeadword(' Cafe\u0301 / Café / CAFE\u0301 / CAFE\u0301 ')).toEqual({
      lemma: 'Café', variants: ['CAFÉ'],
    });
  });
});
