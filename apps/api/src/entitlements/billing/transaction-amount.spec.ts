import { describe, expect, it } from 'vitest';
import { toMinorUnits } from './transaction-amount.js';

describe('toMinorUnits (design §8.9: money in the smallest unit)', () => {
  it('uses the currency\'s fraction digits', () => {
    expect(toMinorUnits(99000, 'VND')).toBe(99000);
    expect(toMinorUnits(4.99, 'USD')).toBe(499);
    expect(toMinorUnits(19.9, 'EUR')).toBe(1990);
    expect(toMinorUnits(1.234, 'KWD')).toBe(1234);
    expect(toMinorUnits(500, 'JPY')).toBe(500);
  });

  it('rounds a float error to the nearest unit', () => {
    expect(toMinorUnits(0.1 + 0.2, 'USD')).toBe(30);
  });
});
