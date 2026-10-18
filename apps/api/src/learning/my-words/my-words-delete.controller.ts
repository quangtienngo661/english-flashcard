import { Controller, Delete, HttpCode, Inject, Param, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { CurrentLearner, LearnerContent, type Learner } from '../../content/index.js';
import { QuickAddService } from '../quick-add/quick-add.service.js';

const params = z.strictObject({ id: z.uuid().transform((value) => value.toLowerCase()) });

// Served by Learning (design §4, §10): deleting a private word also deletes its learning data, and Content must not call
// Learning. PATCH /v1/my-words/:id stays in Content.
@Controller('my-words')
@LearnerContent()
export class MyWordsDeleteController {
  constructor(@Inject(QuickAddService) private readonly quickAdd: QuickAddService) {}

  @Delete(':id')
  @HttpCode(204)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  async delete(@Param({ schema: params }) path: z.infer<typeof params>, @CurrentLearner() learner: Learner): Promise<void> {
    await this.quickAdd.deleteMyWord(learner.userId, path.id);
  }
}
