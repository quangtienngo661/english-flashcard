import { MAX_OUTPUT_TOKENS_UPPER } from '../ai.constants.js';
import type { AiProviderName } from '../ai.types.js';

/** OpenAI's documented levels; its API cannot tell which ones a model takes (design §6.2). */
export const OPENAI_EFFORTS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const;
/** Anthropic refuses thinking `disabled` with these (design §6.2, ASSUMPTION for every model). */
const EFFORTS_NEEDING_THINKING = ['xhigh', 'max'];

/** Effort levels an admin may pick for a model; "mặc định" (null) is always allowed besides these. */
export function effortChoices(provider: AiProviderName, model: { effortLevels: string[] }): string[] {
  if (provider === 'openai') return [...OPENAI_EFFORTS];
  if (provider === 'anthropic') return [...model.effortLevels];
  return [];
}

/** Save rules of an operation's choice (design §6.2–6.3), as `<field>: <message>`; an empty limit is always allowed (D25, D28). */
export function selectionViolations(input: {
  provider: AiProviderName;
  model: { effortLevels: string[]; thinkingOff: string | null; maxOutputTokens: number | null };
  effort: string | null;
  thinking: 'off' | null;
  maxOutputTokens: number | null;
}): string[] {
  const violations: string[] = [];
  if (input.effort !== null && !effortChoices(input.provider, input.model).includes(input.effort)) {
    violations.push('effort: not offered by this model');
  }
  if (input.thinking === 'off') {
    if (input.provider !== 'anthropic' || input.model.thinkingOff === null) {
      violations.push('thinking: this model cannot turn thinking off');
    } else if (input.effort !== null && EFFORTS_NEEDING_THINKING.includes(input.effort)) {
      violations.push('thinking: off needs effort high or below');
    }
  }
  if (input.maxOutputTokens !== null) {
    const max = input.model.maxOutputTokens ?? MAX_OUTPUT_TOKENS_UPPER;
    if (input.maxOutputTokens < 1 || input.maxOutputTokens > max) violations.push(`max_output_tokens: Expected 1 to ${max}`);
  }
  return violations;
}
