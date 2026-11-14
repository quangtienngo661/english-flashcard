import { z } from 'zod';
import { DEFAULT_MAX_OUTPUT_TOKENS, SENTENCE_MAX, TRANSLATION_MAX } from '../ai.constants.js';
import { define } from './define-operation.js';
import { clean, codePoints, objectSchema, STRING, textIn } from './text-rules.js';

/** Design §5.3: a Vietnamese translation of one English sentence. */
export const translateSentence = define({
  name: 'translate_sentence',
  input: z.strictObject({ sentence: textIn(1, SENTENCE_MAX) }),
  output: { translation_vi: STRING },
  outputSchema: { name: 'translate_sentence_v1', schema: objectSchema({ translation_vi: STRING }) },
  normalizeAndCheck(raw) {
    const translation = clean(raw.translation_vi as string);
    if (codePoints(translation) > TRANSLATION_MAX) return { ok: false, problem: 'too-long' };
    if (!translation) return { ok: false, problem: 'empty' };
    return { ok: true, value: { translation_vi: translation } };
  },
  defaultMaxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS.translate_sentence,
});
