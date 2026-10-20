import { createHash } from 'node:crypto';
import { AI_SCHEMA_VERSION } from '../ai.constants.js';
import type { AiOperation } from '../ai.types.js';

/** JSON with object keys sorted at every depth; arrays keep their order. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** What makes one operation id "the same request" (design §8.2): not the prompt, not the model (B6E23). */
export function fingerprint(op: AiOperation, data: unknown): string {
  return createHash('sha256').update(canonical({ operation: op, schema_version: AI_SCHEMA_VERSION, data })).digest('hex');
}
