import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type {} from 'multer';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { ContentService } from '../../content/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { BackgroundJobsService } from '../jobs/background-jobs.service.js';
import { JobQueueService } from '../jobs/job-queue.service.js';
import { classifyColumns } from './columns.js';
import { parseUploadFile, UploadFileError, type ParsedFile } from './csv-file.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

@Injectable()
export class UploadsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(BackgroundJobsService) private readonly jobs: BackgroundJobsService,
    @Inject(JobQueueService) private readonly queue: JobQueueService,
  ) {}

  async accept(
    user: { userId: string },
    file: Express.Multer.File | undefined,
    levelSourceId: string | undefined,
    operationId: string,
  ): Promise<{ batchId: string }> {
    // Source rejection takes precedence even when the file is missing or structurally broken.
    if (levelSourceId !== undefined) {
      const source = await this.content.getSource(levelSourceId);
      if (!source) {
        throw new ProblemDetailsException({ status: 404, type: 'not-found', title: 'Source not found' });
      }
      if (!this.content.isSourceComplete(source)) {
        throw new ProblemDetailsException({
          status: 400, type: 'source-incomplete', title: 'Source incomplete',
          detail: 'A third-party level source requires a version and license before upload.',
        });
      }
    }

    if (file === undefined) {
      throw new ProblemDetailsException({
        status: 400, type: 'file-invalid', title: 'File invalid', detail: 'No file was uploaded.',
      });
    }

    let parsed: ParsedFile;
    try {
      parsed = parseUploadFile(file.buffer, {
        maxRows: this.config.pipeline.importMaxRows,
        maxBytes: this.config.pipeline.importMaxBytes,
      });
    } catch (error) {
      if (!(error instanceof UploadFileError)) throw error;
      throw new ProblemDetailsException({
        status: error.type === 'file-too-large' ? 413 : 400,
        type: error.type,
        title: error.type === 'file-too-large' ? 'File too large' : 'File invalid',
        detail: error.detail,
      });
    }

    const columns = classifyColumns(parsed.headers);
    if (columns.hasLevelColumn && levelSourceId === undefined) {
      throw new ProblemDetailsException({
        status: 400, type: 'level-source-required', title: 'Level source required',
        detail: 'Specify level_source_id when the file contains a cefr or level column.',
      });
    }

    const batchId = await this.prisma.$transaction(async (tx) => {
      const id = await this.jobs.create(tx, {
        queue: 'content-import', createdBy: user.userId, operationId,
        exclusiveKey: levelSourceId ? `content-import:${levelSourceId}` : undefined,
      });
      await tx.importBatch.create({ data: {
        id, levelSourceId: levelSourceId ?? null, fileName: file.originalname,
        fileSha256: createHash('sha256').update(file.buffer).digest('hex'),
        fileSize: file.size, rowCount: parsed.rows.length, rawHeaders: parsed.rawHeaders,
        warnings: columns.problems,
        // The import handler defines and derives the real counters in a later task.
        counters: {},
      } });
      // Copy the same bytes into an ArrayBuffer-backed Buffer required by Prisma's Bytes input.
      await tx.importBatchFile.create({ data: { batchId: id, content: Buffer.from(file.buffer) } });
      return id;
    }, transactionOptions);

    // Postgres is authoritative; enqueue never throws, and Redis outages leave the batch queued.
    await this.queue.enqueue('content-import', batchId);
    return { batchId };
  }
}
