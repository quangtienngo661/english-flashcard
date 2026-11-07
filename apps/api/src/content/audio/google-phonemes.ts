export type Voice = 'uk' | 'us';

// The IPA symbols Google's `<phoneme alphabet="ipa">` takes per voice, read from
// docs.cloud.google.com/text-to-speech/docs/phonemes on 07/11/2026. Stress and syllable marks (ˈ ˌ .) are allowed in both.
const COMMON = ['p', 'b', 't', 'd', 'k', 'ɡ', 'm', 'n', 'ŋ', 'f', 'v', 's', 'z', 'θ', 'ð', 'ʃ', 'ʒ', 'h', 'l', 'ɹ', 'ʧ', 'ʤ', 'j', 'w',
  'æ', 'ɑː', 'ə', 'ɛ', 'ɪ', 'iː', 'ɔː', 'ʊ', 'uː', 'ʌ', 'aɪ', 'aʊ', 'eɪ', 'ɔɪ'];
const SYMBOLS: Record<Voice, ReadonlySet<string>> = {
  uk: new Set([...COMMON, 'ɒ', 'ɜː', 'eə', 'iə', 'əʊ', 'ʊə']),
  us: new Set([...COMMON, 'ɚ', 'oʊ']),
};
const MARKS = new Set(['ˈ', 'ˌ', '.']);
const LONGEST = 2;

/**
 * Wiktionary's IPA turned into symbols Google accepts, or null when that cannot be done (then the recording is made from the text
 * alone and the voice reads the word its own way; Google never gets a symbol it would refuse with a 400).
 */
export function toGooglePhonemes(ipa: string, voice: Voice): string | null {
  let text = ipa.normalize('NFC');
  // Affricates first: they need the tie bar that is removed with the other combining marks below.
  text = text.replaceAll('t͡ʃ', 'ʧ').replaceAll('d͡ʒ', 'ʤ').replaceAll('tʃ', 'ʧ').replaceAll('dʒ', 'ʤ');
  text = text.replace(/[()ˑ]/g, '').replace(/[̀-ͯ]/g, '');
  text = text.replaceAll('r', 'ɹ').replaceAll('g', 'ɡ').replaceAll('ɾ', 't').replaceAll('ɫ', 'l');
  text = text.replaceAll('ɝ', voice === 'us' ? 'ɚ' : 'ɜː');
  // A bare vowel letter of the broad transcription is the vowel Google names differently.
  text = voice === 'uk' ? text.replace(/e(?![ɪə])/g, 'ɛ') : text.replace(/o(?!ʊ)/g, 'oʊ');

  const symbols = SYMBOLS[voice];
  let out = '';
  let hasSound = false;
  for (let at = 0; at < text.length;) {
    const char = text[at];
    if (MARKS.has(char)) {
      out += char;
      at++;
      continue;
    }
    let matched: string | null = null;
    for (let length = LONGEST; length >= 1 && matched === null; length--) {
      const candidate = text.slice(at, at + length);
      if (candidate.length === length && symbols.has(candidate)) matched = candidate;
    }
    if (matched === null) return null;
    out += matched;
    hasSound = true;
    at += matched.length;
  }
  return hasSound ? out : null;
}
