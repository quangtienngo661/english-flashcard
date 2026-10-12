import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { AdminEntriesController, EntryFunctionWordController } from './catalog/admin-entries.controller.js';
import { EntriesService } from './catalog/entries.service.js';
import { LevelsService } from './catalog/levels.service.js';
import { ContentService } from './content.service.js';
import { LearnerContentGuard } from './learner/learner-content.guard.js';
import { PublicSourcesController, SourcesController } from './sources/sources.controller.js';
import { SourcesService } from './sources/sources.service.js';
import { LearnerTopicsController, TopicsController } from './taxonomy/topics.controller.js';
import { TopicsService } from './taxonomy/topics.service.js';

@Module({
  imports: [IdentityModule],
  controllers: [
    SourcesController, PublicSourcesController, TopicsController, LearnerTopicsController,
    AdminEntriesController, EntryFunctionWordController,
  ],
  providers: [ContentService, SourcesService, TopicsService, LearnerContentGuard, EntriesService, LevelsService],
  exports: [ContentService],
})
export class ContentModule {}
