import { Body, Controller, Get, Inject, Patch, Req, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { ReminderPrefsService, type ReminderPrefsView } from './reminder-prefs.service.js';

const updateRemindersSchema = z.strictObject({ enabled: z.boolean() });

@Controller('me/reminders')
export class RemindersController {
  constructor(@Inject(ReminderPrefsService) private readonly prefs: ReminderPrefsService) {}

  @Get()
  get(@Req() req: RequestWithUser): Promise<ReminderPrefsView> {
    return this.prefs.get(req.user!.userId);
  }

  @Patch()
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  update(@Body({ schema: updateRemindersSchema }) body: z.infer<typeof updateRemindersSchema>, @Req() req: RequestWithUser) {
    return this.prefs.set(req.user!.userId, body.enabled);
  }
}
