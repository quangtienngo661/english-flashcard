import { Controller, Get, Inject, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentLearner, LearnerContent, type Learner } from '../../content/index.js';
import { ReportReasonsService } from './report-reasons.service.js';

const listQuery = z.strictObject({ kind: z.enum(['ai', 'non_ai']) });

// The app loads the list once per session for each kind (design §9.2).
@Controller('practice/report-reasons')
@LearnerContent()
export class ReportReasonsController {
  constructor(@Inject(ReportReasonsService) private readonly reasons: ReportReasonsService) {}

  @Get()
  list(@Query({ schema: listQuery }) query: z.infer<typeof listQuery>, @CurrentLearner() learner: Learner) {
    return this.reasons.learnerList(query.kind, learner.nativeLanguage);
  }
}
