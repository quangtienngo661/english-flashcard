import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import { normalizeText } from '../catalog/normalize.js';
import { LEVELS, VALID_POS } from '../content.constants.js';
import type { Learner } from './learner-content.guard.js';
import { LearnerContentService } from './learner-content.service.js';
import { CurrentLearner, LearnerContent } from './learner.decorator.js';

const pagination = {
  page_size: z.coerce.number().int().min(1).max(100).default(20), page_token: z.string().optional(),
};
const browseQuery = z.strictObject({
  ...pagination,
  level: z.enum(LEVELS).optional(), pos: z.enum(VALID_POS).optional(),
  topic: z.string().transform((value) => normalizeText(value).toLowerCase())
    .pipe(z.string().min(1).regex(/^[a-z0-9-]+$/)).optional(),
  exclude_function_words: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
});
const searchQuery = z.strictObject({
  ...pagination,
  q: z.string().transform((value) => value.trim().normalize('NFC').toLowerCase())
    .refine((value) => !value.includes('\0') && [...value].length >= 1 && [...value].length <= 100),
});
const senseParams = z.strictObject({ id: z.uuid().transform((value) => value.toLowerCase()) });

@Controller('senses')
@LearnerContent()
export class LearnerContentController {
  constructor(@Inject(LearnerContentService) private readonly content: LearnerContentService) {}

  // The literal search route must precede :id.
  @Get('search')
  search(@Query({ schema: searchQuery }) query: z.infer<typeof searchQuery>, @CurrentLearner() learner: Learner) {
    return this.content.search(query, learner.nativeLanguage);
  }

  @Get()
  browse(@Query({ schema: browseQuery }) query: z.infer<typeof browseQuery>, @CurrentLearner() learner: Learner) {
    return this.content.browse(query, learner.nativeLanguage);
  }

  @Get(':id')
  getSense(@Param({ schema: senseParams }) params: z.infer<typeof senseParams>, @CurrentLearner() learner: Learner) {
    return this.content.getSense(params.id, learner.nativeLanguage);
  }
}
