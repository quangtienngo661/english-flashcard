import { bestPeriod, periodOffer } from './period-offer';

// The seeded prices (settings.definitions.ts) and the numbers Figma draws for them (M7 Figma B §1.3).
const SEEDED = { '1': 79000, '3': 199000, '12': 599000 };

describe('periodOffer and bestPeriod (M7 Figma B §1.3)', () => {
  it('1 month: no struck price, no saving, the price is the monthly price', () => {
    expect(periodOffer(SEEDED, '1')).toEqual({ price: 79000, struck: null, saving: null, perMonth: 79000 });
  });

  it('3 months: struck 3 × 79.000, saving 16 %, about 66.300 a month', () => {
    expect(periodOffer(SEEDED, '3')).toEqual({ price: 199000, struck: 237000, saving: 16, perMonth: 66300 });
  });

  it('12 months: struck 12 × 79.000, saving 37 %, about 49.900 a month', () => {
    expect(periodOffer(SEEDED, '12')).toEqual({ price: 599000, struck: 948000, saving: 37, perMonth: 49900 });
  });

  it('the best period is the one with the largest saving', () => {
    expect(bestPeriod(SEEDED)).toBe('12');
    expect(bestPeriod({ '1': 79000, '3': 150000, '12': 900000 })).toBe('3');
  });

  it('equal savings keep 3 months as the best period (the first that reaches the largest saving)', () => {
    const tie = { '1': 100000, '3': 240000, '12': 960000 };
    expect(periodOffer(tie, '3').saving).toBe(20);
    expect(periodOffer(tie, '12').saving).toBe(20);
    expect(bestPeriod(tie)).toBe('3');
  });

  it('a period that costs months × the monthly price, or more, has no struck price; none saves → no best period', () => {
    const flat = { '1': 79000, '3': 240000, '12': 948000 };
    expect(periodOffer(flat, '3')).toEqual({ price: 240000, struck: null, saving: null, perMonth: 80000 });
    expect(periodOffer(flat, '12')).toEqual({ price: 948000, struck: null, saving: null, perMonth: 79000 });
    expect(bestPeriod(flat)).toBeNull();
  });

  it('an admin sets 3 months above 3 × the monthly price (M8 Review Focus 3): no struck price, no saving pill', () => {
    const prices = { '1': 79000, '3': 240000, '12': 599000 };
    expect(periodOffer(prices, '3')).toEqual({ price: 240000, struck: null, saving: null, perMonth: 80000 });
    expect(periodOffer(prices, '12')).toEqual({ price: 599000, struck: 948000, saving: 37, perMonth: 49900 });
  });

  it('the monthly price rounds to the nearest 100 (66.350 → 66.400)', () => {
    expect(periodOffer({ '1': 100000, '3': 199050, '12': 900000 }, '3').perMonth).toBe(66400);
  });

  it('a saving that rounds to 0 % is no saving: no best period', () => {
    const tiny = { '1': 100000, '3': 299900, '12': 1200000 };
    expect(periodOffer(tiny, '3')).toEqual({ price: 299900, struck: 300000, saving: 0, perMonth: 100000 });
    expect(bestPeriod(tiny)).toBeNull();
  });
});
