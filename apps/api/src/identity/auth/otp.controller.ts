import { Body, Controller, HttpCode, Inject, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { Public } from '../sessions/public.decorator.js';
import { writeSession, type TokenResponse } from '../sessions/session-transport.js';
import { AuthService } from './auth.service.js';
import { OtpService } from './otp.service.js';
import { otpRequestSchema, verifyEmailSchema, type OtpRequest, type VerifyEmailBody } from './otp.schemas.js';

@Controller('auth')
export class OtpController {
  constructor(
    @Inject(OtpService) private readonly otp: OtpService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  @Post('otp')
  @HttpCode(202)
  @Public()
  @RateLimit('auth.otp.ip', 'mail.ip.daily')
  async requestOtp(
    @Body({ schema: otpRequestSchema }) body: OtpRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Record<string, never>> {
    if (body.purpose === 'reset_password') {
      await this.otp.requestPasswordReset(body.email, res);
    } else {
      await this.otp.requestVerifyEmail(body.email, res);
    }
    return {};
  }

  @Post('verify-email')
  @HttpCode(200)
  @Public()
  @RateLimit('auth.verify.ip')
  async verifyEmail(
    @Body({ schema: verifyEmailSchema }) body: VerifyEmailBody,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponse> {
    const session = await this.auth.verifyEmail(body, res);
    return writeSession(res, session, this.clock.now(), this.config.jwt.accessTtlSeconds);
  }
}
