import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import type { RateLimitRuleName } from '../config/app-config.js';
import { RateLimitGuard } from './rate-limit.guard.js';

export const RATE_LIMIT_KEY = 'rateLimit';

export const RateLimit = (...rules: RateLimitRuleName[]) =>
  applyDecorators(SetMetadata(RATE_LIMIT_KEY, rules), UseGuards(RateLimitGuard));
