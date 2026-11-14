import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { RequestWithUser } from '../common/request-user/request-user.js';
import { appConfigView, type AppConfigView } from './app-config.view.js';
import { SettingsService } from './settings.service.js';

/**
 * `GET /v1/me/app-config` (design §8.7): signed-in only, **without** `@LearnerContent()` (GG4) — a new account that has not
 * chosen a language reads it too. Read on every request, so an admin change shows at once (GG1).
 */
@Controller('me/app-config')
export class MeAppConfigController {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  @Get()
  async read(@Req() _req: RequestWithUser): Promise<AppConfigView> {
    return appConfigView(await this.settings.get());
  }
}
