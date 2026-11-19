import { Controller, Get, Inject } from '@nestjs/common';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { Public } from '../identity/sessions/public.decorator.js';
import { SettingsService } from './settings.service.js';

export type PublicPrices = {
  currency: 'VND';
  prices: { '1': number; '3': number; '12': number };
  /** Owner 19/11/2026: the landing's pricing rows follow the admin's numbers. */
  practice_sessions_per_day: { free: number; pro: number };
};

/**
 * The Pro prices and each plan's practice sessions per day for the landing page, read at web build time (design giao diện mới §10.6)
 * and again by the browser on each view (owner 19/11/2026). Same settings as
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
    return {
      currency: 'VND',
      prices: { '1': e.proPrice1mVnd, '3': e.proPrice3mVnd, '12': e.proPrice12mVnd },
      practice_sessions_per_day: { free: e.freePracticeSessionsPerDay, pro: e.proPracticeSessionsPerDay },
    };
  }
}
