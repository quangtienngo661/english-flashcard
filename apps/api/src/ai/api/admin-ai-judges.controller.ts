import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, Req } from '@nestjs/common';
import { z } from 'zod';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { cloneJudgeSchema, JudgesService, judgeBodySchema, saveJudgeSchema } from '../judge/judges.service.js';

const idParams = z.strictObject({ id: z.uuid().transform((value) => value.toLowerCase()) });

/**
 * Judges, their passes, labels and agreement (nhóm B design §5.4, §9 row P2). The controller sits at `admin/ai` because the passes and
 * labels have their own paths beside `judges`. Every route needs `settings.manage` (D19); writes are limited like the other admin writes.
 */
@Controller('admin/ai')
@RequirePermission('settings.manage')
export class AdminAiJudgesController {
  constructor(@Inject(JudgesService) private readonly judges: JudgesService) {}

  @Get('judges')
  list() {
    return this.judges.list();
  }

  @Post('judges')
  @HttpCode(201)
  @RateLimit('user.write')
  create(@Body({ schema: judgeBodySchema }) body: z.infer<typeof judgeBodySchema>, @Req() req: RequestWithUser) {
    return this.judges.create(req.user!.userId, body);
  }

  /** Adds a revision when a revision field changed; `expected_revision` is the revision the page was showing. */
  @Put('judges/:id')
  @RateLimit('user.write')
  save(
    @Param({ schema: idParams }) params: z.infer<typeof idParams>,
    @Body({ schema: saveJudgeSchema }) body: z.infer<typeof saveJudgeSchema>,
    @Req() req: RequestWithUser,
  ) {
    return this.judges.save(req.user!.userId, params.id, body);
  }

  @Post('judges/:id/clone')
  @HttpCode(201)
  @RateLimit('user.write')
  clone(
    @Param({ schema: idParams }) params: z.infer<typeof idParams>,
    @Body({ schema: cloneJudgeSchema }) body: z.infer<typeof cloneJudgeSchema>,
    @Req() req: RequestWithUser,
  ) {
    return this.judges.clone(req.user!.userId, params.id, body);
  }

  @Get('judges/:id/revisions')
  revisions(@Param({ schema: idParams }) params: z.infer<typeof idParams>) {
    return this.judges.revisions(params.id);
  }
}
