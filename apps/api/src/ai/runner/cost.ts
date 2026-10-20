import { ESTIMATE_DAILY_CALLS, ESTIMATE_INPUT_TOKENS, ESTIMATE_OUTPUT_TOKENS } from '../ai.constants.js';

// Cost of a call and the estimates shown next to a choice (design §6.6, §9). Prices are USD per million tokens.

export type Price = { input: number; cachedInput: number | null; output: number };

export type CostEstimate = {
  per_call_usd: string;
  per_call_vnd: number;
  per_day_1000_vnd: number;
  max_call_usd: string | null;
  max_call_vnd: number | null;
};

const USD_DECIMALS = 8;

function usd(usage: { inputTokens: number; cachedInputTokens: number; outputTokens: number }, price: Price): number {
  const cached = usage.cachedInputTokens;
  return ((usage.inputTokens - cached) * price.input + cached * (price.cachedInput ?? price.input) + usage.outputTokens * price.output)
    / 1e6;
}

/** `inputTokens` includes the cached ones; unknown usage or price → unknown cost. */
export function callCost(
  usage: { inputTokens: number; cachedInputTokens: number; outputTokens: number } | null,
  price: Price | null,
): { costUsd: string | null; known: boolean } {
  if (!usage || !price) return { costUsd: null, known: false };
  return { costUsd: usd(usage, price).toFixed(USD_DECIMALS), known: true };
}

/** One typical call (600 in + 500 out), 1 000 of them a day, and the dearest call the token limit allows; null without a price. */
export function estimateCost(price: Price | null, maxOutputTokens: number | null, usdVndRate: number): CostEstimate | null {
  if (!price) return null;
  const perCall = usd({ inputTokens: ESTIMATE_INPUT_TOKENS, cachedInputTokens: 0, outputTokens: ESTIMATE_OUTPUT_TOKENS }, price);
  const maxCall = maxOutputTokens === null
    ? null
    : usd({ inputTokens: ESTIMATE_INPUT_TOKENS, cachedInputTokens: 0, outputTokens: maxOutputTokens }, price);
  return {
    per_call_usd: perCall.toFixed(USD_DECIMALS),
    per_call_vnd: Math.round(perCall * usdVndRate),
    per_day_1000_vnd: Math.round(perCall * ESTIMATE_DAILY_CALLS * usdVndRate),
    max_call_usd: maxCall === null ? null : maxCall.toFixed(USD_DECIMALS),
    max_call_vnd: maxCall === null ? null : Math.round(maxCall * usdVndRate),
  };
}
