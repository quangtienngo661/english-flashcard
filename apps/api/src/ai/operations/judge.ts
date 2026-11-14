import { z } from 'zod';
import {
  DEFAULT_MAX_OUTPUT_TOKENS, JUDGE_CODE_PATTERN, JUDGE_CRITERIA_MAX, JUDGE_QUESTION_MAX, JUDGE_REASON_MAX, JUDGE_SESSION_WORDS_MAX, WORD_MAX,
} from '../ai.constants.js';
import { AI_OPERATIONS } from '../ai.types.js';
import { JUDGE_VERDICTS } from '../judge/judge.types.js';
import { define } from './define-operation.js';
import { clean, codePoints, objectSchema, STRING_LIST, textIn } from './text-rules.js';

const VERDICTS: readonly string[] = JUDGE_VERDICTS;

/**
 * Nhóm B design §5.4: a judge scores one output against criteria. The data are exactly these five fields: nothing says which model,
 * provider, config or run made the output, so the judge stays blind (D3). The answer is three parallel lists, one entry per criterion.
 */
export const judgeOperation = define({
  name: 'judge',
  input: z.strictObject({
    target_operation: z.enum(AI_OPERATIONS),
    input: z.record(z.string(), z.unknown()),
    output: z.record(z.string(), z.unknown()),
    criteria: z.array(z.strictObject({
      code: z.string().regex(JUDGE_CODE_PATTERN),
      question: textIn(1, JUDGE_QUESTION_MAX),
    })).min(1).max(JUDGE_CRITERIA_MAX),
    context: z.strictObject({
      session_words: z.array(textIn(1, WORD_MAX)).max(JUDGE_SESSION_WORDS_MAX),
    }).nullable(),
  }),
  output: { codes: STRING_LIST, verdicts: STRING_LIST, reasons: STRING_LIST },
  outputSchema: {
    name: 'judge_v1',
    schema: objectSchema({ codes: STRING_LIST, verdicts: STRING_LIST, reasons: STRING_LIST }),
  },
  normalizeAndCheck(raw) {
    const codes = raw.codes as string[];
    const verdicts = raw.verdicts as string[];
    const reasons = raw.reasons as string[];
    if (codes.length !== verdicts.length || codes.length !== reasons.length) return { ok: false, problem: 'shape' };
    if (codes.length === 0) return { ok: false, problem: 'empty' };
    const cleanVerdicts = verdicts.map((verdict) => clean(verdict).toLowerCase());
    // Anthropic does not guarantee the case of an enum value; a verdict with spaces or capitals is still the verdict.
    if (cleanVerdicts.some((verdict) => !VERDICTS.includes(verdict))) return { ok: false, problem: 'verdict' };
    const cleanReasons = reasons.map(clean);
    if (cleanReasons.some((reason) => codePoints(reason) > JUDGE_REASON_MAX)) return { ok: false, problem: 'too-long' };
    return { ok: true, value: { codes: codes.map(clean), verdicts: cleanVerdicts, reasons: cleanReasons } };
  },
  defaultMaxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS.judge,
});
