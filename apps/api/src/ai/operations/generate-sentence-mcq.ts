import { z } from 'zod';
import {
  AI_LEVELS, AI_POS_UNSET, AI_VALID_POS, CONTEXT_LABEL_MAX, DEFAULT_MAX_OUTPUT_TOKENS, MCQ_CANDIDATES_MAX, MCQ_CANDIDATES_MIN,
  MCQ_DISTRACTORS_COUNT, MEANING_MAX, SENTENCE_MAX, TRANSLATION_MAX, WORD_MAX,
} from '../ai.constants.js';
import { define } from './define-operation.js';
import { BLANK, clean, codePoints, dedupeAnswers, objectSchema, STRING, STRING_LIST, textIn } from './text-rules.js';

/**
 * Bước 7 design §7.5, §15: a sentence with one blank and three wrong choices taken from `candidates`. Whether each distractor
 * is one of the candidates sent is Practice's rule, not the gate's (AR9).
 */
export const generateSentenceMcq = define({
  name: 'generate_sentence_mcq',
  input: z.strictObject({
    word: textIn(1, WORD_MAX),
    part_of_speech: z.enum([...AI_VALID_POS, AI_POS_UNSET]),
    level: z.enum(AI_LEVELS).nullable(),
    meaning_vi: textIn(1, MEANING_MAX),
    context_label: textIn(1, CONTEXT_LABEL_MAX).nullable(),
    answer_form: textIn(1, WORD_MAX),
    candidates: z.array(textIn(1, WORD_MAX)).min(MCQ_CANDIDATES_MIN).max(MCQ_CANDIDATES_MAX),
  }),
  output: { sentence: STRING, distractors: STRING_LIST, translation_vi: STRING },
  outputSchema: {
    name: 'generate_sentence_mcq_v1',
    schema: objectSchema({ sentence: STRING, distractors: STRING_LIST, translation_vi: STRING }),
  },
  normalizeAndCheck(raw) {
    const rawSentence = raw.sentence as string;
    if (/[\n\r]/.test(rawSentence)) return { ok: false, problem: 'shape' };
    const sentence = clean(rawSentence).replace(/_{3,}/g, BLANK);
    const distractors = (raw.distractors as string[]).map(clean);
    const translation = clean(raw.translation_vi as string);
    if (sentence.split(BLANK).length !== 2) return { ok: false, problem: 'blank-count' };
    if (codePoints(sentence) > SENTENCE_MAX || codePoints(translation) > TRANSLATION_MAX
      || distractors.some((item) => codePoints(item) > WORD_MAX)) return { ok: false, problem: 'too-long' };
    if (!translation) return { ok: false, problem: 'empty' };
    if (distractors.length !== MCQ_DISTRACTORS_COUNT || dedupeAnswers(distractors).length !== distractors.length
      || distractors.some((item) => !item || item.includes('_'))) return { ok: false, problem: 'distractors' };
    return { ok: true, value: { sentence, distractors, translation_vi: translation } };
  },
  defaultMaxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS.generate_sentence_mcq,
});
