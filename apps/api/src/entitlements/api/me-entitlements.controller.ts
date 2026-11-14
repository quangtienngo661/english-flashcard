import { Controller, Get, Inject, Req } from '@nestjs/common';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { EntitlementsService } from '../entitlements.service.js';

/**
 * API 1 (design §12.1): signed-in only, **without** `@LearnerContent()` (R15) — a new account with no learner profile and
 * a staff account both get their plan, and Entitlements needs no import of Content.
 */
@Controller('me/entitlements')
export class MeEntitlementsController {
  constructor(@Inject(EntitlementsService) private readonly entitlements: EntitlementsService) {}

  @Get()
  async read(@Req() req: RequestWithUser) {
    const snapshot = await this.entitlements.snapshot(req.user!.userId);
    if (!snapshot) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    return snapshot;
  }
}
