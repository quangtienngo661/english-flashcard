import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, Req, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { AI_POS_UNSET, AI_VALID_POS, WORD_MAX } from '../ai.constants.js';
import { AI_OPERATIONS } from '../ai.types.js';
import { bulkExamplesSchema, createExampleSchema, EvalExamplesService, patchExampleSchema } from '../eval/eval-examples.service.js';
import { createRunSchema, EvalRunsService } from '../eval/eval-runs.service.js';
import { EvalSetsService } from '../eval/eval-sets.service.js';

const idParams = z.strictObject({ id: z.uuid().transform((value) => value.toLowerCase()) });
const examplesQuery = z.strictObject({ operation: z.enum(AI_OPERATIONS) });
const freezeBody = z.strictObject({ operation: z.enum(AI_OPERATIONS) });
const formsQuery = z.strictObject({ word: z.string().min(1).max(WORD_MAX), part_of_speech: z.enum([...AI_VALID_POS, AI_POS_UNSET]) });
const runsQuery = z.strictObject({
  operation: z.enum(AI_OPERATIONS),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  page_token: z.string().optional(),
  set_id: z.uuid().transform((value) => value.toLowerCase()).optional(),
});

/**
 * The example set and its runs (design §10, §12.1 #13–#15). `POST /runs` is `@Idempotent()`: it only inserts a row and enqueues,
 * so no provider is called inside the idempotency transaction (design §4.4); a replay returns the same run (B6E74).
 */
@Controller('admin/ai/eval')
@RequirePermission('settings.manage')
export class AdminAiEvalController {
  constructor(
    @Inject(EvalExamplesService) private readonly examples: EvalExamplesService,
    @Inject(EvalRunsService) private readonly runs: EvalRunsService,
    @Inject(EvalSetsService) private readonly sets: EvalSetsService,
  ) {}

  @Get('examples')
  listExamples(@Query({ schema: examplesQuery }) query: z.infer<typeof examplesQuery>) {
    return this.examples.list(query.operation);
  }

  /** The catalog forms of a word, to fill the expected answer in; `{ forms: null }` when the catalog does not know the word. */
  @Get('examples/forms')
  exampleForms(@Query({ schema: formsQuery }) query: z.infer<typeof formsQuery>) {
    return this.examples.forms(query.word, query.part_of_speech);
  }

  @Post('examples')
  @HttpCode(201)
  @RateLimit('user.write')
  createExample(@Body({ schema: createExampleSchema }) body: z.infer<typeof createExampleSchema>, @Req() req: RequestWithUser) {
    return this.examples.create(req.user!.userId, body);
  }

  /** Many examples at once. 200, not 201: a request whose rows are all invalid creates nothing. */
  @Post('examples/bulk')
  @HttpCode(200)
  @RateLimit('user.write')
  createExamples(@Body({ schema: bulkExamplesSchema }) body: z.infer<typeof bulkExamplesSchema>, @Req() req: RequestWithUser) {
    return this.examples.createMany(req.user!.userId, body);
  }

  @Patch('examples/:id')
  @RateLimit('user.write')
  updateExample(@Param({ schema: idParams }) params: z.infer<typeof idParams>,
    @Body({ schema: patchExampleSchema }) body: z.infer<typeof patchExampleSchema>) {
    return this.examples.update(params.id, body);
  }

  @Delete('examples/:id')
  @HttpCode(204)
  @RateLimit('user.write')
  async removeExample(@Param({ schema: idParams }) params: z.infer<typeof idParams>): Promise<void> {
    await this.examples.remove(params.id);
  }

  /** Opens a held-out example (the admin web asks first): 200, it moves to dev. A dev example → 409 `example-not-held-out`. */
  @Post('examples/:id/reveal')
  @HttpCode(200)
  @RateLimit('user.write')
  revealExample(@Param({ schema: idParams }) params: z.infer<typeof idParams>) {
    return this.examples.reveal(params.id);
  }

  /** "Chốt phiên bản": 201 with the new version, 422 when the set is not complete, 409 when another version was frozen at once. */
  @Post('sets')
  @HttpCode(201)
  @RateLimit('user.write')
  freezeSet(@Body({ schema: freezeBody }) body: z.infer<typeof freezeBody>, @Req() req: RequestWithUser) {
    return this.sets.freeze(req.user!.userId, body.operation);
  }

  @Get('sets')
  listSets(@Query({ schema: examplesQuery }) query: z.infer<typeof examplesQuery>) {
    return this.sets.list(query.operation);
  }

  @Get('sets/:id')
  getSet(@Param({ schema: idParams }) params: z.infer<typeof idParams>) {
    return this.sets.get(params.id);
  }

  @Post('runs')
  @HttpCode(202)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  createRun(@Body({ schema: createRunSchema }) body: z.infer<typeof createRunSchema>, @Req() req: RequestWithUser) {
    return this.runs.create(req.user!.userId, body);
  }

  @Get('runs')
  listRuns(@Query({ schema: runsQuery }) query: z.infer<typeof runsQuery>) {
    return this.runs.list(query.operation, query.page_size, query.page_token, query.set_id);
  }

  @Get('runs/:id')
  getRun(@Param({ schema: idParams }) params: z.infer<typeof idParams>) {
    return this.runs.get(params.id);
  }

  /** The dev items with a result and the statistics of the whole run (held-out as numbers only). */
  @Get('runs/:id/items')
  getRunItems(@Param({ schema: idParams }) params: z.infer<typeof idParams>) {
    return this.runs.items(params.id);
  }

  /** 200, not 201: nothing is created. A run that is not queued or running → 409 `run-not-active`. */
  @Post('runs/:id/cancel')
  @HttpCode(200)
  @RateLimit('user.write')
  cancelRun(@Param({ schema: idParams }) params: z.infer<typeof idParams>) {
    return this.runs.cancel(params.id);
  }

  /** Only a finished or failed run; a queued or running one → 409 `run-active`. `ai_calls` (and so the costs) stay. */
  @Delete('runs/:id')
  @HttpCode(204)
  @RateLimit('user.write')
  async removeRun(@Param({ schema: idParams }) params: z.infer<typeof idParams>): Promise<void> {
    await this.runs.remove(params.id);
  }
}
