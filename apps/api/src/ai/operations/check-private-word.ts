import { z } from 'zod';
import {
  AI_POS_UNSET, AI_VALID_POS, DEFAULT_MAX_OUTPUT_TOKENS, MEANING_MAX, PRIVATE_WORD_VERDICTS, WORD_MAX,
} from '../ai.constants.js';
import { define } from './define-operation.js';
import { clean, objectSchema, STRING, textIn } from './text-rules.js';

const VERDICTS: readonly string[] = PRIVATE_WORD_VERDICTS;

/** Bước 7 design §7.6, §15: is a learner's own word a real English word used with the meaning they wrote. */
export const checkPrivateWord = define({
  name: 'check_private_word',
  input: z.strictObject({
    word: textIn(1, WORD_MAX),
    part_of_speech: z.enum([...AI_VALID_POS, AI_POS_UNSET]),
    meaning_vi: textIn(1, MEANING_MAX),
  }),
  output: { verdict: STRING },
  outputSchema: {
    name: 'check_private_word_v1',
    schema: objectSchema({ verdict: { type: 'string', enum: [...PRIVATE_WORD_VERDICTS] } }),
  },
  normalizeAndCheck(raw) {
    // Anthropic does not guarantee the case of an enum value (as `lookup_word`'s part of speech).
    const verdict = clean(raw.verdict as string).toLowerCase();
    if (!VERDICTS.includes(verdict)) return { ok: false, problem: 'verdict' };
    return { ok: true, value: { verdict } };
  },
  defaultMaxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS.check_private_word,
});
