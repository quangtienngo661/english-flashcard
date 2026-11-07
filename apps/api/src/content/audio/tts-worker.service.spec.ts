import { UnrecoverableError } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { AppLogger } from '../../common/logging/app-logger.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import type { AudioStorage } from './audio-storage.js';
import type { TtsAdapter, TtsOutcome } from './tts-adapter.js';
import { TtsWorkerService } from './tts-worker.service.js';

const KEY = 'a'.repeat(64);
const NOW = new Date('2026-11-07T10:30:00Z');
type Row = { key: string; voice: string; voiceName: string; text: string; phonemes: string | null; status: string; attempts: number };

function setup(over: { row?: Partial<Row> | null; outcome?: TtsOutcome | (() => TtsOutcome); cap?: number; usedToday?: number; putError?: Error } = {}) {
  const row: Row | null = over.row === null ? null
    : { key: KEY, voice: 'uk', voiceName: 'en-GB-Wavenet-B', text: 'lead', phonemes: null, status: 'pending', attempts: 0, ...over.row };
  const speechAudio = {
    findUnique: vi.fn(async () => row),
    update: vi.fn(async (_args: { where: { key: string }; data: Record<string, unknown> }) => ({})),
    aggregate: vi.fn(async (_args: unknown) => ({ _sum: { charCount: over.usedToday ?? 0 } })),
  };
  const adapter = {
    synthesize: vi.fn(async () => (typeof over.outcome === 'function' ? over.outcome() : over.outcome ?? { ok: true, audio: Buffer.from('mp3'), chars: 4 })),
  };
  const storage = { put: vi.fn(async (_key: string, _body: Buffer) => { if (over.putError) throw over.putError; }), publicUrl: vi.fn() };
  const settings = structuredClone(SETTINGS_DEFAULTS);
  settings.tts.dailyCharCap = over.cap ?? 120_000;
  const queue = { setHandler: vi.fn() };
  const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn() };
  const service = new TtsWorkerService(
    { speechAudio } as unknown as PrismaClient, adapter as unknown as TtsAdapter, storage as unknown as AudioStorage, { get: async () => settings } as unknown as SettingsService,
    queue as never, new FakeClock(NOW), logger as unknown as AppLogger,
  );
  return { service, speechAudio, adapter, storage, queue, logger };
}
const first = { attemptsMade: 0, attempts: 3 };
const lastTry = { attemptsMade: 2, attempts: 3 };
const dataOf = (t: ReturnType<typeof setup>) => t.speechAudio.update.mock.calls.at(-1)![0].data;

