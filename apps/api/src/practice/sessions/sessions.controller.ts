import { Body, Controller, Get, HttpCode, Inject, Param, Post, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { CurrentLearner, LearnerContent, type Learner } from '../../content/index.js';
import { SessionsService } from './sessions.service.js';

const uuid = z.uuid().transform((value) => value.toLowerCase());
const QUESTION_TYPES = [
  'mcq_definition', 'true_false_definition', 'type_word', 'cloze', 'meaning_in_sentence', 'mcq_sentence',
] as const;
const SORTS = ['level_asc', 'overdue_first', 'new_first', 'least_practiced', 'most_wrong', 'queue', 'priority_oldest', 'random'] as const;

const startBody = z.strictObject({
  source: z.enum(['today', 'all', 'group', 'weak', 'priority']),
  group_id: uuid.optional(),
  group_filter: z.enum(['all', 'due', 'priority', '0', '1', '2', '3', '4', '5']).optional(),
  sort: z.enum(SORTS).optional(),
  types: z.array(z.enum(QUESTION_TYPES)).min(1).max(QUESTION_TYPES.length).refine((types) => new Set(types).size === types.length),
  prompt_style: z.enum(['meaning', 'sentence', 'mixed']).optional(),
  // The upper bound is max_questions_per_session, checked by the service.
  count: z.int().min(1).optional(),
  // Bước 7 (design §6.1): only with cloze.
  cloze_source: z.enum(['ai', 'own']).optional(),
}).refine((body) => (body.source === 'group') === (body.group_id !== undefined)
  && (body.source === 'group' || body.group_filter === undefined)
  && (body.cloze_source === undefined || body.types.includes('cloze')));
const sessionParams = z.strictObject({ id: uuid });
const continueBody = z.strictObject({ continue: z.boolean() });
// Bước 7 (design §6.6): a new AI request for a slot whose AI failed in an AI-only session.
const nextBody = z.strictObject({ retry_ai: z.literal(true).optional() }).optional();

@Controller('practice/sessions')
@LearnerContent()
export class SessionsController {
  constructor(@Inject(SessionsService) private readonly sessions: SessionsService) {}

  @Post()
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  start(@Body({ schema: startBody }) body: z.infer<typeof startBody>, @CurrentLearner() learner: Learner) {
    return this.sessions.start(learner, body);
  }

  @Get('current')
  current(@CurrentLearner() learner: Learner) {
    return this.sessions.current(learner);
  }

  @Post(':id/next')
  @HttpCode(200)
  @RateLimit('practice.answer')
  next(
    @Param({ schema: sessionParams }) params: z.infer<typeof sessionParams>,
    @Body({ schema: nextBody }) body: z.infer<typeof nextBody>,
    @CurrentLearner() learner: Learner,
  ) {
    return this.sessions.next(learner, params.id, body?.retry_ai === true);
  }

  @Post(':id/continue')
  @HttpCode(200)
  @RateLimit('user.write')
  continue(
    @Param({ schema: sessionParams }) params: z.infer<typeof sessionParams>,
    @Body({ schema: continueBody }) body: z.infer<typeof continueBody>,
    @CurrentLearner() learner: Learner,
  ) {
    return this.sessions.continue(learner.userId, params.id, body.continue);
  }

  @Post(':id/finish')
  @HttpCode(200)
  @RateLimit('user.write')
  finish(@Param({ schema: sessionParams }) params: z.infer<typeof sessionParams>, @CurrentLearner() learner: Learner) {
    return this.sessions.finish(learner.userId, params.id);
  }
}
