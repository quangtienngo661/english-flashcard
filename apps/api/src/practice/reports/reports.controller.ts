import { Body, Controller, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentLearner, LearnerContent, type Learner } from '../../content/index.js';
import { answerLength } from '../grading/normalize.js';
import { NOTE_MAX } from '../practice.constants.js';
import { ReportsService } from './reports.service.js';

const params = z.strictObject({ id: z.uuid().transform((value) => value.toLowerCase()) });
const reportBody = z.strictObject({
  reason: z.enum(['meaning_wrong', 'graded_wrong', 'hint_wrong', 'other']),
  // 0–300 code points after NFC + trim (D30); an empty note is stored as none.
  note: z.string().refine((text) => answerLength(text) <= NOTE_MAX).transform((text) => text.normalize('NFC').trim() || null)
    .optional(),
});

// Idempotent by the unique item_id, and limited by the reports_per_hour setting instead of a static rule (design R12).
@Controller('practice/items')
@LearnerContent()
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reports: ReportsService) {}

  @Post(':id/report')
  @HttpCode(201)
  report(
    @Param({ schema: params }) path: z.infer<typeof params>, @Body({ schema: reportBody }) body: z.infer<typeof reportBody>,
    @CurrentLearner() learner: Learner,
  ) {
    return this.reports.create(learner.userId, path.id, { reason: body.reason, note: body.note ?? null });
  }
}
