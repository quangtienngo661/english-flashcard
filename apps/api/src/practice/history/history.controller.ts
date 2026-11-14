import { Controller, Get, Inject, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentLearner, LearnerContent, type Learner } from '../../content/index.js';
import { HistoryService } from './history.service.js';

const page = { page_size: z.coerce.number().int().min(1).max(100).default(20), page_token: z.string().optional() };
const weakQuery = z.strictObject({ ...page, group_id: z.uuid().transform((value) => value.toLowerCase()).optional() });
const historyQuery = z.strictObject({
  ...page,
  // A calendar date in the learner's zone, compared with local_date.
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value))
    .optional(),
  sense_id: z.uuid().transform((value) => value.toLowerCase()).optional(),
});

@Controller('practice')
@LearnerContent()
export class HistoryController {
  constructor(@Inject(HistoryService) private readonly history: HistoryService) {}

  @Get('weak-words')
  weakWords(@Query({ schema: weakQuery }) query: z.infer<typeof weakQuery>, @CurrentLearner() learner: Learner) {
    return this.history.weakWords(learner.userId, learner.nativeLanguage, query);
  }

  @Get('weak-words/groups')
  weakGroups(@CurrentLearner() learner: Learner) {
    return this.history.weakGroups(learner.userId);
  }

  @Get('history')
  list(@Query({ schema: historyQuery }) query: z.infer<typeof historyQuery>, @CurrentLearner() learner: Learner) {
    return this.history.history(learner.userId, query, learner.nativeLanguage);
  }
}
