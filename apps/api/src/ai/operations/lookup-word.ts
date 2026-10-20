import { z } from 'zod';
import {
  AI_VALID_POS, DEFAULT_MAX_OUTPUT_TOKENS, LEMMA_MAX, LOOKUP_EXAMPLES_MAX, MEANING_MAX, SENTENCE_MAX, WORD_MAX,
} from '../ai.constants.js';
import { define } from './define-operation.js';
import { clean, codePoints, objectSchema, STRING, STRING_LIST, textIn } from './text-rules.js';

const VALID_POS: readonly string[] = AI_VALID_POS;

/** Design §5.2: a suggested meaning of a word the learner met; never content until the learner saves it. */
export const lookupWord = define({
  name: 'lookup_word',
  input: z.strictObject({
    text: textIn(1, WORD_MAX),
    context_sentence: textIn(1, SENTENCE_MAX).nullable(),
  }),
  output: { part_of_speech: STRING, lemma: STRING, meaning_vi: STRING, definition_en: STRING, examples: STRING_LIST },
  outputSchema: {
    name: 'lookup_word_v1',
    schema: objectSchema({
      part_of_speech: { type: 'string', enum: [...AI_VALID_POS] }, lemma: STRING, meaning_vi: STRING, definition_en: STRING,
      examples: STRING_LIST,
    }),
  },
  normalizeAndCheck(raw) {
    // Anthropic does not guarantee the case of an enum value (design §5.2).
    const partOfSpeech = clean(raw.part_of_speech as string).toLowerCase();
    const lemma = clean(raw.lemma as string);
    const meaning = clean(raw.meaning_vi as string);
    const definition = clean(raw.definition_en as string);
    const examples = (raw.examples as string[]).map(clean);
    if (codePoints(lemma) > LEMMA_MAX || codePoints(meaning) > MEANING_MAX || codePoints(definition) > MEANING_MAX
      || examples.length > LOOKUP_EXAMPLES_MAX || examples.some((example) => codePoints(example) > SENTENCE_MAX)) {
      return { ok: false, problem: 'too-long' };
    }
    if (!lemma || !meaning || !definition || examples.length === 0 || examples.some((example) => !example)) {
      return { ok: false, problem: 'empty' };
    }
    if (!VALID_POS.includes(partOfSpeech)) return { ok: false, problem: 'pos' };
    return {
      ok: true,
      value: { part_of_speech: partOfSpeech, lemma, meaning_vi: meaning, definition_en: definition, examples },
    };
  },
  defaultMaxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS.lookup_word,
});
