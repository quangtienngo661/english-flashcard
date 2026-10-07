import { Body, Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { Public } from '../sessions/public.decorator.js';
import { writeSession, type TokenResponse } from '../sessions/session-transport.js';
import { changeSchema, resetSchema, type ChangeBody, type ResetBody } from './password.schemas.js';
import { PasswordService } from './password.service.js';

@Controller('auth/password')
export class PasswordController {
  constructor(
    @Inject(PasswordService) private readonly passwords: PasswordService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  @Post('change')
  @HttpCode(200)
  @RateLimit('user.write')
  async change(
    @Body({ schema: changeSchema }) body: ChangeBody,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponse> {
    const session = await this.passwords.change(req.user!, body, res);
    return writeSession(res, session, this.clock.now(), this.config.jwt.accessTtlSeconds);
  }

  @Post('reset')
  @HttpCode(204)
  @Public()
  @RateLimit('auth.reset.ip')
  reset(
    @Body({ schema: resetSchema }) body: ResetBody,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.passwords.reset(body, res);
  }
}
