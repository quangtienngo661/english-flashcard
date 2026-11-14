import { Injectable } from '@nestjs/common';
import type { AiProviderName } from '../ai.types.js';
import type { AiAdapter } from './ai-adapter.js';

/** Adapters are registered by `AdaptersRegistrar` onModuleInit; an unregistered provider is "not configured". */
@Injectable()
export class AiAdapterRegistry {
  private readonly adapters = new Map<AiProviderName, AiAdapter>();

  register(adapter: AiAdapter): void {
    this.adapters.set(adapter.provider, adapter);
  }

  get(provider: AiProviderName): AiAdapter | undefined {
    return this.adapters.get(provider);
  }

  providers(): AiProviderName[] {
    return [...this.adapters.keys()];
  }
}
