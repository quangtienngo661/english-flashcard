import type { AiOperation } from './ai-api';

/** One box of the "Ô mong đợi" section; `forms` is one comma-separated box, `verdict` a choice. */
export type ExpectedField = 'forms' | 'lemma' | 'part_of_speech' | 'verdict';

const FIELDS: Partial<Record<AiOperation, ExpectedField[]>> = {
  generate_cloze: ['forms'],
  generate_meaning_question: ['forms'],
  lookup_word: ['lemma', 'part_of_speech'],
  check_private_word: ['verdict'],
};

/** The boxes an operation's example needs for its expected answer (design §5.1); none for `translate_sentence` and `generate_sentence_mcq`. */
export const expectedFields = (op: AiOperation): ExpectedField[] => FIELDS[op] ?? [];

/** "deploy, deployed ,,deploy" → ["deploy", "deployed"]: split on commas, trimmed, no empty and no repeated form (the first is kept). */
export function formsFromText(text: string): string[] {
  const forms = text.split(',').map((form) => form.trim()).filter((form) => form !== '');
  return forms.filter((form, index) => forms.indexOf(form) === index);
}

/**
 * The expected answer to send, or `null` for an operation that has none. A box left empty is sent as it is (an empty list, an empty
 * string): the API judges it and names the box, so the rules live in one place.
 */
export function expectedFromFields(op: AiOperation, values: Record<string, string>): Record<string, unknown> | null {
  const fields = expectedFields(op);
  if (fields.length === 0) return null;
  if (fields.includes('forms')) return { forms: formsFromText(values.forms ?? '') };
  if (fields.includes('verdict')) return { verdict: values.verdict ?? '' };
  return { lemma: (values.lemma ?? '').trim(), part_of_speech: (values.part_of_speech ?? '').trim() };
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** The reverse of `expectedFromFields`: what the boxes show for a stored answer (`null` = none yet, a value of another shape reads as empty). */
export function fieldsFromExpected(op: AiOperation, expected: Record<string, unknown> | null): Record<string, string> {
  const fields = expectedFields(op);
  if (fields.length === 0) return {};
  if (fields.includes('forms')) {
    const forms = expected?.forms;
    return { forms: Array.isArray(forms) ? forms.filter((form): form is string => typeof form === 'string').join(', ') : '' };
  }
  if (fields.includes('verdict')) return { verdict: text(expected?.verdict) };
  return { lemma: text(expected?.lemma), part_of_speech: text(expected?.part_of_speech) };
}
