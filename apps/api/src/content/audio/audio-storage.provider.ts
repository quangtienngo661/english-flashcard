import type { Provider } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { AudioStorage } from './audio-storage.js';
import { LocalAudioStorage } from './local-audio-storage.js';
import { R2AudioStorage } from './r2-audio-storage.js';

/** The storage the configuration names, or null when audio is off (round C): the consumers then do nothing. */
export function audioStorageFor(config: AppConfig): AudioStorage | null {
  const { storage, publicBaseUrl, r2, localDir } = config.audio;
  if (storage === 'r2' && r2 && publicBaseUrl) return new R2AudioStorage(r2, publicBaseUrl);
  if (storage === 'local' && publicBaseUrl) return new LocalAudioStorage(localDir, publicBaseUrl);
  return null;
}

export const audioStorageProvider: Provider = { provide: AudioStorage, useFactory: audioStorageFor, inject: [APP_CONFIG] };
