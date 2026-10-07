import { Body, Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { Public } from './public.decorator.js';
import { clearSessionCookie, readRefreshToken, writeSession, type TokenResponse } from './session-transport.js';
import { SessionService } from './session.service.js';
import { refreshBodySchema, type RefreshBody } from './sessions.schemas.js';

@Controller('auth')
export class SessionsController {
  constructor(
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Post('refresh')
  @HttpCode(200)
  @Public()
  @RateLimit('auth.refresh.ip')
  async refresh(
    @Body({ schema: refreshBodySchema }) _body: RefreshBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponse> {
    const input = readRefreshToken(req);
    if (!input) {
      throw new ProblemDetailsException({ status: 401, title: 'Invalid token', type: 'invalid-token' });
    }
    const session = await this.sessions.refresh(input.token, input.path);
    return writeSession(res, session, this.clock.now(), this.config.jwt.accessTtlSeconds);
  }

  @Post('logout')
  @HttpCode(204)
  @Public()
  @RateLimit('auth.logout.ip')
  async logout(
    @Body({ schema: refreshBodySchema }) _body: RefreshBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const input = readRefreshToken(req);
    if (!input) return;
    await this.sessions.revokeByRefreshToken(input.token, input.path);
    if (input.path === 'web') clearSessionCookie(res);
  }
}
