import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentLearner, LearnerContent, type Learner } from '../../content/index.js';
import { groupParams } from '../groups/groups.schemas.js';
import { QueueService } from './queue.service.js';

const queueQuery = z.strictObject({ mode: z.enum(['due', 'all']).default('due') });

@Controller('groups')
@LearnerContent()
export class QueueController {
  constructor(@Inject(QueueService) private readonly queue: QueueService) {}

  @Get(':id/queue')
  read(
    @Param({ schema: groupParams }) params: z.infer<typeof groupParams>,
    @Query({ schema: queueQuery }) query: z.infer<typeof queueQuery>,
    @CurrentLearner() learner: Learner,
  ) {
    return this.queue.queue(learner.userId, params.id, query.mode, learner.nativeLanguage);
  }
}