describe('TtsWorkerService.run (round C, design §5.5)', () => {
  it('registers itself as the queue handler', () => {
    const t = setup();
    t.service.onModuleInit();
    expect(t.queue.setHandler).toHaveBeenCalledTimes(1);
  });

  it('pending → synthesize → store the file under tts/v1/<key>.mp3 → ready with the time and the character count', async () => {
    const t = setup();
    await expect(t.service.run(KEY, first)).resolves.toBeUndefined();
    expect(t.adapter.synthesize).toHaveBeenCalledExactlyOnceWith({ voiceName: 'en-GB-Wavenet-B', text: 'lead', phonemes: null });
    expect(t.storage.put).toHaveBeenCalledExactlyOnceWith(`tts/v1/${KEY}.mp3`, Buffer.from('mp3'));
    expect(dataOf(t)).toMatchObject({ status: 'ready', charCount: 4, readyAt: NOW, lastError: null });
    expect(t.storage.put.mock.invocationCallOrder[0]).toBeLessThan(t.speechAudio.update.mock.invocationCallOrder[0]);
  });

  it('a row that is already ready or is gone is left alone', async () => {
    for (const row of [{ status: 'ready' }, null]) {
      const t = setup({ row });
      await t.service.run(KEY, first);
      expect(t.adapter.synthesize).not.toHaveBeenCalled();
      expect(t.speechAudio.update).not.toHaveBeenCalled();
    }
  });

  it('transient error: attempts + 1, the error is kept and thrown so BullMQ tries again after its backoff', async () => {
    const t = setup({ outcome: { ok: false, kind: 'transient', message: 'unavailable' } });
    await expect(t.service.run(KEY, first)).rejects.toThrow('unavailable');
    expect(dataOf(t)).toMatchObject({ attempts: 1, lastError: 'unavailable' });
    expect(dataOf(t)).not.toHaveProperty('status');
  });

  it('transient error on the last try: failed with the last error', async () => {
    const t = setup({ row: { attempts: 2 }, outcome: { ok: false, kind: 'transient', message: 'unavailable' } });
    await expect(t.service.run(KEY, lastTry)).rejects.toThrow('unavailable');
    expect(dataOf(t)).toMatchObject({ status: 'failed', attempts: 3, lastError: 'unavailable' });
  });

  it('permanent error: failed at once and not retried', async () => {
    const t = setup({ outcome: { ok: false, kind: 'permanent', message: 'bad ssml' } });
    await expect(t.service.run(KEY, first)).rejects.toBeInstanceOf(UnrecoverableError);
    expect(dataOf(t)).toMatchObject({ status: 'failed', lastError: 'bad ssml' });
  });

  it('a file that cannot be stored counts as a transient error', async () => {
    const t = setup({ putError: new Error('R2 down') });
    await expect(t.service.run(KEY, first)).rejects.toThrow('R2 down');
    expect(dataOf(t)).toMatchObject({ attempts: 1, lastError: 'R2 down' });
    expect(dataOf(t)).not.toHaveProperty('status');
  });

  it('the daily cap: what was made today (UTC) plus what is about to be sent over the cap → Google is not called and the job waits for 00:00 UTC', async () => {
    const t = setup({ cap: 100, usedToday: 98 });
    const result = await t.service.run(KEY, first);
    expect(t.adapter.synthesize).not.toHaveBeenCalled();
    expect(t.storage.put).not.toHaveBeenCalled();
    expect(result).toEqual({ deferUntil: new Date('2026-11-08T00:00:00Z') });
    expect(t.speechAudio.update).not.toHaveBeenCalled();
  });

  it('the cap counts only rows made since 00:00 UTC today', async () => {
    const t = setup({ cap: 100, usedToday: 0 });
    await t.service.run(KEY, first);
    expect(t.speechAudio.aggregate).toHaveBeenCalledExactlyOnceWith({
      where: { status: 'ready', readyAt: { gte: new Date('2026-11-07T00:00:00Z') } }, _sum: { charCount: true },
    });
  });

  it('exactly at the cap is allowed; one over is not', async () => {
    expect((await setup({ cap: 4, usedToday: 0 }).service.run(KEY, first))).toBeUndefined();
    expect((await setup({ cap: 4, usedToday: 1 }).service.run(KEY, first))).toEqual({ deferUntil: expect.any(Date) });
  });

  it('a cap of 0 stops new recordings', async () => {
    const t = setup({ cap: 0 });
    expect(await t.service.run(KEY, first)).toEqual({ deferUntil: expect.any(Date) });
  });

  it('what is about to be sent includes the SSML around phonemes', async () => {
    const ssmlLength = '<speak><phoneme alphabet="ipa" ph="ˈlɛd">lead</phoneme></speak>'.length;
    const t = setup({ row: { phonemes: 'ˈlɛd' }, cap: ssmlLength - 1 });
    expect(await t.service.run(KEY, first)).toEqual({ deferUntil: expect.any(Date) });
    expect(setup({ row: { phonemes: 'ˈlɛd' }, cap: ssmlLength }).service.run(KEY, first)).resolves.toBeUndefined();
  });

  it('logs the key, never the text of a word', async () => {
    const t = setup({ outcome: { ok: false, kind: 'permanent', message: 'bad ssml' } });
    await t.service.run(KEY, first).catch(() => undefined);
    const logged = JSON.stringify([...t.logger.warn.mock.calls, ...t.logger.info.mock.calls, ...t.logger.error.mock.calls]);
    expect(logged).toContain(KEY);
    expect(logged).not.toContain('lead');
  });
});
