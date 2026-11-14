import { Body, Controller, Get, HttpCode, Inject, Post, Query, Req, Res } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { Public } from '../sessions/public.decorator.js';
import { googleCompleteSchema, reauthSchema, type GoogleCompleteBody, type ReauthBody } from './google.schemas.js';
import { writeSession } from '../sessions/session-transport.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { GoogleAuthService, OAUTH_COOKIE_TTL_S, REAUTH_COOKIE_TTL_S, SIGNUP_COOKIE_TTL_S } from './google-auth.service.js';

export const OAUTH_COOKIE = 'google_oauth';
export const SIGNUP_COOKIE = 'google_signup';
export const REAUTH_COOKIE = 'google_reauth';
/** Read only by the delete route (D25), so its path is that route's folder. */
export const REAUTH_COOKIE_OPTIONS: CookieOptions = { httpOnly: true, secure: true, sameSite: 'lax', path: '/v1/me/account' };
/** `Lax`, not `Strict`: Google brings the browser back by a navigation from another site, and a Strict cookie is not sent then (design §5.3). */
export const GOOGLE_COOKIE_OPTIONS: CookieOptions = { httpOnly: true, secure: true, sameSite: 'lax', path: '/v1/auth/google' };

@Controller('auth/google')
export class GoogleAuthController {
  constructor(
    @Inject(GoogleAuthService) private readonly google: GoogleAuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
  ) {}

  /**
   * `start` and `callback` are page navigations, so a rate limit sends the browser back to the app instead of showing a 429 JSON page
   * (final review M8). Any other failure still propagates.
   */
  private async limited(req: Request): Promise<boolean> {
    if (!req.ip) return false;
    try {
      await this.limiter.hit('auth.google.ip', req.ip);
      return false;
    } catch (error) {
      if (error instanceof ProblemDetailsException && error.getStatus() === 429) return true;
      throw error;
    }
  }

  @Get('start')
  @Public()
  async start(@Query() query: Record<string, unknown>, @Req() req: Request, @Res() res: Response): Promise<void> {
    if (await this.limited(req)) {
      res.redirect(302, this.google.busy({ locale: query.locale, intent: query.intent }).location);
      return;
    }
    const result = await this.google.start({ locale: query.locale, next: query.next, intent: query.intent, ticket: query.ticket });
    if (result.oauthCookie) res.cookie(OAUTH_COOKIE, result.oauthCookie, { ...GOOGLE_COOKIE_OPTIONS, maxAge: OAUTH_COOKIE_TTL_S * 1000 });
    res.redirect(302, result.location);
  }

  @Get('callback')
  @Public()
  async callback(@Query() query: Record<string, unknown>, @Req() req: Request, @Res() res: Response): Promise<void> {
    const cookie: unknown = req.cookies?.[OAUTH_COOKIE];
    if (await this.limited(req)) {
      res.clearCookie(OAUTH_COOKIE, GOOGLE_COOKIE_OPTIONS);
      res.redirect(302, this.google.busy({ oauthCookie: typeof cookie === 'string' ? cookie : undefined }).location);
      return;
    }
    const result = await this.google.callback(
      { code: query.code, state: query.state, error: query.error, oauthCookie: typeof cookie === 'string' ? cookie : undefined }, res,
    );
    // The state is single use, whatever the outcome.
    res.clearCookie(OAUTH_COOKIE, GOOGLE_COOKIE_OPTIONS);
    if (result.signupCookie) res.cookie(SIGNUP_COOKIE, result.signupCookie, { ...GOOGLE_COOKIE_OPTIONS, maxAge: SIGNUP_COOKIE_TTL_S * 1000 });
    if (result.reauthCookie) res.cookie(REAUTH_COOKIE, result.reauthCookie, { ...REAUTH_COOKIE_OPTIONS, maxAge: REAUTH_COOKIE_TTL_S * 1000 });
    if (result.session) writeSession(res, result.session, this.clock.now(), this.config.jwt.accessTtlSeconds);
    res.redirect(302, result.location);
  }

  /** A Google-only learner proves the account before deleting: the URL the web navigates to (design §5.9). */
  @Post('reauth')
  @HttpCode(200)
  @RateLimit('user.write')
  async reauth(@Body({ schema: reauthSchema }) body: ReauthBody, @Req() req: RequestWithUser): Promise<{ start_url: string }> {
    return { start_url: await this.google.reauthStartUrl(req.user!.userId, body.locale) };
  }

  /** What the sign-up page shows: the email, and whether Google sent no usable first name. */
  @Get('complete')
  @Public()
  @RateLimit('auth.google.ip')
  completeInfo(@Req() req: Request): { email: string; needs_name: boolean } {
    return this.google.completeInfo(signupCookieOf(req));
  }

  @Post('complete')
  @Public()
  @HttpCode(200)
  @RateLimit('auth.register.ip')
  async complete(
    @Body({ schema: googleCompleteSchema }) body: GoogleCompleteBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Like every route that reads a cookie: the custom header keeps a cross-site form from posting here (session-transport.ts).
    if (req.get('X-CSRF-Protection') !== '1') {
      throw new ProblemDetailsException({ status: 403, title: 'CSRF header required', type: 'csrf-header-required' });
    }
    const session = await this.google.complete(signupCookieOf(req), body, res);
    return writeSession(res, session, this.clock.now(), this.config.jwt.accessTtlSeconds);
  }
}

function signupCookieOf(req: Request): string | undefined {
  const cookie: unknown = req.cookies?.[SIGNUP_COOKIE];
  return typeof cookie === 'string' ? cookie : undefined;
}
