import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { audioKey, speechTargets, type SenseIpa } from './audio-key.js';
import { AudioRepository, type SpeechRow } from './audio.queries.js';
import { AudioStorage, audioObjectKey } from './audio-storage.js';
import { TtsQueueService } from './tts-queue.service.js';

export type SenseAudioUrls = { uk: string | null; us: string | null };

/**
 * Pre-made speech audio (round C, design §5.5): which recordings the published senses need, their rows, and the URLs of the ready ones.
 * Nothing here ever fails the write or the read it rides on: audio is an extra, and the app keeps the browser voice without it.
 */
@Injectable()
export class AudioService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(AudioRepository) private readonly repository: AudioRepository,
    @Inject(TtsQueueService) private readonly queue: TtsQueueService,
    @Inject(AudioStorage) private readonly storage: AudioStorage | null,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /** Recordings are made only with a provider to make them and a place to keep them. */
  get enabled(): boolean {
    return this.config.tts.provider !== null && this.storage !== null;
  }

  private get voices(): { uk: string; us: string } {
    return { uk: this.config.tts.voiceUk, us: this.config.tts.voiceUs };
  }

  /**
   * Makes the rows for the recordings of these senses and of every other visible sense of the same lemmas (a change to one sense can
   * change how its siblings are keyed), and queues the ones that are new. Call it after the write has committed. Returns the new keys;
   * never throws.
   */
  async ensureForSenses(senseIds: string[]): Promise<string[]> {
    if (!this.enabled || senseIds.length === 0) return [];
    try {
      const senses = await this.repository.loadSenseIpa(senseIds);
      const rows = new Map<string, SpeechRow>();
      for (const { uk, us } of speechTargets(senses, this.voices).values()) {
        rows.set(uk.key, { ...uk, voice: 'uk' });
        rows.set(us.key, { ...us, voice: 'us' });
      }
      const fresh = await this.repository.insertPending([...rows.values()]);
      // A queue that cannot be reached leaves the rows `pending`; the sweep queues them again.
      if (fresh.length > 0) await this.queue.enqueue(fresh);
      return fresh;
    } catch (error) {
      this.logger.warn('audio_ensure_failed', { sense_count: senseIds.length, error });
      return [];
    }
  }

  /** The URL of the ready recording of each sense and voice; null for one that is pending, failed or not made. */
  async urlsForSenses(senseIds: string[]): Promise<Map<string, SenseAudioUrls>> {
    const none = new Map(senseIds.map((id) => [id, { uk: null, us: null } as SenseAudioUrls]));
    if (this.storage === null || senseIds.length === 0) return none;
    try {
      const senses = await this.repository.loadSenseIpa(senseIds);
      const targets = speechTargets(senses, this.voices);
      const wanted = senseIds.flatMap((id) => { const t = targets.get(id); return t ? [t.uk.key, t.us.key] : []; });
      const ready = await this.repository.readyKeys([...new Set(wanted)]);
      const storage = this.storage;
      const url = (key: string) => (ready.has(key) ? storage.publicUrl(audioObjectKey(key)) : null);
      return new Map(senseIds.map((id) => {
        const t = targets.get(id);
        return [id, t ? { uk: url(t.uk.key), us: url(t.us.key) } : { uk: null, us: null }];
      }));
    } catch (error) {
      this.logger.warn('audio_urls_failed', { sense_count: senseIds.length, error });
      return none;
    }
  }
}

export { audioKey };
export type { SenseIpa };
