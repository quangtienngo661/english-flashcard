import { z } from 'zod';
import {
  AI_LEVELS, AI_POS_UNSET, AI_VALID_POS, CONTEXT_LABEL_MAX, DEFAULT_MAX_OUTPUT_TOKENS, MEANING_MAX, OTHER_MEANINGS_COUNT, SENTENCE_MAX,
  TRANSLATION_MAX, WORD_MAX,
} from '../ai.constants.js';
import { define } from './define-operation.js';
import { clean, codePoints, objectSchema, STRING, textIn } from './text-rules.js';

/**
 * Bước 7 design §7.4, §15: a sentence that uses one meaning of a word, for "câu chứa từ rồi chọn". Whether `word_in_sentence`
 * is a form of the word and appears once in the sentence is Practice's rule, not the gate's (AR9).
 */
export const generateMeaningQuestion = define({
  name: 'generate_meaning_question',
  input: z.strictObject({
    word: textIn(1, WORD_MAX),
    part_of_speech: z.enum([...AI_VALID_POS, AI_POS_UNSET]),
    level: z.enum(AI_LEVELS).nullable(),
    meaning_vi: textIn(1, MEANING_MAX),
    context_label: textIn(1, CONTEXT_LABEL_MAX).nullable(),
    other_meanings_vi: z.array(textIn(1, MEANING_MAX)).length(OTHER_MEANINGS_COUNT),
  }),
  output: { sentence: STRING, word_in_sentence: STRING, translation_vi: STRING },
  outputSchema: {
    name: 'generate_meaning_question_v1',
    schema: objectSchema({ sentence: STRING, word_in_sentence: STRING, translation_vi: STRING }),
  },
  normalizeAndCheck(raw) {
    const rawSentence = raw.sentence as string;
    if (/[\n\r]/.test(rawSentence)) return { ok: false, problem: 'shape' };
    const sentence = clean(rawSentence);
    const word = clean(raw.word_in_sentence as string);
    const translation = clean(raw.translation_vi as string);
    if (codePoints(sentence) > SENTENCE_MAX || codePoints(translation) > TRANSLATION_MAX || codePoints(word) > WORD_MAX) {
      return { ok: false, problem: 'too-long' };
    }
    if (!word || word.includes('_')) return { ok: false, problem: 'word' };
    if (!sentence || !translation) return { ok: false, problem: 'empty' };
    return { ok: true, value: { sentence, word_in_sentence: word, translation_vi: translation } };
  },
  defaultMaxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS.generate_meaning_question,
});
