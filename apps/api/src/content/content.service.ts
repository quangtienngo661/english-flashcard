import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { EntriesService, type EnsureEntryInput, type EnsureEntryResult, type VariantInput } from './catalog/entries.service.js';
import { LevelsService, type EntryLevelView, type ImportedLevelInput } from './catalog/levels.service.js';
import type { Level } from './content.constants.js';
import { SourcesService, isSourceComplete, type SourceView } from './sources/sources.service.js';

@Injectable()
export class ContentService {
  constructor(
    @Inject(SourcesService) private readonly sources: SourcesService,
    @Inject(EntriesService) private readonly entries: EntriesService,
    @Inject(LevelsService) private readonly levels: LevelsService,
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
}
