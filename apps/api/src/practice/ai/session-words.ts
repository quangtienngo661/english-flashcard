// The session's other words that go to the fill-in writer (session synonyms design §5.1).
import { SESSION_WORDS_MAX } from '../../ai/index.js';
import type { PracticeSense } from '../../content/index.js';

/** One entry of `generate_cloze.session_words`: a lemma and its Vietnamese meaning (null when the sense has none). */
export type SessionWord = { word: string; meaning_vi: string | null };
/** A sense whose word was sent, kept with the question so the private mark and the alternatives can be checked later (§5.5). */
export type SessionSense = { senseId: string; scope: 'catalog' | 'private' };

/**
 * `others` are the session's other usable senses in session order. Left out: the asked sense and every sense of the asked lemma
 * (compared without case), and, when the asked word has a part of speech, words of another part of speech (words with none stay).
 * A repeated lemma-and-meaning pair is sent once; `senses` still lists the repeated sense, since its word was sent. At most
 * SESSION_WORDS_MAX entries.
 */
export function pickSessionWords(asked: PracticeSense, others: PracticeSense[]): { words: SessionWord[]; senses: SessionSense[] } {
  const words: SessionWord[] = [];
  const senses: SessionSense[] = [];
  const sent = new Set<string>();
  const askedLemma = asked.lemma.toLowerCase();
  for (const sense of others) {
    if (sense.sense_id === asked.sense_id || sense.lemma.toLowerCase() === askedLemma) continue;
    if (asked.pos !== null && sense.pos !== null && sense.pos !== asked.pos) continue;
    const meaning = sense.gloss_vi !== null && sense.gloss_vi.trim() !== '' ? sense.gloss_vi : null;
    const pair = JSON.stringify([sense.lemma.toLowerCase(), meaning]);
    if (!sent.has(pair)) {
      if (words.length >= SESSION_WORDS_MAX) continue;
      sent.add(pair);
      words.push({ word: sense.lemma, meaning_vi: meaning });
    }
    senses.push({ senseId: sense.sense_id, scope: sense.scope });
  }
  return { words, senses };
}
