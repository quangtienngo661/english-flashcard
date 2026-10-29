import { Module } from '@nestjs/common';
import { AiModule } from '../ai/index.js';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { ContentModule } from '../content/content.module.js';
import { EntitlementsModule } from '../entitlements/index.js';
import { IdentityModule } from '../identity/identity.module.js';
import { LearningModule } from '../learning/index.js';
import { SettingsModule } from '../settings/index.js';
import { AiQuestionGenerator } from './ai/ai-question-generator.service.js';
import { AiRequestsRepository } from './ai/ai-requests.repository.js';
import { AiSessionPlanner } from './ai/ai-session-planner.service.js';
import { UnknownFormsRepository } from './ai/unknown-forms.repository.js';
import { WordChecksRepository } from './ai/word-checks.repository.js';
import { AnswersController } from './answers/answers.controller.js';
import { AnswersService } from './answers/answers.service.js';
import { PracticeEntryUsageProbe } from './entry-usage.probe.js';
import { PracticeAccountEraser } from './maintenance/account-eraser.provider.js';
import { HistoryController } from './history/history.controller.js';
import { HistoryService } from './history/history.service.js';
import { PracticeCleanupService } from './maintenance/practice-cleanup.service.js';
import { AdminAiQualityController } from './reports/admin-ai-quality.controller.js';
import { AiQualityService } from './reports/ai-quality.service.js';
import { AdminReportReasonsController } from './reports/admin-report-reasons.controller.js';
import { AdminReportsController } from './reports/admin-reports.controller.js';
import { AdminUnknownFormsController } from './reports/admin-unknown-forms.controller.js';
import { ReportReasonsController } from './reports/report-reasons.controller.js';
import { ReportReasonsService } from './reports/report-reasons.service.js';
import { MyReportsController, ReportsController } from './reports/reports.controller.js';
import { ReportsService } from './reports/reports.service.js';
import { UnknownFormsAdminService } from './reports/unknown-forms-admin.service.js';
import { PracticeReviewsController } from './reviews/practice-reviews.controller.js';
import { PracticeReviewsService } from './reviews/practice-reviews.service.js';
import { QuestionBuilder } from './questions/question-builder.service.js';
import { SessionsController } from './sessions/sessions.controller.js';
import { SessionsService } from './sessions/sessions.service.js';
import { PracticeStats } from './weak/practice-stats.js';

@Module({
  // IdentityModule: the learner guard needs IdentityService in the module that hosts the controllers.
  imports: [IdentityModule, ContentModule, LearningModule, SettingsModule, EntitlementsModule, AiModule],
  controllers: [
    SessionsController, AnswersController, PracticeReviewsController, HistoryController, ReportsController, AdminReportsController,
    ReportReasonsController, AdminReportReasonsController, MyReportsController, AdminUnknownFormsController, AdminAiQualityController,
  ],
  providers: [
    IdempotencyInterceptor, QuestionBuilder, PracticeStats, SessionsService, AnswersService, PracticeReviewsService, HistoryService,
    ReportsService, ReportReasonsService, PracticeCleanupService, AiRequestsRepository, WordChecksRepository, UnknownFormsRepository,
    AiQuestionGenerator, AiSessionPlanner, UnknownFormsAdminService, AiQualityService, PracticeEntryUsageProbe, PracticeAccountEraser,
  ],
})
export class PracticeModule {}
