import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentLearner, LearnerContent, type Learner } from '../../content/index.js';
import { answerLength } from '../grading/normalize.js';
import { NOTE_MAX } from '../practice.constants.js';
import { REASON_CODE_PATTERN } from './report-reasons.service.js';
import { ReportsService } from './reports.service.js';

const params = z.strictObject({ id: z.uuid().transform((value) => value.toLowerCase()) });
const reportBody = z.strictObject({
  // Checked against the active reasons for the question's kind by the service (design §9.2).
  reason: z.string().regex(REASON_CODE_PATTERN),
  // 0–300 code points after NFC + trim (D30); an empty note is stored as none.
  note: z.string().refine((text) => answerLength(text) <= NOTE_MAX).transform((text) => text.normalize('NFC').trim() || null)
    .optional(),
  // Needed to report an AI question about the learner's own word (D26).
  share_private_word: z.boolean().optional(),
});
const listQuery = z.strictObject({
  page_size: z.coerce.number().int().min(1).max(100).default(20), page_token: z.string().optional(),
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
    return this.reports.create(learner, path.id, {
      reason: body.reason, note: body.note ?? null, sharePrivateWord: body.share_private_word ?? false,
    });
  }
}

// The learner's own reports and what became of them (design §9.2, D27).
@Controller('practice/reports')
@LearnerContent()
export class MyReportsController {
  constructor(@Inject(ReportsService) private readonly reports: ReportsService) {}

  @Get()
  list(@Query({ schema: listQuery }) query: z.infer<typeof listQuery>, @CurrentLearner() learner: Learner) {
    return this.reports.listMine(learner.userId, { pageSize: query.page_size, pageToken: query.page_token });
  }
}
