import { Global, Inject, Injectable, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { BATCH_SCOPE, ContentService, type BatchScope, type ScopeRecord } from '../../content/index.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';

@Injectable()
export class ImportBatchScope implements BatchScope {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(ModuleRef) private readonly moduleRef: ModuleRef,
  ) {}

  async entryIdsOf(batchId: string, db: Prisma.TransactionClient | PrismaClient = this.prisma): Promise<string[]> {
    return (await this.owners(batchId, ['entry', 'variant', 'level'], db)).entryIds;
  }

  async senseIdsOf(batchId: string, db: Prisma.TransactionClient | PrismaClient = this.prisma): Promise<string[]> {
    return (await this.owners(batchId, ['sense', 'revision'], db)).senseIds;
  }

  private async owners(batchId: string, types: ScopeRecord['type'][], db: Prisma.TransactionClient | PrismaClient) {
    const records = await db.batchRecord.findMany({ where: { batchId, recordType: { in: types } },
      select: { recordType: true, recordId: true } });
    // Resolve at call time, after bootstrap: eager ContentService injection would cycle
    // ContentService -> AdminCatalogQueries -> BATCH_SCOPE -> ContentService.
    const content = this.moduleRef.get(ContentService, { strict: false });
    return content.resolveBatchRecordOwners(records.map(({ recordType, recordId }) => ({
      type: recordType as ScopeRecord['type'], id: recordId,
    })), db);
  }
}

/** Independent global port wiring; Content never imports ContentPipelineModule. */
@Global()
@Module({
  providers: [ImportBatchScope, { provide: BATCH_SCOPE, useExisting: ImportBatchScope }],
  exports: [BATCH_SCOPE],
})
export class BatchScopeModule {}
