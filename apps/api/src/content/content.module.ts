import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { AdminCatalogController } from './catalog/admin-catalog.controller.js';
import { AdminCatalogQueries } from './catalog/admin-catalog.queries.js';
import { AdminEntriesController, EntryFunctionWordController } from './catalog/admin-entries.controller.js';
import { EntriesService } from './catalog/entries.service.js';
import { LevelsService } from './catalog/levels.service.js';
import { ContentService } from './content.service.js';
import { InflectionsService } from './inflections/inflections.service.js';
import { MyWordsController } from './private/my-words.controller.js';
import { PrivateWordsService } from './private/private-words.service.js';
import { SentencesController } from './sentences/sentences.controller.js';
import { SentencesService } from './sentences/sentences.service.js';
import { WordsController } from './words/words.controller.js';
import { WordsService } from './words/words.service.js';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { LearnerContentController } from './learner/learner-content.controller.js';
import { LearnerContentGuard } from './learner/learner-content.guard.js';
import { LearnerContentService } from './learner/learner-content.service.js';
import { PublicSourcesController, SourcesController } from './sources/sources.controller.js';
import { SourcesService } from './sources/sources.service.js';
import { AdminSensesController, BatchEntriesController } from './senses/admin-senses.controller.js';
import { AdminPublishController } from './senses/admin-publish.controller.js';
import { PublishService } from './senses/publish.service.js';
import { SensesService } from './senses/senses.service.js';
import { LearnerTopicsController, TopicsController } from './taxonomy/topics.controller.js';
import { TopicsService } from './taxonomy/topics.service.js';

@Module({
  imports: [IdentityModule],
  controllers: [
    SourcesController, PublicSourcesController, TopicsController, LearnerTopicsController,
    AdminEntriesController, EntryFunctionWordController, AdminSensesController, BatchEntriesController,
    AdminPublishController, AdminCatalogController, LearnerContentController, MyWordsController, SentencesController, WordsController,
  ],
  providers: [ContentService, SourcesService, TopicsService, LearnerContentGuard, LearnerContentService, EntriesService, LevelsService, SensesService, PublishService, AdminCatalogQueries, InflectionsService,
    PrivateWordsService, SentencesService, WordsService, IdempotencyInterceptor],
  exports: [ContentService],
})
export class ContentModule {}
