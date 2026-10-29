import { describe, expect, it } from 'vitest';
import { estimateCost } from '../runner/cost.js';
import { resolveMaxOutputTokens } from '../runner/run-rules.js';
import { operationEstimate } from './operation-estimate.js';

const MODEL = {
  provider: 'openai', maxOutputTokens: 64_000, priceInput: { toString: () => '0.1' }, priceCachedInput: null, priceOutput: { toString: () => '0.5' },
};

describe('operationEstimate (the dearest call of an operation, D25, D28)', () => {
  it('no model → no estimate', () => {
    expect(operationEstimate(null, null, 26_100)).toBeNull();
  });

  it('equals estimateCost over the price and the resolved token limit', () => {
    const expected = estimateCost({ input: 0.1, cachedInput: null, output: 0.5 }, resolveMaxOutputTokens('openai', 1_200, 64_000), 26_100);
    expect(operationEstimate(MODEL, 1_200, 26_100)).toEqual(expected);
    expect(expected).not.toBeNull();
  });

  it('a model without a full price keeps the call shape but no money', () => {
    const noPrice = { ...MODEL, priceOutput: null };
    expect(operationEstimate(noPrice, 1_200, 26_100)).toEqual(estimateCost(null, resolveMaxOutputTokens('openai', 1_200, 64_000), 26_100));
  });

  it('the cached price is carried when the model has one', () => {
    const cached = { ...MODEL, priceCachedInput: { toString: () => '0.01' } };
    expect(operationEstimate(cached, null, 26_100)).toEqual(
      estimateCost({ input: 0.1, cachedInput: 0.01, output: 0.5 }, resolveMaxOutputTokens('openai', null, 64_000), 26_100),
    );
  });
});
