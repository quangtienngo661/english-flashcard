import { Body, Controller, Get, Inject, Put, Query, Req, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../common/request-user/request-user.js';
import { RequirePermission } from '../identity/staff/require-permission.decorator.js';
import { SETTINGS_BOUNDS, SETTINGS_DEFAULTS, settingsValuesPatchSchema, toApiValues } from './settings.definitions.js';
import { SettingsService } from './settings.service.js';

const putSettingsSchema = z.strictObject({ version: z.number().int().min(0), values: settingsValuesPatchSchema });
const historyQuerySchema = z.strictObject({
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  page_token: z.string().optional(),
});

@Controller('admin/settings')
@RequirePermission('settings.manage')
export class AdminSettingsController {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  @Get()
  async read() {
    const { version, values } = await this.settings.current();
    return { version, values: toApiValues(values), defaults: toApiValues(SETTINGS_DEFAULTS), bounds: SETTINGS_BOUNDS };
  }

  @Put()
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  async update(@Body({ schema: putSettingsSchema }) body: z.infer<typeof putSettingsSchema>, @Req() req: RequestWithUser) {
    const { version, values } = await this.settings.update(req.user!.userId, body.version, body.values);
    return { version, values: toApiValues(values) };
  }

  @Get('history')
  history(@Query({ schema: historyQuerySchema }) query: z.infer<typeof historyQuerySchema>) {
    return this.settings.history(query.page_size, query.page_token);
  }
}
