import { createHash } from 'node:crypto';
import { toGooglePhonemes, type Voice } from './google-phonemes.js';

/** One visible sense and the transcription of its live revision, as the recording keys need them. */
export type SenseIpa = { senseId: string; lemma: string; scope: 'catalog' | 'private'; ipaUk: string | null; ipaUs: string | null };
/** What one recording is made of: the voice, the text and (when it is needed to tell readings apart) the phonemes. */
export type SpeechTarget = { key: string; voiceName: string; text: string; phonemes: string | null };

/** The id of a recording: what is said and how, so the same words in the same voice share one file (design §5.5). */
export function audioKey(voiceName: string, text: string, phonemes: string | null): string {
  return createHash('sha256').update(`${voiceName}|${text}|${phonemes ?? ''}`).digest('hex');
}

/**
 * The recordings each sense needs, UK and US. A word is read from its text alone, unless the visible catalog senses of one lemma
 * differ in how it is said (`lead`: /lɛd/ and /liːd/): then each of those senses is read from its own phonemes (Review Focus 4).
 * A phrase never gets phonemes (one `<phoneme>` tag covers one word), nor does a private word, nor a sense whose ipa Google cannot take.
 * `senses` must hold every visible catalog sense of each lemma it mentions, or the readings are miscounted.
 */
export function speechTargets(senses: SenseIpa[], voices: { uk: string; us: string }): Map<string, { uk: SpeechTarget; us: SpeechTarget }> {
  const phonemesOf = (sense: SenseIpa, voice: Voice) => {
    const ipa = voice === 'uk' ? sense.ipaUk : sense.ipaUs;
    return ipa ? toGooglePhonemes(ipa, voice) : null;
  };
  const readings = (voice: Voice) => {
    const byLemma = new Map<string, Set<string>>();
    for (const sense of senses) {
      if (sense.scope !== 'catalog') continue;
      const phonemes = phonemesOf(sense, voice);
      if (phonemes !== null) byLemma.set(sense.lemma, (byLemma.get(sense.lemma) ?? new Set()).add(phonemes));
    }
    return byLemma;
  };
  const split = { uk: readings('uk'), us: readings('us') };
  const target = (sense: SenseIpa, voice: Voice): SpeechTarget => {
    const voiceName = voices[voice];
    const several = (split[voice].get(sense.lemma)?.size ?? 0) > 1;
    const phonemes = sense.scope === 'catalog' && several && !/\s/u.test(sense.lemma) ? phonemesOf(sense, voice) : null;
    return { key: audioKey(voiceName, sense.lemma, phonemes), voiceName, text: sense.lemma, phonemes };
  };
  return new Map(senses.map((sense) => [sense.senseId, { uk: target(sense, 'uk'), us: target(sense, 'us') }]));
}
