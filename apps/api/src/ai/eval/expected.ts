import { AI_VALID_POS, LEMMA_MAX, PRIVATE_WORD_VERDICTS } from '../ai.constants.js';
import type { AiOperation } from '../ai.types.js';
import { codePoints } from '../operations/text-rules.js';
import type { EvalRules } from './eval-rules.port.js';
import type { ExpectedResult } from './eval.types.js';

export type ExpectedForms = { forms: string[] };
export type ExpectedLookup = { lemma: string; part_of_speech: string };
export type ExpectedVerdict = { verdict: string };

/** The four operations whose example needs an expected answer (design §5.1, D7). */
export const EXPECTED_OPERATIONS: readonly AiOperation[] = ['generate_cloze', 'generate_meaning_question', 'lookup_word', 'check_private_word'];
export const EXPECTED_FORMS_MAX = 50;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const hasExpected = (op: AiOperation): boolean => EXPECTED_OPERATIONS.includes(op);

function unknownKeys(value: Record<string, unknown>, known: string[]): string[] {
  return Object.keys(value).filter((key) => !known.includes(key)).map((key) => `expected: unknown key ${key}`);
}

function formsViolations(value: Record<string, unknown>): string[] {
  if (!('forms' in value)) return ['expected.forms: required'];
  const { forms } = value;
  if (!Array.isArray(forms)) return ['expected.forms: must be an array'];
  if (forms.length === 0) return ['expected.forms: at least one form'];
  if (forms.length > EXPECTED_FORMS_MAX) return [`expected.forms: at most ${EXPECTED_FORMS_MAX} forms`];
  const violations: string[] = [];
  forms.forEach((form, index) => {
    if (typeof form !== 'string') violations.push(`expected.forms.${index}: must be a string`);
    else if (!form.trim()) violations.push(`expected.forms.${index}: empty`);
  });
  return violations;
}

function lookupViolations(value: Record<string, unknown>): string[] {
  const violations: string[] = [];
  if (typeof value.lemma !== 'string') violations.push('expected.lemma: required');
  else if (!value.lemma.trim()) violations.push('expected.lemma: empty');
  else if (codePoints(value.lemma.trim()) > LEMMA_MAX) violations.push(`expected.lemma: at most ${LEMMA_MAX} characters`);
  if (typeof value.part_of_speech !== 'string') violations.push('expected.part_of_speech: required');
  else if (!(AI_VALID_POS as readonly string[]).includes(value.part_of_speech.trim())) violations.push('expected.part_of_speech: not a part of speech');
  return violations;
}

function verdictViolations(value: Record<string, unknown>): string[] {
  if (typeof value.verdict !== 'string' || !(PRIVATE_WORD_VERDICTS as readonly string[]).includes(value.verdict.trim())) {
    return [`expected.verdict: ${PRIVATE_WORD_VERDICTS.join(' or ')}`];
  }
  return [];
}

/** What is wrong with an example's expected answer (design §5.1, B2); `[]` = it can be saved. The strings are part of the API. */
export function expectedViolations(op: AiOperation, expected: unknown): string[] {
  const absent = expected === undefined || expected === null;
  if (!hasExpected(op)) return absent ? [] : [`expected: ${op} has no expected answer`];
  if (absent) return [`expected: required for ${op}`];
  if (!isObject(expected)) return ['expected: must be an object'];
  if (op === 'lookup_word') return [...unknownKeys(expected, ['lemma', 'part_of_speech']), ...lookupViolations(expected)];
  if (op === 'check_private_word') return [...unknownKeys(expected, ['verdict']), ...verdictViolations(expected)];
  return [...unknownKeys(expected, ['forms']), ...formsViolations(expected)];
}

/** Trimmed strings and no repeated form (first kept). Call only when `expectedViolations` is empty. */
export function normalizeExpected(op: AiOperation, expected: unknown): Record<string, unknown> | null {
  if (!hasExpected(op) || !isObject(expected)) return null;
  if (op === 'lookup_word') return { lemma: String(expected.lemma).trim(), part_of_speech: String(expected.part_of_speech).trim() };
  if (op === 'check_private_word') return { verdict: String(expected.verdict).trim() };
  const forms = (expected.forms as string[]).map((form) => form.trim());
  return { forms: forms.filter((form, index) => forms.indexOf(form) === index) };
}

const same = (a: unknown, b: unknown): boolean => typeof a === 'string' && typeof b === 'string' && a.trim().toLowerCase() === b.trim().toLowerCase();

/** `null` = nothing to compare (no output, no expected answer, an operation without one, or no port for the forms). */
export function expectedResultFor(
  rules: Pick<EvalRules, 'matchesExpected'> | null,
  op: AiOperation,
  output: Record<string, unknown> | null,
  expected: Record<string, unknown> | null,
): ExpectedResult | null {
  if (!hasExpected(op) || !output || !expected) return null;
  if (op === 'lookup_word') return same(output.lemma, expected.lemma) && same(output.part_of_speech, expected.part_of_speech) ? 'pass' : 'fail';
  if (op === 'check_private_word') return same(output.verdict, expected.verdict) ? 'pass' : 'fail';
  if (!rules) return null;
  return rules.matchesExpected(op as 'generate_cloze' | 'generate_meaning_question', output, expected as ExpectedForms) ? 'pass' : 'fail';
}
