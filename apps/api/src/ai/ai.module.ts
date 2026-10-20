import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { SettingsModule } from '../settings/index.js';
import { AdaptersRegistrar } from './adapters/adapters.registrar.js';
import { AiAdapterRegistry } from './adapters/ai-adapter.registry.js';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { AiService } from './ai.service.js';
import { AdminAiEvalController } from './api/admin-ai-eval.controller.js';
import { AdminAiModelsController } from './api/admin-ai-models.controller.js';
import { AdminAiOperationsController } from './api/admin-ai-operations.controller.js';
import { EvalExamplesService } from './eval/eval-examples.service.js';
import { EvalJob } from './eval/eval-job.js';
import { EvalQueue } from './eval/eval-queue.service.js';
import { EvalRunsRepository } from './eval/eval-runs.repository.js';
import { EvalRunsService } from './eval/eval-runs.service.js';
import { ModelsService } from './models/models.service.js';
import { OperationSettingsService } from './models/operation-settings.service.js';
import { PromptsRepository } from './prompts/prompts.repository.js';
import { CallLedger } from './runner/call-ledger.service.js';
import { CallQueue, ConcurrencyLimit } from './runner/call-queue.js';
import { OperationsRepository } from './runner/operations.repository.js';
import { ReadinessService } from './runner/readiness.service.js';
import { RunnerService } from './runner/runner.service.js';
import { SelectionReader } from './runner/selection.js';

/** AI gateway (Bước 6). Other modules import only `ai/index.ts`. */
@Module({
  imports: [SettingsModule, IdentityModule],
  controllers: [AdminAiModelsController, AdminAiOperationsController, AdminAiEvalController],
  providers: [
    AiAdapterRegistry, AdaptersRegistrar, PromptsRepository, ModelsService, OperationSettingsService, SelectionReader, CallLedger,
    ReadinessService, OperationsRepository, ConcurrencyLimit,
    // One queue per process (design §8.4); its limit is the one the runner read last.
    { provide: CallQueue, useFactory: (limit: ConcurrencyLimit) => new CallQueue(() => limit.value), inject: [ConcurrencyLimit] },
    RunnerService, AiService,
    EvalExamplesService, EvalRunsService, EvalRunsRepository, EvalJob, EvalQueue, IdempotencyInterceptor,
  ],
  exports: [AiService],
})
export class AiModule {}
