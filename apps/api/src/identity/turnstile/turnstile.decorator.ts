import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import type { RateLimitRuleName } from '../../common/config/app-config.js';
import { RATE_LIMIT_KEY } from '../../common/rate-limit/rate-limit.decorator.js';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard.js';
import { TURNSTILE_ON_UNAVAILABLE, TurnstileGuard, type TurnstileOnUnavailable } from './turnstile.guard.js';

/**
 * `@RateLimit(...rules)` plus the bot check in front of it. One `UseGuards` with both guards: Nest runs them in the order given,
 * so a bad token never reaches the route's counters (design 4.2).
 */
export const Turnstile = (...rules: RateLimitRuleName[]) =>
  applyDecorators(SetMetadata(RATE_LIMIT_KEY, rules), UseGuards(TurnstileGuard, RateLimitGuard));

/** Marks a route as one that must keep working while Cloudflare is down: the guard logs `turnstile_bypassed` and lets it pass. */
export const TurnstileBypassWhenUnavailable = () => SetMetadata(TURNSTILE_ON_UNAVAILABLE, 'bypass' satisfies TurnstileOnUnavailable);
