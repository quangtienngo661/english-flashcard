import { Body, Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { Public } from '../sessions/public.decorator.js';
import { OtpService } from './otp.service.js';
import { otpRequestSchema, verifyEmailSchema, type OtpRequest, type VerifyEmailBody } from './otp.schemas.js';

@Controller('auth')
export class OtpController {
  constructor(@Inject(OtpService) private readonly otp: OtpService) {}

  @Post('otp')
  @HttpCode(202)
  @Public()
  @RateLimit('auth.otp.ip', 'mail.ip.daily')
  async requestOtp(
    @Body({ schema: otpRequestSchema }) body: OtpRequest,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Record<string, never>> {
    if (body.purpose === 'reset_password') {
      await this.otp.requestPasswordReset(body.email, res);
    } else {
      if (!req.user) {
        throw new ProblemDetailsException({ status: 401, title: 'Invalid token', type: 'invalid-token' });
      }
      await this.otp.requestVerifyEmail(req.user, res);
    }
    return {};
  }

  @Post('verify-email')
  @HttpCode(200)
  @RateLimit('user.write')
  verifyEmail(
    @Body({ schema: verifyEmailSchema }) body: VerifyEmailBody,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ email_verified: true }> {
    // The global AuthGuard requires a user for this authenticated route.
    return this.otp.verifyEmail(req.user!, body.code, res);
  }
}
