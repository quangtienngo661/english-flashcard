import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../common/db/prisma.module.js';
import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { AdminCatalogQueries, type EntryExportRow, type ExportRow, type LatestRevision, type ScopeRecord } from './catalog/admin-catalog.queries.js';
import type { SenseFilter } from './catalog/sense-filters.js';
import { EntriesService, type EnsureEntryInput, type EnsureEntryResult, type VariantInput } from './catalog/entries.service.js';
import { EntryDeleteService } from './catalog/entry-delete.service.js';
import { EntryUsageRegistry, type EntryUsageProbe } from './catalog/entry-usage.js';
import { LevelsService, type EntryLevelView, type ImportedLevelInput } from './catalog/levels.service.js';
import { revertRecords, type RevertContext, type RevertRecord, type RevertReport } from './catalog/revert.service.js';
import type { Level } from './content.constants.js';
import {
  PrivateWordsService, type CreatePrivateSenseInput, type CreatePrivateSenseResult, type PrivateWordPatch,
} from './private/private-words.service.js';
import { SentencesService, type Sentence } from './sentences/sentences.service.js';
import { WordFormsService, type WordFormAdded } from './word-forms/word-forms.service.js';
import { WordsService, type WordSense } from './words/words.service.js';
import {
  practiceCandidates, practiceLemmaMeanings, practiceOtherSenses, practiceRandomMeanings, practiceSenses, type CandidateSense,
  type LemmaMeanings, type PracticeSense,
} from './practice/practice-senses.js';
import { InflectionsService, type EntryByForm, type InflectionInput, type InflectionSource } from './inflections/inflections.service.js';
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
    @Inject(InflectionsService) private readonly inflections: InflectionsService,
    @Inject(PrivateWordsService) private readonly privateWords: PrivateWordsService,
    @Inject(SentencesService) private readonly sentences: SentencesService,
    @Inject(WordsService) private readonly words: WordsService,
    @Inject(WordFormsService) private readonly wordForms: WordFormsService,
    @Inject(EntryDeleteService) private readonly entryDeletion: EntryDeleteService,
    @Inject(EntryUsageRegistry) private readonly entryUsage: EntryUsageRegistry,
  ) {}

  /** Deletes a catalog entry that was never published and that nothing else refers to; 409 `entry-in-use` with `reasons` otherwise. */
  deleteEntry(entryId: string): Promise<void> {
    return this.entryDeletion.deleteEntry(entryId);
  }

  /** Learning, Practice and Pipeline register the part of the delete check that reads their own tables, when they start. */
  registerEntryUsageProbe(probe: EntryUsageProbe): void {
    this.entryUsage.register(probe);
  }

  /** Bước 7 design §10: a form staff accept for a lemma (Practice's unknown-forms flow). */
  addWordForm(actorId: string, lemma: string, form: string): Promise<WordFormAdded> {
    return this.wordForms.add(actorId, lemma, form);
  }

  removeWordForm(id: string): Promise<boolean> {
    return this.wordForms.remove(id);
  }

  /** `lemmaKey + ' ' + formKey` of the pairs staff accepted, so Practice can hide them from its unknown-forms list. */
  knownWordForms(pairs: Array<{ lemmaKey: string; formKey: string }>): Promise<Set<string>> {
    return this.wordForms.known(pairs);
  }

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

  addDerivedLevel(tx: Prisma.TransactionClient, entryId: string, baseEntryId: string): Promise<{ id: string } | null> {
    return this.levels.addDerivedLevel(tx, entryId, baseEntryId);
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
  revertRecords(records: RevertRecord[], context: RevertContext): Promise<RevertReport> {
    return revertRecords(this.prisma, this.entries, records, context);
  }

  markRevisions(tx: Prisma.TransactionClient, items: MarkRevisionItem[], actorId: string): Promise<MarkRevisionResult[]> {
    return this.senses.markRevisions(tx, items, actorId);
  }

  publishItem(item: PublishItem, actorId: string, opts?: { skipUnpublished?: boolean }): Promise<PublishItemResult> {
    return this.publish.publishItem(item, actorId, opts);
  }

  unpublish(senseIds: string[], actorId: string): Promise<SenseStateResult[]> {
    return this.publish.unpublish(senseIds, actorId);
  }

  retire(senseIds: string[], actorId: string): Promise<SenseStateResult[]> {
    return this.publish.retire(senseIds, actorId);
  }

  quickPublish(input: Omit<SaveDraftInput, 'source'>): Promise<QuickPublishResult> {
    return this.publish.quickPublish(input.senseId, input.actorId, (tx) => this.saveDraft(tx, { ...input, source: 'ui' }));
  }

  latestRevisions(senseIds: string[]): Promise<Map<string, LatestRevision>> {
    return this.queries.latestRevisions(senseIds);
  }

  snapshotPublishable(filter: { senseIds?: string[]; level?: Level; topic?: string; pos?: string }):
    Promise<{ items: Array<{ senseId: string; revisionNo: number }>; notReady: number }> {
    return this.queries.snapshotPublishable(filter);
  }

  listExportRows(filter: SenseFilter, limit: number): Promise<{ rows: ExportRow[] } | { tooMany: true }> {
    return this.queries.exportSenses(filter, limit);
  }

  listEntriesWithoutSense(filter: { level?: Level }, limit: number): Promise<{ rows: EntryExportRow[] } | { tooMany: true }> {
    return this.queries.exportEntriesWithoutSense(filter, limit);
  }

  resolveBatchRecordOwners(records: ScopeRecord[], db?: Prisma.TransactionClient | PrismaClient):
    Promise<{ entryIds: string[]; senseIds: string[] }> {
    return this.queries.resolveBatchRecordOwners(records, db);
  }

  replaceInflections(tx: Prisma.TransactionClient, entryId: string, source: InflectionSource, forms: InflectionInput[]): Promise<void> {
    return this.inflections.replaceInflections(tx, entryId, source, forms);
  }

  entriesByForm(formKey: string, viewerId: string): Promise<EntryByForm[]> {
    return this.inflections.entriesByForm(formKey, viewerId);
  }

  createPrivateSense(tx: Prisma.TransactionClient, input: CreatePrivateSenseInput): Promise<CreatePrivateSenseResult> {
    return this.privateWords.createPrivateSense(tx, input);
  }

  updatePrivateWord(tx: Prisma.TransactionClient, ownerId: string, entryId: string, patch: PrivateWordPatch): Promise<void> {
    return this.privateWords.updatePrivateWord(tx, ownerId, entryId, patch);
  }

  deletePrivateEntryContent(tx: Prisma.TransactionClient, ownerId: string, entryId: string): Promise<{ senseIds: string[] }> {
    return this.privateWords.deletePrivateEntryContent(tx, ownerId, entryId);
  }

  privateSenseIdsOf(tx: Prisma.TransactionClient, userId: string): Promise<string[]> {
    return this.privateWords.privateSenseIdsOf(tx, userId);
  }

  addSentence(tx: Prisma.TransactionClient, input: { userId: string; senseId: string; text: string }): Promise<Sentence> {
    return this.sentences.addSentence(tx, input);
  }

  /** A caller inside an open transaction passes its `tx` as `db` (Bước 7 plan choice 5). */
  listSentences(userId: string, senseIds: string[], db?: Prisma.TransactionClient | PrismaClient): Promise<Map<string, Sentence[]>> {
    return this.sentences.listSentences(userId, senseIds, db);
  }

  deleteSentence(userId: string, id: string): Promise<boolean> {
    return this.sentences.deleteSentence(userId, id);
  }

  /** Learner cards: visible senses only (catalog published or the viewer's own), in the viewer's language. */
  cardContent(viewerId: string, senseIds: string[], nativeLanguage: 'vi' | 'en'): Promise<Map<string, WordSense>> {
    return this.words.cardContent(viewerId, senseIds, nativeLanguage);
  }

  /**
   * Practice questions: visible senses only, with examples, spellings, accepted answers and inflections. A caller inside an
   * open transaction passes its `tx` as `db`, so the read needs no second connection.
   */
  practiceSenses(viewerId: string, senseIds: string[], nativeLanguage: 'vi' | 'en', db?: Prisma.TransactionClient | PrismaClient):
    Promise<Map<string, PracticeSense>> {
    return practiceSenses(db ?? this.prisma, viewerId, senseIds, nativeLanguage);
  }

  /** Distractor and true/false candidates: visible senses only, light enough for thousands of ids. */
  practiceCandidates(viewerId: string, senseIds: string[], nativeLanguage: 'vi' | 'en', db?: Prisma.TransactionClient | PrismaClient):
    Promise<Map<string, CandidateSense>> {
    return practiceCandidates(db ?? this.prisma, viewerId, senseIds, nativeLanguage);
  }

  /** Every visible meaning of these lemmas (case-insensitive), so a distractor is never also right (T6/FE25). */
  practiceLemmaMeanings(viewerId: string, lemmas: string[], _nativeLanguage: 'vi' | 'en', db?: Prisma.TransactionClient | PrismaClient):
    Promise<LemmaMeanings> {
    return practiceLemmaMeanings(db ?? this.prisma, viewerId, lemmas);
  }

  /** Wrong meanings of a `meaning_in_sentence` question, step 1 (Bước 7 design §7.4): other visible senses of the same entry. */
  practiceOtherSenses(viewerId: string, senseId: string, nativeLanguage: 'vi' | 'en', db?: Prisma.TransactionClient | PrismaClient):
    Promise<CandidateSense[]> {
    return practiceOtherSenses(db ?? this.prisma, viewerId, senseId, nativeLanguage);
  }

  /** Wrong meanings, step 3 (Bước 7 design §7.4): random catalog senses with a Vietnamese gloss, none of `excludeLemmas`. */
  practiceRandomMeanings(viewerId: string, excludeLemmas: string[], count: number, nativeLanguage: 'vi' | 'en',
    db?: Prisma.TransactionClient | PrismaClient): Promise<CandidateSense[]> {
    return practiceRandomMeanings(db ?? this.prisma, viewerId, excludeLemmas, count, nativeLanguage);
  }

  /** A caller inside an open transaction passes its `tx` as `db` (Bước 7 plan choice 5). */
  visibleSenseIds(viewerId: string, senseIds: string[], db?: Prisma.TransactionClient | PrismaClient): Promise<Set<string>> {
    return this.privateWords.visibleSenseIds(viewerId, senseIds, db);
  }

  bulkCandidates(filter: { level?: Level; topic?: string; pos?: string }, limit: number):
    Promise<{ senseIds: string[]; skippedFunctionWords: number }> {
    return this.privateWords.bulkCandidates(filter, limit);
  }
}
