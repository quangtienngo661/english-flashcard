import { describe, expect, it, vi } from 'vitest';
import { testConfig } from '../../../test/support/test-config.js';
import type { AppConfig } from '../../common/config/app-config.js';
import type { AppLogger } from '../../common/logging/app-logger.js';
import { AudioRepository } from './audio.queries.js';
import { AudioService } from './audio.service.js';
import { audioKey, type SenseIpa, type SpeechTarget } from './audio-key.js';
import type { AudioStorage } from './audio-storage.js';
import type { TtsQueueService } from './tts-queue.service.js';

const UK = 'en-GB-Wavenet-B';
const US = 'en-US-Wavenet-D';
const sense = (over: Partial<SenseIpa> & { senseId: string; lemma: string }): SenseIpa => ({ scope: 'catalog', ipaUk: null, ipaUs: null, ...over });

/** An in-memory `speech_audio`: insertPending keeps the first row of a key, like INSERT … ON CONFLICT DO NOTHING. */
function setup(over: { senses?: SenseIpa[]; provider?: AppConfig['tts']['provider']; storage?: AudioStorage | null; enqueue?: (keys: string[]) => Promise<boolean> } = {}) {
  const table = new Map<string, { status: string; target: SpeechTarget & { voice: string } }>();
  const repo = {
    loadSenseIpa: vi.fn(async (_ids: string[]) => over.senses ?? []),
    insertPending: vi.fn(async (targets: Array<SpeechTarget & { voice: string }>) => {
      const fresh: string[] = [];
      for (const target of targets) {
        if (table.has(target.key)) continue;
        table.set(target.key, { status: 'pending', target });
        fresh.push(target.key);
      }
      return fresh;
    }),
    readyKeys: vi.fn(async (keys: string[]) => new Set(keys.filter((key) => table.get(key)?.status === 'ready'))),
  };
  const queue = { enqueue: vi.fn(over.enqueue ?? (async () => true)) };
  const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn() };
  const storage = 'storage' in over ? over.storage : { publicUrl: (objectKey: string) => `https://audio.example.com/${objectKey}` } as AudioStorage;
  const config = testConfig({ tts: { provider: over.provider === undefined ? 'fake' : over.provider, voiceUk: UK, voiceUs: US, credentials: null } });
  const service = new AudioService(config, repo as unknown as AudioRepository, queue as unknown as TtsQueueService, storage ?? null, logger as unknown as AppLogger);
  return { service, repo, queue, logger, table };
}

const record = (id: string, pos = 'noun') => sense({ senseId: id, lemma: 'record', ipaUk: 'ˈrekɔːd', ipaUs: 'ˈrɛkɚd', ...(pos ? {} : {}) });

describe('AudioService.ensureForSenses (round C, design §5.5)', () => {
  it('a newly published sense gets two pending rows (UK and US) and two jobs', async () => {
    const t = setup({ senses: [record('noun')] });
    const fresh = await t.service.ensureForSenses(['noun']);
    expect(fresh).toHaveLength(2);
    expect([...t.table.values()].map((row) => [row.target.voice, row.status])).toEqual([['uk', 'pending'], ['us', 'pending']]);
    expect(t.queue.enqueue).toHaveBeenCalledExactlyOnceWith(fresh);
  });

  it('the same content again: no new row, no new job', async () => {
    const t = setup({ senses: [record('noun')] });
    await t.service.ensureForSenses(['noun']);
    t.queue.enqueue.mockClear();
    expect(await t.service.ensureForSenses(['noun'])).toEqual([]);
    expect(t.table.size).toBe(2);
    expect(t.queue.enqueue).not.toHaveBeenCalled();
  });

  it('Review Focus 4: a changed UK ipa on one sense of record makes new keys for every sense of record', async () => {
    const both = [record('noun'), record('verb')];
    const t = setup({ senses: both });
    await t.service.ensureForSenses(['noun']);
    expect(t.table.size).toBe(2); // both senses share the same two keys
    t.repo.loadSenseIpa.mockResolvedValue([record('noun'), { ...record('verb'), ipaUk: 'rɪˈkɔːd' }]);
    const fresh = await t.service.ensureForSenses(['verb']);
    const keys = new Set(fresh);
    expect(keys.has(audioKey(UK, 'record', 'ˈɹɛkɔːd'))).toBe(true);
    expect(keys.has(audioKey(UK, 'record', 'ɹɪˈkɔːd'))).toBe(true);
    // The old plain-text key is not touched here: the cleanup removes it after seven days if nothing uses it.
    expect(t.table.has(audioKey(UK, 'record', null))).toBe(true);
  });

  it('the senses are read for the ids asked, then the whole lemma is covered', async () => {
    const t = setup({ senses: [record('noun'), record('verb')] });
    await t.service.ensureForSenses(['verb']);
    expect(t.repo.loadSenseIpa).toHaveBeenCalledExactlyOnceWith(['verb']);
  });

  it('Redis down: the rows stay pending and the call still succeeds', async () => {
    const t = setup({ senses: [record('noun')], enqueue: async () => false });
    await expect(t.service.ensureForSenses(['noun'])).resolves.toHaveLength(2);
    expect([...t.table.values()].every((row) => row.status === 'pending')).toBe(true);
  });

  it('never throws: a database error is logged as audio_ensure_failed', async () => {
    const t = setup({ senses: [record('noun')] });
    t.repo.loadSenseIpa.mockRejectedValue(new Error('db down'));
    await expect(t.service.ensureForSenses(['noun'])).resolves.toEqual([]);
    expect(t.logger.warn).toHaveBeenCalledWith('audio_ensure_failed', expect.objectContaining({ error: expect.any(Error) }));
  });

  it('a queue that throws is logged and the call still returns the keys', async () => {
    const t = setup({ senses: [record('noun')], enqueue: async () => { throw new Error('boom'); } });
    await expect(t.service.ensureForSenses(['noun'])).resolves.toEqual([]);
    expect(t.logger.warn).toHaveBeenCalledWith('audio_ensure_failed', expect.anything());
  });

  it('no provider: it does nothing, not even a read', async () => {
    const t = setup({ senses: [record('noun')], provider: null });
    expect(await t.service.ensureForSenses(['noun'])).toEqual([]);
    expect(t.repo.loadSenseIpa).not.toHaveBeenCalled();
  });

  it('no storage: it does nothing either (a recording could not be kept)', async () => {
    const t = setup({ senses: [record('noun')], storage: null });
    expect(await t.service.ensureForSenses(['noun'])).toEqual([]);
    expect(t.repo.loadSenseIpa).not.toHaveBeenCalled();
  });

  it('no ids: nothing', async () => {
    const t = setup({ senses: [record('noun')] });
    expect(await t.service.ensureForSenses([])).toEqual([]);
    expect(t.repo.loadSenseIpa).not.toHaveBeenCalled();
  });

  it('a sense with no ipa still gets its two plain-text recordings', async () => {
    const t = setup({ senses: [sense({ senseId: 'a', lemma: 'cat' })] });
    const fresh = await t.service.ensureForSenses(['a']);
    expect(new Set(fresh)).toEqual(new Set([audioKey(UK, 'cat', null), audioKey(US, 'cat', null)]));
    expect([...t.table.values()].map((row) => row.target.text)).toEqual(['cat', 'cat']);
  });

  it('two senses that read the same share one row per voice', async () => {
    const t = setup({ senses: [sense({ senseId: 'a', lemma: 'cat' }), sense({ senseId: 'b', lemma: 'cat' })] });
    expect(await t.service.ensureForSenses(['a', 'b'])).toHaveLength(2);
  });
});

