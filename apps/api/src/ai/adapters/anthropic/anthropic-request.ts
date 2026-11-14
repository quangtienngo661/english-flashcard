import type Anthropic from '@anthropic-ai/sdk';
import type { AdapterRequest } from '../ai-adapter.js';

type AnthropicEffort = Exclude<Anthropic.Messages.OutputConfig['effort'], null | undefined>;
const ANTHROPIC_EFFORTS: readonly string[] = ['low', 'medium', 'high', 'xhigh', 'max'] satisfies AnthropicEffort[];

function isAnthropicEffort(effort: string | null): effort is AnthropicEffort {
  return effort !== null && ANTHROPIC_EFFORTS.includes(effort);
}

/**
 * Design §4.3: the data travel only in the user message as JSON, never inside `system`; no `metadata` (nothing that
 * identifies a user) and no `temperature` (F29, AR7). `effort` only for a level Anthropic knows (plan review #22); Task 13
 * only lets an admin choose a level the model lists. The caller resolves `max_tokens` (D28).
 */
export function buildAnthropicRequest(req: AdapterRequest & { maxOutputTokens: number }): Anthropic.Messages.MessageCreateParamsNonStreaming {
  return {
    model: req.model,
    system: req.instructions,
    messages: [{ role: 'user', content: JSON.stringify(req.data) }],
    output_config: {
      format: { type: 'json_schema', schema: req.schema.schema },
      ...(isAnthropicEffort(req.effort) ? { effort: req.effort } : {}),
    },
    ...(req.thinking === null ? {} : { thinking: { type: req.thinking } }),
    max_tokens: req.maxOutputTokens,
  };
}
