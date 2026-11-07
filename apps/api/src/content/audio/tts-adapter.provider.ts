import type { Provider } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { FakeTtsAdapter } from './fake-tts.adapter.js';
import { GoogleTtsAdapter, googleTtsClient } from './google-tts.adapter.js';
import { TtsAdapter } from './tts-adapter.js';

/** The provider the configuration names, or null when speech audio is off. */
export function ttsAdapterFor(config: AppConfig): TtsAdapter | null {
  if (config.tts.provider === 'fake') return new FakeTtsAdapter();
  if (config.tts.provider === 'google') return new GoogleTtsAdapter(googleTtsClient(config));
  return null;
}

export const ttsAdapterProvider: Provider = { provide: TtsAdapter, useFactory: ttsAdapterFor, inject: [APP_CONFIG] };
