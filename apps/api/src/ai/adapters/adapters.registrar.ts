import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { AiAdapterRegistry } from './ai-adapter.registry.js';
import { AnthropicAdapter, anthropicClient } from './anthropic/anthropic.adapter.js';
import { FakeAiAdapter } from './fake/fake.adapter.js';
import { OpenAiAdapter, openAiClient } from './openai/openai.adapter.js';

/** Registers each provider whose configuration is present; the fake only when `AI_FAKE_ENABLED` (never in production, B6E45). */
@Injectable()
export class AdaptersRegistrar implements OnModuleInit {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(AiAdapterRegistry) private readonly registry: AiAdapterRegistry,
  ) {}

  onModuleInit(): void {
    const { openaiApiKey, anthropicApiKey, fakeEnabled } = this.config.ai;
    if (openaiApiKey !== null) this.registry.register(new OpenAiAdapter(openAiClient(openaiApiKey)));
    if (anthropicApiKey !== null) this.registry.register(new AnthropicAdapter(anthropicClient(anthropicApiKey)));
    if (fakeEnabled) this.registry.register(new FakeAiAdapter());
  }
}
