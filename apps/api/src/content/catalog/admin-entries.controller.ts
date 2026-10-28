import { Body, Controller, Delete, HttpCode, Inject, Param, Put } from '@nestjs/common';
import { z } from 'zod';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { LEVELS } from '../content.constants.js';
import { ContentService } from '../content.service.js';
import { normalizeText } from './normalize.js';

const entryParamsSchema = z.strictObject({ id: z.uuid() });
const variantsSchema = z.strictObject({ variants: z.array(z.strictObject({
  text: z.string().transform(normalizeText).pipe(z.string().min(1).max(2_000)),
  kind: z.enum(['spelling', 'alias']),
  accepted_as_answer: z.boolean(),
})) });
const editorialLevelSchema = z.strictObject({ level: z.enum(LEVELS) });
const functionWordSchema = z.strictObject({ override: z.boolean().nullable() });
type EntryParams = z.infer<typeof entryParamsSchema>;
type VariantsBody = z.infer<typeof variantsSchema>;
type EditorialLevelBody = z.infer<typeof editorialLevelSchema>;
type FunctionWordBody = z.infer<typeof functionWordSchema>;
const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

async function writeEntry(
  prisma: PrismaClient, content: ContentService, entryId: string,
  write: (tx: Prisma.TransactionClient) => Promise<void>,
): Promise<void> {
  // Resolve the immutable key before opening the transaction, so its first operation is the lock.
  // Each write method checks that the entry still exists after acquiring that lock.
  const entry = await prisma.entry.findFirst({ where: { id: entryId, scope: 'catalog' }, select: { lemma: true, pos: true } });
  if (!entry) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
  await prisma.$transaction(async (tx) => {
    await content.lockEntryKey(tx, entry.lemma, entry.pos);
    await write(tx);
  }, transactionOptions);
}

@Controller('admin/content/entries')
@RequirePermission('content.edit')
export class AdminEntriesController {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(ContentService) private readonly content: ContentService,
  ) {}

  @Put(':id/variants')
  @HttpCode(204)
  @RateLimit('user.write')
  setVariants(
    @Param({ schema: entryParamsSchema }) params: EntryParams,
    @Body({ schema: variantsSchema }) body: VariantsBody,
  ): Promise<void> {
    return writeEntry(this.prisma, this.content, params.id, (tx) => this.content.setVariants(tx, params.id,
      body.variants.map(({ text, kind, accepted_as_answer }) => ({ text, kind, acceptedAsAnswer: accepted_as_answer }))));
  }

  @Put(':id/levels/editorial')
  @HttpCode(204)
  @RateLimit('user.write')
  setEditorialLevel(
    @Param({ schema: entryParamsSchema }) params: EntryParams,
    @Body({ schema: editorialLevelSchema }) body: EditorialLevelBody,
  ): Promise<void> {
    return writeEntry(this.prisma, this.content, params.id, (tx) => this.content.setEditorialLevel(tx, params.id, body.level));
  }

  /** Only a word that was never published and that nothing uses; otherwise 409 `entry-in-use` with `reasons`. */
  @Delete(':id')
  @HttpCode(204)
  @RateLimit('user.write')
  deleteEntry(@Param({ schema: entryParamsSchema }) params: EntryParams): Promise<void> {
    return this.content.deleteEntry(params.id);
  }
}

@Controller('admin/taxonomy/entries')
@RequirePermission('taxonomy.manage')
export class EntryFunctionWordController {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(ContentService) private readonly content: ContentService,
  ) {}

  @Put(':id/function-word')
  @HttpCode(204)
  @RateLimit('user.write')
  setFunctionWordOverride(
    @Param({ schema: entryParamsSchema }) params: EntryParams,
    @Body({ schema: functionWordSchema }) body: FunctionWordBody,
  ): Promise<void> {
    return writeEntry(this.prisma, this.content, params.id, (tx) => this.content.setFunctionWordOverride(tx, params.id, body.override));
  }
}
