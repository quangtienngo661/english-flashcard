import type { z } from 'zod';
import type { GatewayOperation } from '../ai.types.js';
import { STRING, STRING_LIST, toViolations } from './text-rules.js';

export type OutputProblem =
  | 'not-json' | 'shape' | 'blank-count' | 'too-long' | 'empty' | 'answers-count' | 'answer-underscore' | 'pos'
  | 'distractors' | 'verdict' | 'word';
export type OutputCheck = { ok: true; value: Record<string, unknown> } | { ok: false; problem: OutputProblem };

export type OperationDefinition = {
  name: GatewayOperation;
  inputFields: readonly string[];
  validateInput(data: unknown): { ok: true } | { ok: false; violations: string[] };
  outputSchema: { name: string; schema: Record<string, unknown> };
  checkOutput(value: unknown): OutputCheck;
  defaultMaxOutputTokens: number;
};

/** What each operation file declares; `define` adds the shared steps of §5.4. */
export type OperationSpec = {
  name: GatewayOperation;
  input: z.ZodObject;
  /** Output fields: a string or a list of strings; the schema may narrow a string to an enum. */
  output: Record<string, typeof STRING | typeof STRING_LIST>;
  outputSchema: { name: string; schema: Record<string, unknown> };
  /** Steps (2) normalize and (3) check of §5.4 on a value that already has the raw shape. */
  normalizeAndCheck(raw: Record<string, string | string[]>): OutputCheck;
  defaultMaxOutputTokens: number;
};

/** Step (1) of §5.4: exactly the declared keys, each a string or a list of strings. */
function rawShape(spec: OperationSpec, value: unknown): value is Record<string, string | string[]> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  const fields = Object.entries(spec.output);
  if (keys.length !== fields.length) return false;
  return fields.every(([key, type]) => {
    if (!Object.hasOwn(value, key)) return false;
    const field = (value as Record<string, unknown>)[key];
    return type === STRING ? typeof field === 'string'
      : Array.isArray(field) && field.every((item) => typeof item === 'string');
  });
}

export function define(spec: OperationSpec): OperationDefinition {
  return {
    name: spec.name,
    inputFields: Object.keys(spec.input.shape),
    validateInput(data) {
      const result = spec.input.safeParse(data);
      return result.success ? { ok: true } : { ok: false, violations: toViolations(result.error) };
    },
    outputSchema: spec.outputSchema,
    checkOutput(value) {
      return rawShape(spec, value) ? spec.normalizeAndCheck(value) : { ok: false, problem: 'shape' };
    },
    defaultMaxOutputTokens: spec.defaultMaxOutputTokens,
  };
}
