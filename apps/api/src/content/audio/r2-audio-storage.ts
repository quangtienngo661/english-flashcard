import { DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { AudioStorage } from './audio-storage.js';

const DELETE_BATCH = 1000;

/** Cloudflare R2 through its S3 API (round C, design §5.5). The bucket is public behind a custom domain (`publicBaseUrl`). */
export class R2AudioStorage extends AudioStorage {
  private readonly client: S3Client;

  constructor(
    private readonly config: { endpoint: string; bucket: string; accessKeyId: string; secretAccessKey: string },
    private readonly publicBaseUrl: string,
    client?: S3Client,
  ) {
    super();
    this.client = client ?? new S3Client({
      region: 'auto', endpoint: config.endpoint,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      // R2 does not take the extra checksum headers newer SDK versions add by default.
      requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async put(objectKey: string, body: Buffer): Promise<void> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.config.bucket, Key: objectKey, Body: body, ContentType: 'audio/mpeg',
      // The key holds a hash of what was said and how: a file is never rewritten with other content.
      CacheControl: 'public, max-age=31536000, immutable',
    }));
  }

  async remove(objectKeys: string[]): Promise<void> {
    for (let at = 0; at < objectKeys.length; at += DELETE_BATCH) {
      const result = await this.client.send(new DeleteObjectsCommand({
        Bucket: this.config.bucket,
        Delete: { Objects: objectKeys.slice(at, at + DELETE_BATCH).map((Key) => ({ Key })), Quiet: true },
      }));
      const failed = result.Errors ?? [];
      if (failed.length > 0) throw new Error(`R2 did not delete: ${failed.map((error) => error.Key).join(', ')}`);
    }
  }

  publicUrl(objectKey: string): string {
    return `${this.publicBaseUrl}/${objectKey}`;
  }
}
