import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { SettingsModule } from '../settings/index.js';
import { AdaptersRegistrar } from './adapters/adapters.registrar.js';
import { AiAdapterRegistry } from './adapters/ai-adapter.registry.js';
import { PromptsRepository } from './prompts/prompts.repository.js';
import { CallLedger } from './runner/call-ledger.service.js';
import { ReadinessService } from './runner/readiness.service.js';
import { SelectionReader } from './runner/selection.js';

/** AI gateway (Bước 6). Other modules import only `ai/index.ts`. */
@Module({
  imports: [SettingsModule, IdentityModule],
  providers: [AiAdapterRegistry, AdaptersRegistrar, PromptsRepository, SelectionReader, CallLedger, ReadinessService],
})
export class AiModule {}
