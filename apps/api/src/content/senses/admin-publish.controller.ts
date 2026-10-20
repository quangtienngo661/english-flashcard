import { Body, Controller, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { CurrentUser } from '../../common/request-user/current-user.decorator.js';
import type { RequestUser } from '../../common/request-user/request-user.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { ContentService } from '../content.service.js';
import { contentSchema, toContent } from './content-body.js';
import { PublishIncompleteError } from './publish.service.js';
import { ContentRuleError } from './revision-content.js';

const publishSchema = z.strictObject({ items: z.array(z.strictObject({ sense_id: z.uuid(), revision: z.number().int().positive() })) });
const stateSchema = z.strictObject({ sense_ids: z.array(z.uuid()) });
const senseParamsSchema = z.strictObject({ id: z.uuid() });
const quickSchema = z.strictObject({ revision: z.number().int().positive(), content: contentSchema });

@Controller('admin/content/senses')
@RequirePermission('content.publish')
export class AdminPublishController {
  constructor(
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Post('publish')
  @HttpCode(200)
  @RateLimit('user.write')
  async publish(@Body({ schema: publishSchema }) body: z.infer<typeof publishSchema>, @CurrentUser() actor: RequestUser) {
    this.checkSize(body.items.length);
    const results = [];
    for (const item of body.items) {
      const result = await this.content.publishItem({ senseId: item.sense_id, revision: item.revision }, actor.userId);
      results.push({ sense_id: item.sense_id, ...result });
    }
    return { results };
  }

  @Post('unpublish')
  @HttpCode(200)
  @RateLimit('user.write')
  async unpublish(@Body({ schema: stateSchema }) body: z.infer<typeof stateSchema>, @CurrentUser() actor: RequestUser) {
    this.checkSize(body.sense_ids.length);
    return this.stateResults(await this.content.unpublish(body.sense_ids, actor.userId));
  }

  @Post('retire')
  @HttpCode(200)
  @RateLimit('user.write')
  async retire(@Body({ schema: stateSchema }) body: z.infer<typeof stateSchema>, @CurrentUser() actor: RequestUser) {
    this.checkSize(body.sense_ids.length);
    return this.stateResults(await this.content.retire(body.sense_ids, actor.userId));
  }

  @Post(':id/quick-publish')
  @HttpCode(200)
  @RequirePermission('content.edit', 'content.publish')
  @RateLimit('user.write')
  async quickPublish(
    @Param({ schema: senseParamsSchema }) params: z.infer<typeof senseParamsSchema>,
    @Body({ schema: quickSchema }) body: z.infer<typeof quickSchema>, @CurrentUser() actor: RequestUser,
  ) {
    try {
      const result = await this.content.quickPublish({
        senseId: params.id, baseRevision: body.revision, content: toContent(body.content), actorId: actor.userId,
      });
      return { sense_id: params.id, revision: result.revisionNo, outcome: result.outcome, dropped_topics: result.droppedTopics };
    } catch (error) {
      if (!(error instanceof ContentRuleError)) throw error;
      throw new ProblemDetailsException({
        status: error instanceof PublishIncompleteError ? 422 : error.code === 'stale-revision' || error.code === 'revision-rejected' ? 409 : error.code === 'not-found' ? 404 : 400,
        title: error.code, type: error.code,
        ...(error instanceof PublishIncompleteError ? { extensions: { violations: error.violations } } : {}),
      });
    }
  }

  private checkSize(size: number): void {
    if (size > this.config.content.publishMaxItems) throw new ProblemDetailsException({
      status: 400, title: 'Validation failed', type: 'validation-failed',
    });
  }

  private stateResults(results: Array<{ senseId: string; ok: boolean; reason?: string }>) {
    return { results: results.map(({ senseId, ok, reason }) => ({ sense_id: senseId, ok, ...(reason ? { reason } : {}) })) };
  }
}
