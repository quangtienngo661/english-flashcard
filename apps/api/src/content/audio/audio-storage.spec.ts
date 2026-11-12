import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DeleteObjectsCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../../common/config/app-config.js';
import { audioObjectKey } from './audio-storage.js';
import { DevAudioController } from './dev-audio.controller.js';
import { LocalAudioStorage } from './local-audio-storage.js';
import { R2AudioStorage } from './r2-audio-storage.js';

const KEY = 'a'.repeat(64);

describe('audioObjectKey', () => {
  it('is tts/v1/<key>.mp3', () => {
    expect(audioObjectKey(KEY)).toBe(`tts/v1/${KEY}.mp3`);
  });
});

describe('LocalAudioStorage', () => {
  let dir: string;
  beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'audio-')); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

  it('put writes <dir>/tts/v1/<key>.mp3 and creates the folders', async () => {
    const storage = new LocalAudioStorage(dir, 'http://localhost:3000/v1/dev/audio');
    await storage.put(audioObjectKey(KEY), Buffer.from('mp3-bytes'));
    expect((await readFile(join(dir, 'tts', 'v1', `${KEY}.mp3`))).toString()).toBe('mp3-bytes');
  });

  it('publicUrl points at the dev route: <base>/<key>.mp3', () => {
    expect(new LocalAudioStorage(dir, 'http://localhost:3000/v1/dev/audio').publicUrl(audioObjectKey(KEY)))
      .toBe(`http://localhost:3000/v1/dev/audio/${KEY}.mp3`);
  });

  it('remove deletes the files and ignores one that is already gone', async () => {
    const storage = new LocalAudioStorage(dir, 'http://x');
    await storage.put(audioObjectKey(KEY), Buffer.from('a'));
    await storage.remove([audioObjectKey(KEY), audioObjectKey('b'.repeat(64))]);
    await expect(stat(join(dir, 'tts', 'v1', `${KEY}.mp3`))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

describe('R2AudioStorage', () => {
  const config = { endpoint: 'https://account.r2.cloudflarestorage.com', bucket: 'wordmet-audio', accessKeyId: 'id', secretAccessKey: 'secret' };
  const setup = () => {
    const send = vi.fn(async (_command: unknown) => ({}));
    return { send, storage: new R2AudioStorage(config, 'https://audio.example.com', { send } as unknown as S3Client) };
  };

  it('put sends the mp3 with a content type and a year-long immutable cache', async () => {
    const { send, storage } = setup();
    await storage.put(audioObjectKey(KEY), Buffer.from('x'));
    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: 'wordmet-audio', Key: `tts/v1/${KEY}.mp3`, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable',
    });
    expect(Buffer.from(command.input.Body as Buffer).toString()).toBe('x');
  });

  it('remove deletes in batches of 1000 keys', async () => {
    const { send, storage } = setup();
    const keys = Array.from({ length: 2500 }, (_, i) => `tts/v1/${String(i)}.mp3`);
    await storage.remove(keys);
    expect(send).toHaveBeenCalledTimes(3);
    const batches = send.mock.calls.map(([command]) => (command as DeleteObjectsCommand).input.Delete?.Objects?.length);
    expect(batches).toEqual([1000, 1000, 500]);
    expect((send.mock.calls[0][0] as DeleteObjectsCommand).input).toMatchObject({ Bucket: 'wordmet-audio', Delete: { Quiet: true } });
  });

  it('remove of nothing sends nothing', async () => {
    const { send, storage } = setup();
    await storage.remove([]);
    expect(send).not.toHaveBeenCalled();
  });

  it('a per-key error reported by R2 fails the removal, so the caller keeps the row for the next sweep', async () => {
    const send = vi.fn(async () => ({ Errors: [{ Key: 'tts/v1/x.mp3', Code: 'InternalError' }] }));
    const storage = new R2AudioStorage(config, 'https://audio.example.com', { send } as unknown as S3Client);
    await expect(storage.remove(['tts/v1/x.mp3'])).rejects.toThrow(/tts\/v1\/x\.mp3/);
  });

  it('publicUrl is <public base>/<object key>', () => {
    expect(setup().storage.publicUrl(audioObjectKey(KEY))).toBe(`https://audio.example.com/tts/v1/${KEY}.mp3`);
  });
});

describe('DevAudioController (H16)', () => {
  let dir: string;
  beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'audio-')); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

  const controller = (storage: 'local' | 'r2' | null) => new DevAudioController({ audio: { storage, localDir: dir } } as unknown as AppConfig);
  const response = () => {
    const sent: { type?: string; status?: number; body?: Buffer } = {};
    const res = {
      type: vi.fn((value: string) => { sent.type = value; return res; }),
      status: vi.fn((value: number) => { sent.status = value; return res; }),
      send: vi.fn((value: Buffer) => { sent.body = value; return res; }),
    };
    return { res, sent };
  };

  it('is 404 unless the local fake storage is on', async () => {
    for (const storage of [null, 'r2' as const]) {
      await expect(controller(storage).read(`${KEY}.mp3`, response().res as never)).rejects.toMatchObject({ status: 404 });
    }
  });

  it('serves a stored file as audio/mpeg', async () => {
    await new LocalAudioStorage(dir, 'http://x').put(audioObjectKey(KEY), Buffer.from('mp3-bytes'));
    const { res, sent } = response();
    await controller('local').read(`${KEY}.mp3`, res as never);
    expect(sent.type).toBe('audio/mpeg');
    expect(sent.body?.toString()).toBe('mp3-bytes');
  });

  it('refuses a name that is not <64 hex>.mp3, so no path can leave the folder', async () => {
    for (const name of ['../secret.mp3', `${KEY}.wav`, 'A'.repeat(64) + '.mp3', `${KEY}.mp3/..`, 'x.mp3', `..%2f${KEY}.mp3`]) {
      await expect(controller('local').read(name, response().res as never), name).rejects.toMatchObject({ status: 404 });
    }
  });

  it('a well-formed name with no file is 404', async () => {
    await expect(controller('local').read(`${'c'.repeat(64)}.mp3`, response().res as never)).rejects.toMatchObject({ status: 404 });
  });
});

describe('audioStorageFor', () => {
  const base = { publicBaseUrl: 'https://audio.example.com', r2: { endpoint: 'https://e', bucket: 'b', accessKeyId: 'i', secretAccessKey: 's' }, localDir: '.tmp/audio' };

  it('picks the storage the configuration names, and none when audio is off', async () => {
    const { audioStorageFor } = await import('./audio-storage.provider.js');
    expect(audioStorageFor({ audio: { ...base, storage: 'r2' } } as unknown as AppConfig)).toBeInstanceOf(R2AudioStorage);
    expect(audioStorageFor({ audio: { ...base, storage: 'local' } } as unknown as AppConfig)).toBeInstanceOf(LocalAudioStorage);
    expect(audioStorageFor({ audio: { ...base, storage: null } } as unknown as AppConfig)).toBeNull();
  });
});
