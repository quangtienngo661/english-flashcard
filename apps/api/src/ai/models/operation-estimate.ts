import type { AiProviderName } from '../ai.types.js';
import { estimateCost, type CostEstimate } from '../runner/cost.js';
import { resolveMaxOutputTokens } from '../runner/run-rules.js';

type Decimalish = { toString(): string } | null;

/** The part of an `ai_models` row an estimate needs. */
export type EstimateModel = {
  provider: string; maxOutputTokens: number | null; priceInput: Decimalish; priceCachedInput: Decimalish; priceOutput: Decimalish;
};

/**
 * What the dearest call of an operation costs: the operation's own token limit, else for Anthropic the model's maximum or 16 000 (D25, D28).
 * Shared by the operation settings and the configs (the same estimate on either screen).
 */
export function operationEstimate(model: EstimateModel | null, maxOutputTokens: number | null, usdVndRate: number): CostEstimate | null {
  if (!model) return null;
  const price = model.priceInput !== null && model.priceOutput !== null
    ? {
        input: Number(model.priceInput), output: Number(model.priceOutput),
        cachedInput: model.priceCachedInput !== null ? Number(model.priceCachedInput) : null,
      }
    : null;
  return estimateCost(price, resolveMaxOutputTokens(model.provider as AiProviderName, maxOutputTokens, model.maxOutputTokens), usdVndRate);
}
