import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { AiOperation } from '../ai.types.js';
import type { PromptExample } from '../prompts/prompt-rules.js';

export const configContentSchema = z.strictObject({
  instructions: z.string(), examples: z.array(z.strictObject({ input: z.record(z.string(), z.unknown()), output: z.record(z.string(), z.unknown()) })),
  model_ref: z.uuid().transform((id) => id.toLowerCase()).nullable(), effort: z.string().min(1).max(20).nullable(), thinking: z.literal('off').nullable(),
  max_output_tokens: z.number().int().nullable(),
});
export type ConfigContent = z.infer<typeof configContentSchema>;

/** Sorting object keys is safe; rewriting prompt strings or the order of few-shot examples is not. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, canonical(child)]));
  return value;
}
export function configFingerprint(operation: AiOperation, content: ConfigContent): string {
  return createHash('sha256').update(JSON.stringify(canonical({ operation, ...content }))).digest('hex');
}
export function contentOfConfig(row: { instructions: string; examples: unknown; modelRef: string | null; effort: string | null; thinking: string | null; maxOutputTokens: number | null; [key: string]: unknown }): ConfigContent {
  return { instructions: row.instructions, examples: row.examples as PromptExample[], model_ref: row.modelRef, effort: row.effort, thinking: row.thinking === 'off' ? 'off' : null, max_output_tokens: row.maxOutputTokens };
}
