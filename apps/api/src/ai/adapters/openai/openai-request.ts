import type OpenAI from 'openai';
import type { AdapterRequest } from '../ai-adapter.js';

type OpenAiEffort = Exclude<OpenAI.ReasoningEffort, null>;
const OPENAI_EFFORTS: readonly string[] = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] satisfies OpenAiEffort[];

function isOpenAiEffort(effort: string | null): effort is OpenAiEffort {
  return effort !== null && OPENAI_EFFORTS.includes(effort);
}

/**
 * Design §4.3: the data travel only in the user message as JSON, never inside the instructions; `store: false`; nothing that
 * identifies a user (no `user`, `metadata`, `safety_identifier`) and no `temperature` (F29, AR7). `reasoning` only for an
 * effort OpenAI knows (plan review #22; an OpenAI model has no known effort levels, plan choice 9, so it is null in practice).
 */
export function buildOpenAiRequest(req: AdapterRequest): OpenAI.Responses.ResponseCreateParamsNonStreaming {
  return {
    model: req.model,
    instructions: req.instructions,
    input: [{ role: 'user', content: JSON.stringify(req.data) }],
    text: { format: { type: 'json_schema', name: req.schema.name, strict: true, schema: req.schema.schema } },
    store: false,
    ...(isOpenAiEffort(req.effort) ? { reasoning: { effort: req.effort } } : {}),
    ...(req.maxOutputTokens === null ? {} : { max_output_tokens: req.maxOutputTokens }),
  };
}
