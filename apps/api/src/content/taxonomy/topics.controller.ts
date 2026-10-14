import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import type { Learner } from '../learner/learner-content.guard.js';
import { CurrentLearner, LearnerContent } from '../learner/learner.decorator.js';
import {
  createTopicSchema, topicParamsSchema, updateTopicSchema,
  type CreateTopicBody, type TopicParams, type UpdateTopicBody,
} from './topics.schemas.js';
import { TopicsService, type TopicView } from './topics.service.js';

@Controller('admin/taxonomy/topics')
@RequirePermission('taxonomy.manage')
export class TopicsController {
  constructor(@Inject(TopicsService) private readonly topics: TopicsService) {}

  @Get()
  list(): Promise<{ items: TopicView[] }> {
    return this.topics.listAll();
  }

  @Post()
  @RateLimit('user.write')
  create(@Body({ schema: createTopicSchema }) body: CreateTopicBody): Promise<TopicView> {
    return this.topics.create(body);
  }

  @Patch(':code')
  @RateLimit('user.write')
  update(
    @Param({ schema: topicParamsSchema }) params: TopicParams,
    @Body({ schema: updateTopicSchema }) body: UpdateTopicBody,
  ): Promise<TopicView> {
    return this.topics.update(params.code, body);
  }
}

@Controller('topics')
@LearnerContent()
export class LearnerTopicsController {
  constructor(@Inject(TopicsService) private readonly topics: TopicsService) {}

  @Get()
  list(@CurrentLearner() learner: Learner) {
    return this.topics.list(learner.nativeLanguage);
  }
}
