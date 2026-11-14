import { describe, expect, it } from 'vitest';
import { checkIpa, normalizeIpa } from './ipa.js';

describe('normalizeIpa', () => {
  it('drops the slashes or brackets around it', () => {
    expect(normalizeIpa('/ˈlʌɡ.ɪdʒ/')).toBe('ˈlʌɡ.ɪdʒ');
    expect(normalizeIpa('[ˈlʌɡ.ɪdʒ]')).toBe('ˈlʌɡ.ɪdʒ');
    expect(normalizeIpa('  /lɛd/  ')).toBe('lɛd');
  });

  it('keeps a slash in the middle', () => {
    expect(normalizeIpa('a/b')).toBe('a/b');
  });

  it('drops an unpaired slash at either end too', () => {
    expect(normalizeIpa('/lɛd')).toBe('lɛd');
    expect(normalizeIpa('lɛd/')).toBe('lɛd');
  });

  it('composes to NFC', () => {
    expect(normalizeIpa('é')).toBe('é');
  });

  it('empty and slashes only → empty', () => {
    expect(normalizeIpa('')).toBe('');
    expect(normalizeIpa('//')).toBe('');
  });
});

describe('checkIpa', () => {
  it('accepts a real transcription: IPA block, stress, length, brackets, syllable dots, linking, a tie bar', () => {
    const accepted = ['ˈlʌɡ.ɪdʒ', 'ˈɪnt(ə)ɹəst', 'ˌɪntəˈnæʃnəl', 'liːd', 'ˈwɔːtɚ', 't͡ʃɝtʃ', 'ðə', 'θɪŋ', 'ˈfəʊbiə', 'ˈkɒn.tɛkst',
      'ɡʊd ˈmɔːnɪŋ', 'ˈhɑːt ˈætæk', 'ɔɪ', 'ç', 'ø', 'œ', 'ˈgʊd', 'ˈlʌɡ‿ɪdʒ', 'a,b', 'ˑ'];
    for (const ok of accepted) expect(checkIpa(ok), ok).toEqual({ ok: true });
  });

  it('refuses the first character that cannot be IPA and names it', () => {
    expect(checkIpa('ˈlʌɡ1')).toEqual({ ok: false, char: '1' });
    expect(checkIpa('Led')).toEqual({ ok: false, char: 'L' });
    expect(checkIpa('l<d')).toEqual({ ok: false, char: '<' });
    expect(checkIpa('lɛd!')).toEqual({ ok: false, char: '!' });
    expect(checkIpa('lɛd\n')).toEqual({ ok: false, char: '\n' });
  });

  it('names a whole character, not half of a surrogate pair', () => {
    expect(checkIpa('lɛd😀')).toEqual({ ok: false, char: '😀' });
  });
});
