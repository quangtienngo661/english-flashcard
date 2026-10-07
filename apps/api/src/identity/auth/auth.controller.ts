import { Body, Controller, HttpCode, Inject, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { Public } from '../sessions/public.decorator.js';
import { writeSession, type TokenResponse } from '../sessions/session-transport.js';
import { loginSchema, registerSchema, type LoginBody, type RegisterBody } from './auth.schemas.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  @Post('register')
  @HttpCode(201)
  @Public()
  @RateLimit('auth.register.ip', 'mail.ip.daily')
  async register(
    @Body({ schema: registerSchema }) body: RegisterBody,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponse> {
    const session = await this.auth.register(body, res);
    return writeSession(res, session, this.clock.now(), this.config.jwt.accessTtlSeconds);
  }

  @Post('login')
  @HttpCode(200)
  @Public()
  @RateLimit('auth.login.ip')
  async login(
    @Body({ schema: loginSchema }) body: LoginBody,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponse> {
    const session = await this.auth.login(body);
    return writeSession(res, session, this.clock.now(), this.config.jwt.accessTtlSeconds);
  }
}
