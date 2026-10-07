import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { APP_CONFIG, type AppConfig, type RateLimitRuleName } from '../config/app-config.js';
import { normalizeEmail } from '../email/normalize-email.js';
import type { RequestWithUser } from '../request-user/request-user.js';
import { RATE_LIMIT_KEY } from './rate-limit.decorator.js';
import { RateLimiter } from './rate-limiter.service.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rules = this.reflector.get<RateLimitRuleName[] | undefined>(RATE_LIMIT_KEY, context.getHandler());
    if (!rules) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    for (const rule of rules) {
      let subject: string | null | undefined;
      switch (this.config.limits[rule].by) {
        case 'user': subject = request.user?.userId; break;
        case 'ip': subject = request.ip; break;
        case 'email': subject = normalizeEmail(request.body?.email); break;
        // A chain is resolved by services after reading the DB, never by this guard.
        case 'chain': continue;
      }
      if (subject) await this.limiter.hit(rule, subject);
    }
    return true;
  }
}
