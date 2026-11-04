import { describe, expect, it } from 'vitest';
import { SETTINGS_DEFAULTS } from '../settings/index.js';
import { priceFor } from './plan-numbers.js';

describe('priceFor (launch prep B §3.5)', () => {
  it('returns the setting of the period, in dong', () => {
    const e = { ...SETTINGS_DEFAULTS.entitlements, proPrice1mVnd: 81000, proPrice3mVnd: 201000, proPrice12mVnd: 601000 };
    expect([1, 3, 12].map((months) => priceFor(e, months as 1 | 3 | 12))).toEqual([81000, 201000, 601000]);
  });

  it('follows the defaults 79.000, 199.000, 599.000', () => {
    expect([priceFor(SETTINGS_DEFAULTS.entitlements, 1), priceFor(SETTINGS_DEFAULTS.entitlements, 3), priceFor(SETTINGS_DEFAULTS.entitlements, 12)])
      .toEqual([79000, 199000, 599000]);
  });
});
