import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { TurnstileClient } from './turnstile-client.js';

/** What a route does when Cloudflare cannot be asked: `reject` answers 503; `bypass` lets the request through (login only, DA12 round 2). */
export const TURNSTILE_ON_UNAVAILABLE = 'turnstileOnUnavailable';
export type TurnstileOnUnavailable = 'reject' | 'bypass';

const MAX_TOKEN_LENGTH = 2048;

/**
 * The bot check in front of register, login and OTP requests (launch prep A, design 4.1). It runs before the body pipe, so it
 * checks the token shape itself. A bad token is refused before `RateLimitGuard` counts the route, so tokens made up by a bot never
 * eat the budget of a real person.
 */
@Injectable()
export class TurnstileGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(TurnstileClient) private readonly client: TurnstileClient,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { mode, allowedHostnames } = this.config.turnstile;
    if (mode === 'off') return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = (request.body as { turnstile_token?: unknown } | undefined | null)?.turnstile_token;
    if (typeof token !== 'string' || token.length < 1 || token.length > MAX_TOKEN_LENGTH) {
      throw new ProblemDetailsException({
        status: 400, type: 'validation-failed', title: 'Validation failed',
        extensions: { violations: ['turnstile_token: Must be a string of 1 to 2048 characters'] },
      });
    }
    // Only the real mode calls Cloudflare, so only it counts calls (the fake would just exhaust a smoke).
    if (mode === 'real' && request.ip) await this.limiter.hit('auth.captcha.ip', request.ip);

    const verdict = await this.client.verify(token, request.ip);
    switch (verdict.kind) {
      case 'ok':
        // The fake client answers with the hostname `fake`; only real answers come from Cloudflare.
        if (mode === 'real' && !allowedHostnames.includes(verdict.hostname)) {
          this.logger.warn('turnstile_hostname_mismatch', { hostname: verdict.hostname });
          throw this.failed();
        }
        return true;
      case 'rejected':
        throw this.failed();
      case 'unavailable': {
        const route = `${request.method} ${request.route?.path ?? request.path}`;
        if (verdict.reason === 'misconfigured') this.logger.error('turnstile_misconfigured', new Error('siteverify refused our secret'), { route });
        const policy = this.reflector.get<TurnstileOnUnavailable | undefined>(TURNSTILE_ON_UNAVAILABLE, context.getHandler()) ?? 'reject';
        if (policy === 'bypass') {
          this.logger.warn('turnstile_bypassed', { route, reason: verdict.reason });
          return true;
        }
        throw new ProblemDetailsException({ status: 503, type: 'captcha-unavailable', title: 'Bot check unavailable' });
      }
    }
  }

  private failed(): ProblemDetailsException {
    return new ProblemDetailsException({ status: 400, type: 'captcha-failed', title: 'Bot check failed' });
  }
}
