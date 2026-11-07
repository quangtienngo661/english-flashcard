import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { audioKey, speechTargets, type SenseIpa } from './audio-key.js';
import { AudioRepository, type SpeechRow } from './audio.queries.js';
import { AudioStorage, audioObjectKey } from './audio-storage.js';
import { TtsQueueService } from './tts-queue.service.js';

export type SenseAudioUrls = { uk: string | null; us: string | null };
export type AudioState = { status: 'pending' | 'ready' | 'failed'; error: string | null; url: string | null };

/** A pending row older than this has lost its job (design §5.5); the sweep queues it again. */
const STALE_PENDING_MS = 10 * 60_000;
/** A row nothing uses is kept this long first: staff may switch back, and a sibling sense may still point at it (Review Focus 4). */
const UNUSED_KEEP_MS = 7 * 24 * 3_600_000;
const SWEEP_LIMIT = 1_000;

/**
 * Pre-made speech audio (round C, design §5.5): which recordings the published senses need, their rows, and the URLs of the ready ones.
 * Nothing here ever fails the write or the read it rides on: audio is an extra, and the app keeps the browser voice without it.
 */
@Injectable()
export class AudioService implements OnModuleInit {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(AudioRepository) private readonly repository: AudioRepository,
    @Inject(TtsQueueService) private readonly queue: TtsQueueService,
    @Inject(AudioStorage) private readonly storage: AudioStorage | null,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    this.queue.setHandler('sweep', async () => { await this.sweep(this.clock.now()); });
    this.queue.setHandler('cleanup', async () => { await this.cleanup(this.clock.now()); });
  }

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

  /** Queues again the pending rows whose job was lost (design §5.5: every five minutes, rows older than ten). Returns how many. */
  async sweep(now: Date): Promise<number> {
    if (!this.enabled) return 0;
    const keys = await this.repository.stalePending(new Date(now.getTime() - STALE_PENDING_MS), SWEEP_LIMIT);
    if (keys.length > 0) await this.queue.enqueue(keys);
    return keys.length;
  }

  /**
   * Removes the rows and files that no sense on show needs and that are older than seven days (design §5.5: weekly). The keys in use are
   * worked out from every open sense, as `ensureForSenses` works them, so the two never disagree. The file goes first: if it cannot be
   * removed the row stays and the next run tries again. A failed read removes nothing. Returns how many rows it removed.
   */
  async cleanup(now: Date): Promise<number> {
    if (this.storage === null) return 0;
    try {
      const used = new Set<string>();
      for (const { uk, us } of speechTargets(await this.repository.loadAllSenseIpa(), this.voices).values()) {
        used.add(uk.key);
        used.add(us.key);
      }
      const unused = await this.repository.unusedBefore(new Date(now.getTime() - UNUSED_KEEP_MS), [...used]);
      if (unused.length === 0) return 0;
      await this.storage.remove(unused.map(audioObjectKey));
      await this.repository.deleteRows(unused);
      return unused.length;
    } catch (error) {
      this.logger.warn('audio_cleanup_failed', { error });
      return 0;
    }
  }

  /** The state of the UK and US recording of a sense for staff (H12); null for a voice with no row, or for a sense not on show. */
  async statesForSense(senseId: string): Promise<{ uk: AudioState | null; us: AudioState | null }> {
    const target = await this.targetsOf(senseId);
    if (target === null) return { uk: null, us: null };
    const rows = new Map((await this.repository.rowsByKeys([target.uk.key, target.us.key])).map((row) => [row.key, row]));
    const state = (key: string): AudioState | null => {
      const row = rows.get(key);
      if (!row) return null;
      const status = row.status as AudioState['status'];
      return { status, error: row.lastError, url: status === 'ready' && this.storage ? this.storage.publicUrl(audioObjectKey(key)) : null };
    };
    return { uk: state(target.uk.key), us: state(target.us.key) };
  }

  /** H13: the failed recordings of a sense go back to pending and are queued. Returns how many. */
  async retryForSense(senseId: string): Promise<number> {
    const target = await this.targetsOf(senseId);
    if (target === null) return 0;
    const reset = await this.repository.resetFailed([...new Set([target.uk.key, target.us.key])], this.clock.now());
    if (reset.length > 0) await this.queue.enqueue(reset);
    return reset.length;
  }

  private async targetsOf(senseId: string) {
    const senses = await this.repository.loadSenseIpa([senseId]);
    return speechTargets(senses, this.voices).get(senseId) ?? null;
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
