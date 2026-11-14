import { Controller, Get, Inject, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { rejectedCsv } from './csv-writer.js';

const uuid = z.uuid().transform((value) => value.toLowerCase());
const batchParams = z.strictObject({ id: uuid });
const listQuery = z.strictObject({
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  page_token: z.string().optional(),
});
const cursorSchema = z.strictObject({ created_at: z.iso.datetime(), id: uuid });
const queryBinding = createHash('sha256').update(JSON.stringify({ route: 'uploads', filters: {} })).digest('hex');
const jobSelect = { status: true, createdAt: true, startedAt: true, finishedAt: true } as const;

@Controller('admin/content/uploads')
@RequirePermission('content.import')
export class UploadsReadController {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  @Get()
  async list(@Query({ schema: listQuery }) query: z.infer<typeof listQuery>) {
    let cursor: z.infer<typeof cursorSchema> | undefined;
    if (query.page_token !== undefined) {
      const parsed = cursorSchema.safeParse(decodeBoundToken(query.page_token, queryBinding));
      if (!parsed.success) throw new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
      cursor = parsed.data;
    }
    const createdAt = cursor ? new Date(cursor.created_at) : undefined;
    const rows = await this.prisma.importBatch.findMany({
      where: cursor ? { OR: [
        { job: { createdAt: { lt: createdAt } } },
        { job: { createdAt }, id: { gt: cursor.id } },
      ] } : {},
      orderBy: [{ job: { createdAt: 'desc' } }, { id: 'asc' }], take: query.page_size + 1,
      select: { id: true, fileName: true, rowCount: true, job: { select: { status: true, createdAt: true } } },
    });
    const items = rows.slice(0, query.page_size);
    const last = items.at(-1);
    return {
      items: items.map((batch) => ({ id: batch.id, status: batch.job.status, file_name: batch.fileName,
        row_count: batch.rowCount, created_at: batch.job.createdAt.toISOString() })),
      next_page_token: rows.length > query.page_size && last
        ? encodeBoundToken({ created_at: last.job.createdAt.toISOString(), id: last.id }, queryBinding) : null,
    };
  }

  @Get(':id/rejected.csv')
  async rejectedCsv(@Param({ schema: batchParams }) params: z.infer<typeof batchParams>, @Res() response: Response): Promise<void> {
    const batch = await this.prisma.importBatch.findUnique({ where: { id: params.id }, select: { rawHeaders: true } });
    if (!batch) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    const outcomes = await this.prisma.importRowOutcome.findMany({
      where: { batchId: params.id, outcome: 'rejected' }, orderBy: { rowNumber: 'asc' },
    });
    // Upload validation and recordRejected persist ordered string arrays, including ignored columns.
    const csv = rejectedCsv(batch.rawHeaders as string[], outcomes.map((row) => ({
      raw: row.raw as string[], rowNumber: row.rowNumber, errors: row.errorMessages,
    })));
    response.type('text/csv').setHeader('Content-Disposition', `attachment; filename="rejected-${params.id}.csv"`);
    response.send(csv);
  }

  @Get(':id')
  async get(@Param({ schema: batchParams }) params: z.infer<typeof batchParams>) {
    const batch = await this.prisma.importBatch.findUnique({ where: { id: params.id }, select: {
      id: true, fileName: true, rowCount: true, counters: true, warnings: true, revertedAt: true,
      job: { select: jobSelect },
    } });
    if (!batch) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    return {
      id: batch.id, status: batch.job.status, file_name: batch.fileName, row_count: batch.rowCount,
      counters: batch.counters, warnings: batch.warnings, created_at: batch.job.createdAt.toISOString(),
      started_at: batch.job.startedAt?.toISOString() ?? null, finished_at: batch.job.finishedAt?.toISOString() ?? null,
      reverted: batch.revertedAt !== null,
    };
  }
}