describe('AudioService.urlsForSenses (H9)', () => {
  it('a ready file gives its public URL; pending, failed or missing gives null', async () => {
    const t = setup({ senses: [sense({ senseId: 'a', lemma: 'cat' })] });
    await t.service.ensureForSenses(['a']);
    const ukKey = audioKey(UK, 'cat', null);
    t.table.get(ukKey)!.status = 'ready';
    const urls = await t.service.urlsForSenses(['a']);
    expect(urls.get('a')).toEqual({ uk: `https://audio.example.com/tts/v1/${ukKey}.mp3`, us: null });
  });

  it('a sense with nothing made yet is { null, null }', async () => {
    const t = setup({ senses: [sense({ senseId: 'a', lemma: 'cat' })] });
    expect((await t.service.urlsForSenses(['a'])).get('a')).toEqual({ uk: null, us: null });
  });

  it('lead with two readings: each sense gets its own UK file', async () => {
    const lead = [sense({ senseId: 'metal', lemma: 'lead', ipaUk: 'lɛd' }), sense({ senseId: 'guide', lemma: 'lead', ipaUk: 'liːd' })];
    const t = setup({ senses: lead });
    await t.service.ensureForSenses(['metal']);
    for (const row of t.table.values()) row.status = 'ready';
    const urls = await t.service.urlsForSenses(['metal', 'guide']);
    expect(urls.get('metal')!.uk).not.toBe(urls.get('guide')!.uk);
    expect(urls.get('metal')!.uk).toContain(audioKey(UK, 'lead', 'lɛd'));
  });

  it('no storage → null for everyone, and no read', async () => {
    const t = setup({ senses: [sense({ senseId: 'a', lemma: 'cat' })], storage: null });
    expect((await t.service.urlsForSenses(['a'])).get('a')).toEqual({ uk: null, us: null });
    expect(t.repo.readyKeys).not.toHaveBeenCalled();
  });

  it('a database error is logged and every url is null: a word page never fails for audio', async () => {
    const t = setup({ senses: [sense({ senseId: 'a', lemma: 'cat' })] });
    t.repo.loadSenseIpa.mockRejectedValue(new Error('db down'));
    expect((await t.service.urlsForSenses(['a'])).get('a')).toEqual({ uk: null, us: null });
    expect(t.logger.warn).toHaveBeenCalledWith('audio_urls_failed', expect.anything());
  });

  it('reads the ready rows once for the whole list', async () => {
    const t = setup({ senses: [sense({ senseId: 'a', lemma: 'cat' }), sense({ senseId: 'b', lemma: 'dog' })] });
    await t.service.urlsForSenses(['a', 'b']);
    expect(t.repo.readyKeys).toHaveBeenCalledTimes(1);
  });
});
