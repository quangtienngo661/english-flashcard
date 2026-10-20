import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { SettingsModule } from '../settings/index.js';
import { AdaptersRegistrar } from './adapters/adapters.registrar.js';
import { AiAdapterRegistry } from './adapters/ai-adapter.registry.js';
import { AdminAiModelsController } from './api/admin-ai-models.controller.js';
import { AdminAiOperationsController } from './api/admin-ai-operations.controller.js';
import { ModelsService } from './models/models.service.js';
import { OperationSettingsService } from './models/operation-settings.service.js';
import { PromptsRepository } from './prompts/prompts.repository.js';

/** AI gateway (Bước 6). Other modules import only `ai/index.ts`. */
@Module({
  imports: [SettingsModule, IdentityModule],
  controllers: [AdminAiModelsController, AdminAiOperationsController],
  providers: [AiAdapterRegistry, AdaptersRegistrar, PromptsRepository, ModelsService, OperationSettingsService],
})
export class AiModule {}
