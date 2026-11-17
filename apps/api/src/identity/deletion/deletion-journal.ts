import { GetObjectCommand, paginateListObjectsV2, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { z } from 'zod';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';

const PREFIX = 'v1/accounts/';
const COVERAGE_KEY = 'v1/initialized';
const COVERAGE_VALUE = 'wordmet-account-deletions-v1';
const TIMEOUT_MS = 5_000;

const entrySchema = z.strictObject({ user_id: z.uuid(), deleted_at: z.iso.datetime(), by: z.enum(['self', 'admin', 'cleanup']) });
export type DeletionJournalEntry = z.infer<typeof entrySchema>;

const entryKey = (entry: DeletionJournalEntry) => `${PREFIX}${entry.user_id}.json`;
const sendOptions = () => ({ abortSignal: AbortSignal.timeout(TIMEOUT_MS) });

/** The recovery copy of deletion requests, independent of the database and its backups. */
@Injectable()
export class DeletionJournal implements OnModuleDestroy {
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private verifiedCoverage = false;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    const r2 = config.deletionJournal;
    this.bucket = r2?.bucket ?? '';
    this.client = r2 === null ? null : new S3Client({
      region: 'auto', endpoint: r2.endpoint, forcePathStyle: true, maxAttempts: 2,
      credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
      requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
      requestHandler: { connectionTimeout: 2_000, requestTimeout: TIMEOUT_MS, throwOnRequestTimeout: true },
    });
  }

  get enabled(): boolean { return this.client !== null; }

  onModuleDestroy(): void { this.client?.destroy(); }

  async append(entry: DeletionJournalEntry): Promise<void> {
    if (!this.verifiedCoverage) await this.verifyCoverage();
    await this.putEntry(entry);
  }

  /** Run with live deletion writers stopped. A partial seed does not certify coverage. */
  async seed(entries: DeletionJournalEntry[]): Promise<void> {
    for (const entry of entries) await this.putEntry(entry);
    await this.putOnce(COVERAGE_KEY, COVERAGE_VALUE, 'text/plain');
    await this.verifyCoverage();
  }

  /** Validate the entire journal before the caller starts erasing accounts. */
  async readAll(): Promise<DeletionJournalEntry[]> {
    await this.verifyCoverage();
    const entries: DeletionJournalEntry[] = [];
    for await (const page of paginateListObjectsV2({ client: this.requireClient() }, {
      Bucket: this.bucket, Prefix: PREFIX,
    })) {
      for (const object of page.Contents ?? []) {
        if (!object.Key) throw new Error('Deletion journal lists an entry without an object key');
        entries.push(await this.readEntry(object.Key));
      }
    }
    return entries;
  }

  private async verifyCoverage(): Promise<void> {
    if (await this.read(COVERAGE_KEY) !== COVERAGE_VALUE) throw new Error('Deletion journal initialization marker is invalid');
    this.verifiedCoverage = true;
  }

  private async read(key: string): Promise<string> {
    const response = await this.requireClient().send(new GetObjectCommand({ Bucket: this.bucket, Key: key }), sendOptions());
    if (!response.Body) throw new Error('Deletion journal object has no body');
    return response.Body.transformToString();
  }

  private async readEntry(key: string): Promise<DeletionJournalEntry> {
    const entry = entrySchema.parse(JSON.parse(await this.read(key)));
    if (entryKey(entry) !== key) throw new Error('Deletion journal entry does not match its object key');
    return entry;
  }

  private async putEntry(entry: DeletionJournalEntry): Promise<void> {
    const record = entrySchema.parse(entry);
    const key = entryKey(record);
    if (!(await this.putOnce(key, JSON.stringify(record), 'application/json'))) await this.readEntry(key);
  }

  private async putOnce(key: string, body: string, contentType: string): Promise<boolean> {
    try {
      await this.requireClient().send(new PutObjectCommand({
        Bucket: this.bucket, Key: key, Body: body, ContentType: contentType, IfNoneMatch: '*',
      }), sendOptions());
      return true;
    } catch (error) {
      // The account key is immutable. A concurrent write or a retry can find the record already committed.
      if ((error as { $metadata?: { httpStatusCode?: number } } | null)?.$metadata?.httpStatusCode !== 412) throw error;
      return false;
    }
  }

  private requireClient(): S3Client {
    if (this.client === null) throw new Error('Deletion journal is not configured');
    return this.client;
  }
}
