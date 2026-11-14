import { describe, expect, it } from 'vitest';
import { callCost, estimateCost } from './cost.js';

const luna = { input: 0.1, cachedInput: null, output: 0.5 };
const mid = { input: 2, cachedInput: null, output: 10 };

describe('callCost', () => {
  it('gpt-6-luna 0.10/0.50: 600 in, 500 out → 0.00031000 USD', () => {
    expect(callCost({ inputTokens: 600, cachedInputTokens: 0, outputTokens: 500 }, luna)).toEqual({
      costUsd: '0.00031000', known: true,
    });
  });

  it('2/10: 600 in, 500 out → 0.00620000 USD', () => {
    expect(callCost({ inputTokens: 600, cachedInputTokens: 0, outputTokens: 500 }, mid)).toEqual({
      costUsd: '0.00620000', known: true,
    });
  });

  it('cached tokens at the cached price', () => {
    // 400 × 2 + 200 × 0.5 + 500 × 10 = 5 900 per million.
    expect(callCost({ inputTokens: 600, cachedInputTokens: 200, outputTokens: 500 }, { ...mid, cachedInput: 0.5 })).toEqual({
      costUsd: '0.00590000', known: true,
    });
  });

  it('cached tokens at the input price when the model has no cached price', () => {
    expect(callCost({ inputTokens: 600, cachedInputTokens: 200, outputTokens: 500 }, mid)).toEqual({
      costUsd: '0.00620000', known: true,
    });
  });

  it('no price → unknown', () => {
    expect(callCost({ inputTokens: 600, cachedInputTokens: 0, outputTokens: 500 }, null)).toEqual({ costUsd: null, known: false });
  });

  it('no usage → unknown', () => {
    expect(callCost(null, mid)).toEqual({ costUsd: null, known: false });
  });

  it('zero tokens → 0.00000000 USD, known', () => {
    expect(callCost({ inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 }, mid)).toEqual({ costUsd: '0.00000000', known: true });
  });
});

describe('estimateCost (design §6.6)', () => {
  it('gpt-6-luna 0.10/0.50 → 0.00031000 USD, 8 VND per call', () => {
    const estimate = estimateCost(luna, null, 26_100);
    expect(estimate?.per_call_usd).toBe('0.00031000');
    expect(estimate?.per_call_vnd).toBe(8);
  });

  it('2/10 → 0.00620000 USD, 162 VND per call, 161 820 VND for 1 000 calls a day', () => {
    const estimate = estimateCost(mid, 1_200, 26_100);
    expect(estimate?.per_call_usd).toBe('0.00620000');
    expect(estimate?.per_call_vnd).toBe(162);
    expect(estimate?.per_day_1000_vnd).toBe(161_820);
  });

  it('max call with 128 000 tokens at 2/10 → 1.28120000 USD, 33 439 VND', () => {
    const estimate = estimateCost(mid, 128_000, 26_100);
    expect(estimate?.max_call_usd).toBe('1.28120000');
    expect(estimate?.max_call_vnd).toBe(33_439);
  });

  it('unknown max → max_call null', () => {
    const estimate = estimateCost(mid, null, 26_100);
    expect(estimate?.max_call_usd).toBeNull();
    expect(estimate?.max_call_vnd).toBeNull();
  });

  it('no price → null', () => {
    expect(estimateCost(null, 1_200, 26_100)).toBeNull();
  });
});
