import { describe, expect, it } from 'vitest';
import { IS_PUBLIC_KEY } from '../identity/sessions/public.decorator.js';
import { RATE_LIMIT_KEY } from '../common/rate-limit/rate-limit.decorator.js';
import { PublicPricesController } from './public-prices.controller.js';
import { SETTINGS_DEFAULTS, type AppSettings } from './settings.definitions.js';
import type { SettingsService } from './settings.service.js';

describe('GET /v1/public/prices (giao diện mới §10.6)', () => {
  it('returns the Pro prices from the settings, exactly', async () => {
    const controller = new PublicPricesController({ get: async () => SETTINGS_DEFAULTS } as unknown as SettingsService);
    expect(await controller.prices()).toEqual({ currency: 'VND', prices: { '1': 79000, '3': 199000, '12': 599000 } });
  });

  it('follows an admin change at once', async () => {
    const values: AppSettings = {
      ...SETTINGS_DEFAULTS,
      entitlements: { ...SETTINGS_DEFAULTS.entitlements, proPrice1mVnd: 89000 },
    };
    const controller = new PublicPricesController({ get: async () => values } as unknown as SettingsService);
    expect((await controller.prices()).prices['1']).toBe(89000);
  });

  it('is public and limited by IP with public.prices.ip', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, PublicPricesController.prototype.prices)).toBe(true);
    expect(Reflect.getMetadata(RATE_LIMIT_KEY, PublicPricesController.prototype.prices)).toEqual(['public.prices.ip']);
  });
});
