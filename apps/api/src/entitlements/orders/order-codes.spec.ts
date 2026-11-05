import { describe, expect, it } from 'vitest';
import { expiredAtSeconds, orderDescription, paymentKeyManual, paymentKeyPayos } from './order-codes.js';

const MIN = 1_000_000_000;
const MAX = 34_359_738_367;

describe('orderDescription (design §3.5)', () => {
  it("is 'WM' plus the order code in 7 base32 Crockford characters", () => {
    expect(orderDescription(1_000_000_123)).toBe('WM0XSNJKV');
    expect(orderDescription(MIN)).toBe('WM0XSNJG0');
  });

  it('is 9 characters from the Crockford alphabet (no I, L, O, U) for the smallest, the largest and codes between', () => {
    for (const code of [MIN, MIN + 1, 2_000_000_000, 12_345_678_901, MAX - 1, MAX]) {
      expect(orderDescription(code), String(code)).toMatch(/^WM[0-9A-HJKMNP-TV-Z]{7}$/);
    }
    expect(orderDescription(MAX)).toBe('WMZZZZZZZ');
  });

  it('gives every code its own description and keeps the order of the codes', () => {
    const codes = [MIN, MIN + 1, MIN + 31, MIN + 32, 5_000_000_000, MAX];
    const descriptions = codes.map(orderDescription);
    expect(new Set(descriptions).size).toBe(codes.length);
    expect([...descriptions].sort()).toEqual(descriptions);
  });

  it('refuses a code outside the range the migration allows', () => {
    for (const bad of [MIN - 1, 123, 0, -5, MAX + 1, 1.5, Number.NaN]) {
      expect(() => orderDescription(bad), String(bad)).toThrow(/order code/);
    }
  });
});

describe('expiredAtSeconds (design §3.1)', () => {
  it('is the whole seconds of the instant, rounded down', () => {
    expect(expiredAtSeconds(new Date('2026-11-05T03:02:00.000Z'))).toBe(1_793_847_720);
    expect(expiredAtSeconds(new Date('2026-11-05T03:02:00.999Z'))).toBe(1_793_847_720);
    expect(expiredAtSeconds(new Date('2026-11-05T03:02:01.000Z'))).toBe(1_793_847_721);
  });
});

describe('payment keys (design §3.4)', () => {
  it('payos: names the environment, the order code and the bank reference', () => {
    expect(paymentKeyPayos('production', 1_000_000_123, 'FT26309ABC')).toBe('payos:production:1000000123:FT26309ABC');
    expect(paymentKeyPayos('sandbox', 1_000_000_123, 'FT26309ABC')).toBe('payos:sandbox:1000000123:FT26309ABC');
  });

  it('two orders with the same bank reference are two payments', () => {
    expect(paymentKeyPayos('production', 1_000_000_123, 'REF')).not.toBe(paymentKeyPayos('production', 1_000_000_124, 'REF'));
  });

  it('manual: one per order', () => {
    expect(paymentKeyManual('0b9f0e2a-1111-4222-8333-444455556666')).toBe('manual:0b9f0e2a-1111-4222-8333-444455556666');
  });
});
