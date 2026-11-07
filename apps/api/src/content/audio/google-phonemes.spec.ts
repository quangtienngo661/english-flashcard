import { describe, expect, it } from 'vitest';
import { toGooglePhonemes } from './google-phonemes.js';

// Review Focus 5: Wiktionary writes symbols Google does not take; they are changed, or the text alone is used, never a 400.
describe('toGooglePhonemes (round C, design §5.5)', () => {
  it('keeps symbols that are already Google symbols', () => {
    expect(toGooglePhonemes('ˈlɛd', 'uk')).toBe('ˈlɛd');
    expect(toGooglePhonemes('ˈliːd', 'us')).toBe('ˈliːd');
    expect(toGooglePhonemes('ˌɪntəˈnæʃənəl', 'uk')).toBe('ˌɪntəˈnæʃənəl');
    expect(toGooglePhonemes('ˈfəʊbiə', 'uk')).toBe('ˈfəʊbiə');
    expect(toGooglePhonemes('ˈfoʊn', 'us')).toBe('ˈfoʊn');
  });

  it('UK: a bare e is ɛ (e before ɪ or ə is the start of a diphthong and stays)', () => {
    expect(toGooglePhonemes('led', 'uk')).toBe('lɛd');
    expect(toGooglePhonemes('beɪ', 'uk')).toBe('beɪ');
    expect(toGooglePhonemes('feə', 'uk')).toBe('feə');
  });

  it('r becomes ɹ and g becomes the IPA ɡ', () => {
    expect(toGooglePhonemes('ˈrekɔːd', 'uk')).toBe('ˈɹɛkɔːd');
    expect(toGooglePhonemes('g', 'uk')).toBe('ɡ');
    expect(toGooglePhonemes('grɪn', 'us')).toBe('ɡɹɪn');
  });

  it('affricates: a tie bar or a plain pair becomes ʧ / ʤ', () => {
    expect(toGooglePhonemes('t͡ʃɝtʃ', 'us')).toBe('ʧɚʧ');
    expect(toGooglePhonemes('d͡ʒʌdʒ', 'uk')).toBe('ʤʌʤ');
    expect(toGooglePhonemes('ˈlʌɡ.ɪdʒ', 'us')).toBe('ˈlʌɡ.ɪʤ');
  });

  it('brackets around an optional sound go, and the sound stays', () => {
    expect(toGooglePhonemes('ˈɪnt(ə)ɹəst', 'uk')).toBe('ˈɪntəɹəst');
  });

  it('a flap ɾ is t; a dark l is l; the length half-mark goes', () => {
    expect(toGooglePhonemes('ˈwɔːɾɚ', 'us')).toBe('ˈwɔːtɚ');
    expect(toGooglePhonemes('bɪɫ', 'uk')).toBe('bɪl');
    expect(toGooglePhonemes('bɪˑt', 'uk')).toBe('bɪt');
  });

  it('r-coloured vowel: US ɝ is ɚ, UK ɝ is ɜː', () => {
    expect(toGooglePhonemes('bɝd', 'us')).toBe('bɚd');
    expect(toGooglePhonemes('bɝd', 'uk')).toBe('bɜːd');
  });

  it('US: a bare o is the diphthong oʊ (before ʊ it already is)', () => {
    expect(toGooglePhonemes('ɡoʊ', 'us')).toBe('ɡoʊ');
    expect(toGooglePhonemes('ɡo', 'us')).toBe('ɡoʊ');
  });

  it('a symbol the voice does not have → null (UK has no ɚ, US has no ɒ)', () => {
    expect(toGooglePhonemes('ʘ', 'uk')).toBeNull();
    expect(toGooglePhonemes('bɚd', 'uk')).toBeNull();
    expect(toGooglePhonemes('lɒt', 'us')).toBeNull();
  });

  it('empty → null; only marks → null', () => {
    expect(toGooglePhonemes('', 'uk')).toBeNull();
    expect(toGooglePhonemes('ˈ', 'uk')).toBeNull();
  });

  it('spaces are not Google symbols → null (a phrase is read from its text)', () => {
    expect(toGooglePhonemes('lʊk ˈɑːftə', 'uk')).toBeNull();
  });
});
