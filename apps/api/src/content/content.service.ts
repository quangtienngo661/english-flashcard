import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../common/db/prisma.module.js';
import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { AdminCatalogQueries, type ExportRow, type LatestRevision, type ScopeRecord } from './catalog/admin-catalog.queries.js';
import type { SenseFilter } from './catalog/sense-filters.js';
import { EntriesService, type EnsureEntryInput, type EnsureEntryResult, type VariantInput } from './catalog/entries.service.js';
import { LevelsService, type EntryLevelView, type ImportedLevelInput } from './catalog/levels.service.js';
import { revertRecords, type RevertRecord, type RevertReport } from './catalog/revert.service.js';
import type { Level } from './content.constants.js';
import { SourcesService, isSourceComplete, type SourceView } from './sources/sources.service.js';
import { SensesService, type CreateSenseInput, type SaveDraftInput, type SaveDraftResult, type MarkRevisionItem, type MarkRevisionResult } from './senses/senses.service.js';
import { importContent, type ImportContentInput, type ImportContentResult } from './senses/import-content.js';
import { PublishService, type PublishItem, type PublishItemResult, type QuickPublishResult, type SenseStateResult } from './senses/publish.service.js';

@Injectable()
export class ContentService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(SourcesService) private readonly sources: SourcesService,
    @Inject(EntriesService) private readonly entries: EntriesService,
    @Inject(LevelsService) private readonly levels: LevelsService,
    @Inject(SensesService) private readonly senses: SensesService,
    @Inject(PublishService) private readonly publish: PublishService,
    @Inject(AdminCatalogQueries) private readonly queries: AdminCatalogQueries,
  ) {}

  getSource(id: string): Promise<SourceView | null> {
    return this.sources.getSource(id);
  }

  isSourceComplete(source: SourceView): boolean {
    return isSourceComplete(source);
  }

  lockEntryKey(tx: Prisma.TransactionClient, lemma: string, pos: string): Promise<void> {
    return this.entries.lockEntryKey(tx, lemma, pos);
  }

  ensureEntry(tx: Prisma.TransactionClient, input: EnsureEntryInput): Promise<EnsureEntryResult> {
    return this.entries.ensureEntry(tx, input);
  }

  listLevels(tx: Prisma.TransactionClient, entryId: string, sourceId: string): Promise<EntryLevelView[]> {
    return this.levels.listLevels(tx, entryId, sourceId);
  }

  addImportedLevel(tx: Prisma.TransactionClient, input: ImportedLevelInput): Promise<{ created: boolean; id: string }> {
    return this.levels.addImportedLevel(tx, input);
  }

  setEditorialLevel(tx: Prisma.TransactionClient, entryId: string, level: Level): Promise<void> {
    return this.levels.setEditorialLevel(tx, entryId, level);
  }

  setVariants(tx: Prisma.TransactionClient, entryId: string, variants: VariantInput[]): Promise<void> {
    return this.entries.setVariants(tx, entryId, variants);
  }

  setFunctionWordOverride(tx: Prisma.TransactionClient, entryId: string, value: boolean | null): Promise<void> {
    return this.entries.setFunctionWordOverride(tx, entryId, value);
  }

  getTopics(tx: Prisma.TransactionClient, codes: string[]): Promise<Array<{ code: string; archivedAt: Date | null }>> {
    return tx.topic.findMany({ where: { code: { in: codes } }, select: { code: true, archivedAt: true } });
  }

  createSense(tx: Prisma.TransactionClient, input: CreateSenseInput): Promise<{ senseId: string; revisionId: string }> {
    return this.senses.createSense(tx, input, (codes) => this.getTopics(tx, codes));
  }

  saveDraft(tx: Prisma.TransactionClient, input: SaveDraftInput): Promise<SaveDraftResult> {
    return this.senses.saveDraft(tx, input, (codes) => this.getTopics(tx, codes));
  }

  importContent(tx: Prisma.TransactionClient, input: ImportContentInput): Promise<ImportContentResult> {
    return importContent(tx, input, this.senses, (codes) => this.getTopics(tx, codes));
  }

  // Unlike other writes, revert owns one entry-key-locked transaction per entry, so it takes no tx.
  revertRecords(records: RevertRecord[]): Promise<RevertReport> {
    return revertRecords(this.prisma, this.entries, records);
  }

  markRevisions(tx: Prisma.TransactionClient, items: MarkRevisionItem[]): Promise<MarkRevisionResult[]> {
    return this.senses.markRevisions(tx, items);
  }

  publishItem(item: PublishItem, actorId: string): Promise<PublishItemResult> {
    return this.publish.publishItem(item, actorId);
  }

  unpublish(senseIds: string[]): Promise<SenseStateResult[]> {
    return this.publish.unpublish(senseIds);
  }

  retire(senseIds: string[]): Promise<SenseStateResult[]> {
    return this.publish.retire(senseIds);
  }

  quickPublish(input: Omit<SaveDraftInput, 'source'>): Promise<QuickPublishResult> {
    return this.publish.quickPublish(input.senseId, (tx) => this.saveDraft(tx, { ...input, source: 'ui' }));
  }

  latestRevisions(senseIds: string[]): Promise<Map<string, LatestRevision>> {
    return this.queries.latestRevisions(senseIds);
  }

  listExportRows(filter: SenseFilter, limit: number): Promise<{ rows: ExportRow[] } | { tooMany: true }> {
    return this.queries.exportSenses(filter, limit);
  }

  resolveBatchRecordOwners(records: ScopeRecord[]): Promise<{ entryIds: string[]; senseIds: string[] }> {
    return this.queries.resolveBatchRecordOwners(records);
  }
}
