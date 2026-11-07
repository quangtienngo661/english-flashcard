import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { SettingsService } from '../../settings/index.js';
import { AudioStorage, audioObjectKey } from './audio-storage.js';
import { requestInput } from './google-tts.adapter.js';
import { TtsAdapter } from './tts-adapter.js';
import { TtsQueueService } from './tts-queue.service.js';

const MESSAGE_MAX = 500;

/** How many tries BullMQ gave this job, for the last-try rule. */
export type TtsJobAttempt = { attemptsMade: number; attempts: number };
/** `deferUntil`: the job must wait (the daily cap is used up) and run again then, without using a try. */
export type TtsRunResult = { deferUntil: Date } | undefined;

/**
 * Makes one recording (round C, design §5.5): the `speech_audio` row of the key → the provider → the file in storage → `ready`.
 * Retries are BullMQ's (three tries, five seconds growing); the row keeps the count and the last error. Nothing here logs the text of a
 * word: a private word is the learner's, so logs and errors name the key (a hash).
 */
@Injectable()
export class TtsWorkerService implements OnModuleInit {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(TtsAdapter) private readonly adapter: TtsAdapter | null,
    @Inject(AudioStorage) private readonly storage: AudioStorage | null,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(TtsQueueService) private readonly queue: TtsQueueService,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    this.queue.setHandler('speak', (key, attempt) => this.run(key, attempt));
  }

  async run(key: string, attempt: TtsJobAttempt): Promise<TtsRunResult> {
    const row = await this.prisma.speechAudio.findUnique({ where: { key } });
    if (!row || row.status === 'ready') return undefined;
    if (this.adapter === null || this.storage === null) {
      this.logger.warn('tts_not_configured', { key });
      return undefined;
    }
    const request = { voiceName: row.voiceName, text: row.text, phonemes: row.phonemes };
    const input = requestInput(request);
    const chars = ('text' in input ? input.text : input.ssml).length;

    // The daily cap on characters sent to the provider (UTC day): over it, wait for midnight instead of spending.
    const now = this.clock.now();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const { tts } = await this.settings.get();
    const used = (await this.prisma.speechAudio.aggregate({
      where: { status: 'ready', readyAt: { gte: startOfDay } }, _sum: { charCount: true },
    }))._sum.charCount ?? 0;
    if (used + chars > tts.dailyCharCap) {
      this.logger.info('tts_daily_cap_reached', { key, cap: tts.dailyCharCap });
      return { deferUntil: new Date(startOfDay.getTime() + 24 * 3_600_000) };
    }

    const outcome = await this.adapter.synthesize(request);
    let failure = outcome.ok ? null : { kind: outcome.kind, message: outcome.message.slice(0, MESSAGE_MAX) };
    if (outcome.ok) {
      try {
        await this.storage.put(audioObjectKey(key), outcome.audio);
      } catch (error) {
        failure = { kind: 'transient', message: (error instanceof Error ? error.message : String(error)).slice(0, MESSAGE_MAX) };
      }
    }
    if (outcome.ok && failure === null) {
      await this.prisma.speechAudio.update({ where: { key }, data: {
        status: 'ready', charCount: outcome.chars, readyAt: this.clock.now(), lastError: null, attempts: row.attempts + 1,
      } });
      return undefined;
    }
    const failed = failure!;
    const last = attempt.attemptsMade + 1 >= attempt.attempts;
    const permanent = failed.kind === 'permanent';
    await this.prisma.speechAudio.update({ where: { key }, data: {
      attempts: row.attempts + 1, lastError: failed.message, ...(permanent || last ? { status: 'failed' } : {}),
    } });
    this.logger.warn('tts_failed', { key, kind: failed.kind, last_try: last });
    if (permanent) throw new UnrecoverableError(failed.message);
    throw new Error(failed.message);
  }
}
