// What Practice sends to the AI gateway (design §7.1, §15): learning content only, never the learner's id, name or sentences.
import { createHash } from 'node:crypto';
import type { PracticeSense } from '../../content/index.js';

// The gateway's word for a missing part of speech (`AI_POS_UNSET`, which `ai/index.ts` does not export).
const POS_UNSET = 'unspecified';

/** The Vietnamese meaning an AI type needs; availableTypes only offers AI types to senses that have one (design §6.2). */
function meaningVi(s: PracticeSense): string {
  if (s.gloss_vi === null) throw new Error(`sense ${s.sense_id} has no Vietnamese meaning for an AI question`);
  return s.gloss_vi;
}

const base = (s: PracticeSense) => ({
  word: s.lemma, part_of_speech: s.pos ?? POS_UNSET, level: s.level, meaning_vi: meaningVi(s), context_label: s.context_label,
});

/** `generate_cloze` (Bước 6 §5.1). */
export const clozeInput = (s: PracticeSense) => base(s);

/** `generate_meaning_question`: the three wrong meanings in Vietnamese (design §7.4). */
export const meaningInput = (s: PracticeSense, wrongVi: string[]) => ({ ...base(s), other_meanings_vi: wrongVi });

/** `generate_sentence_mcq`: the answer's form and at most MCQ_SENTENCE_CANDIDATES_MAX candidates in that form (design §7.5). */
export const mcqInput = (s: PracticeSense, answerForm: string, candidates: string[]) =>
  ({ ...base(s), answer_form: answerForm, candidates });

/** `check_private_word` (design §7.6). */
export const wordCheckInput = (s: PracticeSense) =>
  ({ word: s.lemma, part_of_speech: s.pos ?? POS_UNSET, meaning_vi: meaningVi(s) });

/**
 * SHA-256 (hex) of a private word's content as checked (design §7.6, R22): the lemma NFC with its case kept, the part of
 * speech or `unspecified`, the meaning NFC and trimmed. A lemma edit makes no revision, so only this key notices it.
 */
export function contentKey(lemma: string, pos: string | null, meaning: string): string {
  const parts = [lemma.normalize('NFC'), pos ?? POS_UNSET, meaning.normalize('NFC').trim()];
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}
