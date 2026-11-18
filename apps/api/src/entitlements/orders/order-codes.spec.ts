import { describe, expect, it } from 'vitest';
import {
  ORDER_CODE_EPOCH_MS,
  ORDER_CODE_MAX,
  ORDER_CODE_MIN,
  ORDER_CODE_TIME_BASE,
  ORDER_CODES_PER_SECOND,
  expiredAtSeconds,
  orderCodeAt,
  orderCodeSecond,
  orderCodeSlots,
  orderDescription,
  paymentKeyManual,
  paymentKeyPayos,
} from './order-codes.js';

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

describe('time-based order codes', () => {
  // The last second whose 100 slots all fit under ORDER_CODE_MAX.
  const lastSecond = Math.floor((ORDER_CODE_MAX - ORDER_CODE_TIME_BASE - 99) / 100);

  it('pins the constants', () => {
    expect(ORDER_CODE_TIME_BASE).toBe(1_100_000_000);
    expect(ORDER_CODE_EPOCH_MS).toBe(1_794_873_600_000);
    expect(ORDER_CODES_PER_SECOND).toBe(100);
  });

  it('orderCodeSecond counts whole seconds from the epoch, rounded down', () => {
    expect(orderCodeSecond(new Date(ORDER_CODE_EPOCH_MS))).toBe(0);
    expect(orderCodeSecond(new Date(ORDER_CODE_EPOCH_MS + 1999))).toBe(1);
  });

  it('orderCodeAt is base + second * 100 + slot', () => {
    expect(orderCodeAt(0, 0)).toBe(1_100_000_000);
    expect(orderCodeAt(1, 0)).toBe(1_100_000_100);
    expect(orderCodeAt(1, 99)).toBe(1_100_000_199);
  });

  it('orderCodeAt refuses a slot or second out of range, or not an integer', () => {
    for (const [second, slot] of [[0, 100], [0, -1], [-1, 0], [0, 1.5], [1.5, 0], [Number.NaN, 0]]) {
      expect(() => orderCodeAt(second, slot), `${second},${slot}`).toThrow(RangeError);
    }
  });

  it('the last second still fits in ORDER_CODE_MAX and the next second is refused', () => {
    expect(lastSecond).toBe(332_597_382);
    expect(orderCodeAt(lastSecond, 99)).toBe(34_359_738_299);
    expect(orderCodeAt(lastSecond, 99)).toBeLessThanOrEqual(ORDER_CODE_MAX);
    // Slot 0 of the next second is under ORDER_CODE_MAX, but the second is refused: its slot 99 would not fit.
    expect(orderCodeAt(lastSecond, 99) + 1).toBeLessThanOrEqual(ORDER_CODE_MAX);
    expect(() => orderCodeAt(lastSecond + 1, 0)).toThrow(RangeError);
  });

  it('the last code still makes a 9-character description', () => {
    expect(orderDescription(orderCodeAt(lastSecond, 99))).toHaveLength(9);
  });

  it('codes grow strictly with (second, slot) and all sit above the old sequence range', () => {
    const seconds = [0, 1, 2, lastSecond - 1, lastSecond];
    const slots = [0, 1, 98, 99];
    const codes = seconds.flatMap((second) => slots.map((slot) => orderCodeAt(second, slot)));
    for (let i = 0; i < codes.length; i++) {
      expect(codes[i]).toBeGreaterThanOrEqual(ORDER_CODE_TIME_BASE);
      expect(codes[i]).toBeGreaterThan(ORDER_CODE_MIN);
      if (i > 0) expect(codes[i]).toBeGreaterThan(codes[i - 1]);
    }
  });

  it('orderCodeSlots gives the first and last code of a second', () => {
    expect(orderCodeSlots(3)).toEqual({ first: 1_100_000_300, last: 1_100_000_399 });
  });
});
