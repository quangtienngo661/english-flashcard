import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { SettingsModule } from '../settings/index.js';
import { AdaptersRegistrar } from './adapters/adapters.registrar.js';
import { AiAdapterRegistry } from './adapters/ai-adapter.registry.js';
import { AiService } from './ai.service.js';
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
  providers: [
    AiAdapterRegistry, AdaptersRegistrar, PromptsRepository, SelectionReader, CallLedger, ReadinessService, OperationsRepository,
    ConcurrencyLimit,
    // One queue per process (design §8.4); its limit is the one the runner read last.
    { provide: CallQueue, useFactory: (limit: ConcurrencyLimit) => new CallQueue(() => limit.value), inject: [ConcurrencyLimit] },
    RunnerService, AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
