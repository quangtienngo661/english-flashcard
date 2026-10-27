import type { PromptExample } from './ai-api';

/** One example as the editor holds it: a text box per input field, the output as JSON text. */
export type FormExample = { input: Record<string, string>; output: string };
/** What the Prompt editor holds, and what `useKeptDraft('ai-prompt:<op>')` keeps. */
export type PromptForm = { instructions: string; examples: FormExample[] };

/** The API's limit on examples per prompt (`ai.constants.ts` PROMPT_EXAMPLES_MAX). */
export const EXAMPLES_MAX = 10;
export const INSTRUCTIONS_FIELD = 'prompt-instructions';
export const inputFieldId = (index: number, field: string) => `example-${index}-input-${field}`;
export const outputFieldId = (index: number) => `example-${index}-output`;

/** A value of an input field as text: a string as is, null as empty, anything else (a list) as JSON. */
export function fieldText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/** The reverse of `fieldText`: empty is null, text that parses as a JSON list or object is that value, anything else stays text. */
export function fieldValue(text: string): unknown {
  if (text === '') return null;
  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
  return text;
}

/** The operation's input fields first (in its order, empty when the example lacks one), then any other key the example has. */
export function toForm(prompt: { instructions: string; examples: PromptExample[] }, inputFields: string[]): PromptForm {
  return {
    instructions: prompt.instructions,
    examples: prompt.examples.map((example) => {
      const keys = [...inputFields, ...Object.keys(example.input).filter((key) => !inputFields.includes(key))];
      return {
        input: Object.fromEntries(keys.map((key) => [key, fieldText(example.input[key])])),
        output: JSON.stringify(example.output, null, 2),
      };
    }),
  };
}

export const emptyExample = (inputFields: string[]): FormExample => ({
  input: Object.fromEntries(inputFields.map((field) => [field, ''])),
  output: '{}',
});

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The PUT / test body, or the indexes whose output is not a JSON object (nothing is sent then). */
export function toPayload(form: PromptForm):
  | { ok: true; body: { instructions: string; examples: PromptExample[] } }
  | { ok: false; badOutputs: number[] } {
  const badOutputs: number[] = [];
  const examples = form.examples.map((example, index) => {
    let output: unknown;
    try {
      output = JSON.parse(example.output) as unknown;
    } catch {
      output = undefined;
    }
    if (!isPlainObject(output)) badOutputs.push(index);
    const input = Object.fromEntries(Object.entries(example.input).map(([key, text]) => [key, fieldValue(text)]));
    return { input, output: isPlainObject(output) ? output : {} };
  });
  return badOutputs.length > 0 ? { ok: false, badOutputs } : { ok: true, body: { instructions: form.instructions, examples } };
}

export const sameForm = (a: PromptForm, b: PromptForm) => JSON.stringify(a) === JSON.stringify(b);

/** JSON with object keys sorted at every level: Postgres `jsonb` does not keep key order. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (isPlainObject(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

/** Same instructions and examples, whatever the key order (did the server keep exactly what we sent?). */
export function samePrompt(a: { instructions: string; examples: unknown[] }, b: { instructions: string; examples: unknown[] }): boolean {
  return a.instructions === b.instructions && JSON.stringify(canonical(a.examples)) === JSON.stringify(canonical(b.examples));
}

/** A kept draft comes from `sessionStorage` and may have an older build's shape: only this exact shape is offered. */
export function isPromptForm(value: unknown): value is PromptForm {
  if (!isPlainObject(value) || typeof value.instructions !== 'string' || !Array.isArray(value.examples)) return false;
  return value.examples.every(
    (example) =>
      isPlainObject(example) &&
      typeof example.output === 'string' &&
      isPlainObject(example.input) &&
      Object.values(example.input).every((text) => typeof text === 'string'),
  );
}

/** The box a 400 violation path points at (`instructions`, `examples[0].input.word`, `examples[0].output`), or null. */
export function fieldOfViolation(path: string, form: PromptForm): string | null {
  if (path === 'instructions') return INSTRUCTIONS_FIELD;
  const match = /^examples\[(\d+)\](?:\.(input)\.([A-Za-z_]+)|\.output)?/.exec(path);
  if (!match) return null;
  const index = Number(match[1]);
  const example = form.examples[index];
  if (!example) return null;
  if (match[2] === 'input') return match[3] in example.input ? inputFieldId(index, match[3]) : outputFieldId(index);
  return outputFieldId(index);
}

/** Field ids in screen order, for `useFocusFirstError`. */
export function fieldOrder(form: PromptForm): string[] {
  return [
    INSTRUCTIONS_FIELD,
    ...form.examples.flatMap((example, index) => [...Object.keys(example.input).map((field) => inputFieldId(index, field)), outputFieldId(index)]),
  ];
}
