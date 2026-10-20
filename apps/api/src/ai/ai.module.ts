import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { SettingsModule } from '../settings/index.js';
import { AdaptersRegistrar } from './adapters/adapters.registrar.js';
import { AiAdapterRegistry } from './adapters/ai-adapter.registry.js';
import { AiService } from './ai.service.js';
import { AdminAiModelsController } from './api/admin-ai-models.controller.js';
import { AdminAiOperationsController } from './api/admin-ai-operations.controller.js';
import { AdminAiPromptsController } from './api/admin-ai-prompts.controller.js';
import { AdminAiReportsController } from './api/admin-ai-reports.controller.js';
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
  controllers: [AdminAiModelsController, AdminAiOperationsController, AdminAiPromptsController, AdminAiReportsController],
  providers: [
    AiAdapterRegistry, AdaptersRegistrar, PromptsRepository, ModelsService, OperationSettingsService, SelectionReader, CallLedger,
    ReadinessService, OperationsRepository, ConcurrencyLimit,
    // One queue per process (design §8.4); its limit is the one the runner read last.
    { provide: CallQueue, useFactory: (limit: ConcurrencyLimit) => new CallQueue(() => limit.value), inject: [ConcurrencyLimit] },
    RunnerService, AiService, PromptsService, ReportsService,
  ],
  exports: [AiService],
})
export class AiModule {}
