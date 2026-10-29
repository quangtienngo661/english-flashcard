import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { SettingsModule } from '../settings/index.js';
import { AdaptersRegistrar } from './adapters/adapters.registrar.js';
import { AiAdapterRegistry } from './adapters/ai-adapter.registry.js';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { AiService } from './ai.service.js';
import { AiAccountEraser } from './account-eraser.provider.js';
import { AdminAiConfigsController } from './api/admin-ai-configs.controller.js';
import { AdminAiDashboardController } from './api/admin-ai-dashboard.controller.js';
import { AdminAiEvalController } from './api/admin-ai-eval.controller.js';
import { AdminAiModelsController } from './api/admin-ai-models.controller.js';
import { AdminAiOperationsController } from './api/admin-ai-operations.controller.js';
import { AdminAiPromptsController } from './api/admin-ai-prompts.controller.js';
import { AdminAiReportsController } from './api/admin-ai-reports.controller.js';
import { ConfigsService } from './configs/configs.service.js';
import { PublishService } from './configs/publish.service.js';
import { EvalExamplesService } from './eval/eval-examples.service.js';
import { EvalJob } from './eval/eval-job.js';
import { EvalQueue } from './eval/eval-queue.service.js';
import { EvalRulesRegistry } from './eval/eval-rules.port.js';
import { EvalRunsRepository } from './eval/eval-runs.repository.js';
import { EvalRunsService } from './eval/eval-runs.service.js';
import { EvalSetsService } from './eval/eval-sets.service.js';
import { HeldOutReader } from './eval/held-out.js';
import { AiMaintenance } from './maintenance/ai-maintenance.js';
import { ModelsService } from './models/models.service.js';
import { OperationSettingsService } from './models/operation-settings.service.js';
import { PromptsRepository } from './prompts/prompts.repository.js';
import { PromptsService } from './prompts/prompts.service.js';
import { ReportsService } from './reports/reports.service.js';
import { CallLedger } from './runner/call-ledger.service.js';
import { CallQueue, ConcurrencyLimit } from './runner/call-queue.js';
import { OperationsRepository } from './runner/operations.repository.js';
import { ReadinessService } from './runner/readiness.service.js';
import { RunnerService } from './runner/runner.service.js';
import { SelectionReader } from './runner/selection.js';

/** AI gateway (Bước 6). Other modules import only `ai/index.ts`. */
@Module({
  imports: [SettingsModule, IdentityModule],
  controllers: [
    AdminAiModelsController, AdminAiOperationsController, AdminAiEvalController, AdminAiPromptsController, AdminAiReportsController,
    AdminAiDashboardController, AdminAiConfigsController,
  ],
  providers: [
    AiAdapterRegistry, AdaptersRegistrar, PromptsRepository, ModelsService, OperationSettingsService, SelectionReader, CallLedger,
    ReadinessService, OperationsRepository, ConcurrencyLimit,
    // One queue per process (design §8.4); its limit is the one the runner read last.
    { provide: CallQueue, useFactory: (limit: ConcurrencyLimit) => new CallQueue(() => limit.value), inject: [ConcurrencyLimit] },
    RunnerService, AiService, PromptsService, ReportsService,
    EvalExamplesService, EvalRunsService, EvalRunsRepository, EvalJob, EvalQueue, EvalRulesRegistry, EvalSetsService, HeldOutReader, ConfigsService, PublishService, IdempotencyInterceptor, AiMaintenance, AiAccountEraser,
  ],
  exports: [AiService],
})
export class AiModule {}
