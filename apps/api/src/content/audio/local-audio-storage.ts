import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { AudioStorage } from './audio-storage.js';

/**
 * The fake storage (`AUDIO_STORAGE_FAKE_ENABLED`): files under `dir`, served by `GET /v1/dev/audio/:file`. `publicBaseUrl` is that route's
 * URL (e.g. http://localhost:3000/v1/dev/audio), so a URL is `<base>/<key>.mp3`.
 */
export class LocalAudioStorage extends AudioStorage {
  constructor(private readonly dir: string, private readonly publicBaseUrl: string) {
    super();
  }

  async put(objectKey: string, body: Buffer): Promise<void> {
    const path = join(this.dir, objectKey);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  async remove(objectKeys: string[]): Promise<void> {
    await Promise.all(objectKeys.map((objectKey) => rm(join(this.dir, objectKey), { force: true })));
  }

  publicUrl(objectKey: string): string {
    return `${this.publicBaseUrl}/${basename(objectKey)}`;
  }
}
