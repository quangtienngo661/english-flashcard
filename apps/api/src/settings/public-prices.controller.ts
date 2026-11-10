import { Controller, Get, Inject } from '@nestjs/common';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { Public } from '../identity/sessions/public.decorator.js';
import { SettingsService } from './settings.service.js';

export type PublicPrices = { currency: 'VND'; prices: { '1': number; '3': number; '12': number } };

/**
 * The Pro prices for the landing page, read at web build time (design giao diện mới §10.6). Same settings as
 * `GET /v1/me/app-config`; public, limited per IP.
 */
@Controller('public/prices')
export class PublicPricesController {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  @Get()
  @Public()
  @RateLimit('public.prices.ip')
  async prices(): Promise<PublicPrices> {
    const { entitlements: e } = await this.settings.get();
    return { currency: 'VND', prices: { '1': e.proPrice1mVnd, '3': e.proPrice3mVnd, '12': e.proPrice12mVnd } };
  }
}
