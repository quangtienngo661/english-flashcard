import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { EntitlementsService } from '../entitlements.service.js';
import { GrantsService } from '../grants/grants.service.js';

const userParams = z.strictObject({ user_id: z.uuid().transform((value) => value.toLowerCase()) });
const lookupQuery = z.strictObject({ email: z.string().min(3).max(320) });
const aiUsageQuery = z.strictObject({ date: z.iso.date().optional() });

/** Staff read APIs (design §12.2 rows 5–6). Nothing here writes. */
@Controller('admin/entitlements')
export class AdminEntitlementsController {
  constructor(
    @Inject(EntitlementsService) private readonly entitlements: EntitlementsService,
    @Inject(GrantsService) private readonly grants: GrantsService,
  ) {}

  @Get('users/:user_id')
  @RequirePermission('entitlements.grant')
  async user(@Param({ schema: userParams }) params: z.infer<typeof userParams>) {
    const snapshot = await this.entitlements.snapshot(params.user_id);
    if (!snapshot) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    return { ...snapshot, grants: await this.grants.forUser(params.user_id) };
  }

  /** Before the grant form: the learner behind an address, and whether this staff account may grant to them (design §5.2). */
  @Get('lookup')
  @RequirePermission('entitlements.grant')
  @RateLimit('entitlements.lookup')
  lookup(@Query({ schema: lookupQuery }) query: z.infer<typeof lookupQuery>, @Req() req: RequestWithUser) {
    return this.grants.lookup(req.user!.userId, query.email);
  }

  @Get('ai-usage')
  @RequirePermission('settings.manage')
  aiUsage(@Query({ schema: aiUsageQuery }) query: z.infer<typeof aiUsageQuery>) {
    return this.entitlements.aiUsage(query.date);
  }
}
