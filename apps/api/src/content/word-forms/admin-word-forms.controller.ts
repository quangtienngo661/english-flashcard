import { Body, Controller, Delete, HttpCode, Inject, Param, Post, Req, UseInterceptors } from '@nestjs/common';
import { z } from 'zod';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { Idempotent } from '../../common/idempotency/idempotent.decorator.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { normalizeText } from '../catalog/normalize.js';
import { LEMMA_MAX } from '../content.constants.js';
import { WordFormExistsError, WordFormsService } from './word-forms.service.js';

const text = z.string().transform(normalizeText).pipe(z.string().min(1).max(LEMMA_MAX));
const addSchema = z.strictObject({ lemma: text, form: text });
const idParams = z.strictObject({ id: z.uuid().transform((id) => id.toLowerCase()) });

/** Staff accept a form AI used that the tables did not know (Bước 7 design §10, D15). */
@Controller('admin/content/word-forms')
@RequirePermission('content.edit')
export class AdminWordFormsController {
  constructor(@Inject(WordFormsService) private readonly forms: WordFormsService) {}

  @Post()
  @HttpCode(201)
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('user.write')
  async add(@Body({ schema: addSchema }) body: z.infer<typeof addSchema>, @Req() req: RequestWithUser) {
    try {
      const added = await this.forms.add(req.user!.userId, body.lemma, body.form);
      return { id: added.id, lemma_key: added.lemmaKey, form: added.form };
    } catch (error) {
      if (error instanceof WordFormExistsError) {
        throw new ProblemDetailsException({ status: 409, title: 'Word form exists', type: 'word-form-exists' });
      }
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(204)
  @RateLimit('user.write')
  async remove(@Param({ schema: idParams }) params: z.infer<typeof idParams>): Promise<void> {
    if (!(await this.forms.remove(params.id))) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
  }
}
