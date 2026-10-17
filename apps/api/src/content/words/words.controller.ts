import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import type { z } from 'zod';
import type { Learner } from '../learner/learner-content.guard.js';
import { CurrentLearner, LearnerContent } from '../learner/learner.decorator.js';
import { lookupQuery, wordParams, wordsQuery } from './words.schemas.js';
import { WordsService } from './words.service.js';

@Controller()
@LearnerContent()
export class WordsController {
  constructor(@Inject(WordsService) private readonly words: WordsService) {}

  @Get('words')
  search(@Query({ schema: wordsQuery }) query: z.infer<typeof wordsQuery>, @CurrentLearner() learner: Learner) {
    return this.words.search(learner.userId, query, learner.nativeLanguage);
  }

  @Get('words/:lemma')
  page(@Param({ schema: wordParams }) params: z.infer<typeof wordParams>, @CurrentLearner() learner: Learner) {
    return this.words.wordPage(learner.userId, params.lemma, learner.nativeLanguage);
  }

  @Get('lookup')
  lookup(@Query({ schema: lookupQuery }) query: z.infer<typeof lookupQuery>, @CurrentLearner() learner: Learner) {
    return this.words.lookup(learner.userId, query.q, learner.nativeLanguage);
  }
}
