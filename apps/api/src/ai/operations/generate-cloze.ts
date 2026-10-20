import { z } from 'zod';
import {
  ACCEPTED_ANSWER_MAX, ACCEPTED_ANSWERS_MAX, AI_LEVELS, AI_POS_UNSET, AI_VALID_POS, CONTEXT_LABEL_MAX, DEFAULT_MAX_OUTPUT_TOKENS,
  MEANING_MAX, SENTENCE_MAX, TRANSLATION_MAX, WORD_MAX,
} from '../ai.constants.js';
import { define } from './define-operation.js';
import { BLANK, clean, codePoints, dedupeAnswers, objectSchema, STRING, STRING_LIST, textIn } from './text-rules.js';

/** Design §5.1: a practice sentence with one blank for one meaning of a word. */
export const generateCloze = define({
  name: 'generate_cloze',
  input: z.strictObject({
    word: textIn(1, WORD_MAX),
    part_of_speech: z.enum([...AI_VALID_POS, AI_POS_UNSET]),
    level: z.enum(AI_LEVELS).nullable(),
    meaning_vi: textIn(1, MEANING_MAX),
    context_label: textIn(1, CONTEXT_LABEL_MAX).nullable(),
  }),
  output: { sentence: STRING, accepted_answers: STRING_LIST, translation_vi: STRING },
  outputSchema: {
    name: 'generate_cloze_v1',
    schema: objectSchema({ sentence: STRING, accepted_answers: STRING_LIST, translation_vi: STRING }),
  },
  normalizeAndCheck(raw) {
    const rawSentence = raw.sentence as string;
    if (/[\n\r]/.test(rawSentence)) return { ok: false, problem: 'shape' };
    const sentence = clean(rawSentence).replace(/_{3,}/g, BLANK);
    const answers = dedupeAnswers((raw.accepted_answers as string[]).map(clean));
    const translation = clean(raw.translation_vi as string);
    if (sentence.split(BLANK).length !== 2) return { ok: false, problem: 'blank-count' };
    if (codePoints(sentence) > SENTENCE_MAX || codePoints(translation) > TRANSLATION_MAX
      || answers.some((answer) => codePoints(answer) > ACCEPTED_ANSWER_MAX)) return { ok: false, problem: 'too-long' };
    if (!translation || answers.some((answer) => !answer)) return { ok: false, problem: 'empty' };
    if (answers.length < 1 || answers.length > ACCEPTED_ANSWERS_MAX) return { ok: false, problem: 'answers-count' };
    if (answers.some((answer) => answer.includes('_'))) return { ok: false, problem: 'answer-underscore' };
    return { ok: true, value: { sentence, accepted_answers: answers, translation_vi: translation } };
  },
  defaultMaxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS.generate_cloze,
});
