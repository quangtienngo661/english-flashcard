import { Inject, Injectable, Optional } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { BATCH_SCOPE, type BatchScope } from '../batch-scope.port.js';
import { LEVELS, VALID_POS, type Level } from '../content.constants.js';
import { publishViolations } from '../senses/publish.service.js';
import type { RevisionContent } from '../senses/revision-content.js';
import type { SenseFilter } from './sense-filters.js';

type PageQuery = { page_size: number; page_token?: string };
export type EntryListQuery = PageQuery & { conflict?: boolean; has_sense?: boolean; level?: Level; q?: string; batch_id?: string };
export type SenseListQuery = PageQuery & SenseFilter;
export type LatestRevision = { revisionNo: number; status: string; content: RevisionContent };
export type ExportRow = {
  headword: string; pos: string; gloss_vi: string | null; definition_en: string | null;
  example_en_1: string; example_en_2: string; example_en_3: string;
  topics: string; accepted_forms: string; context_label: string | null;
  sense_id: string; revision: number; _status: string; _level: Level | null; _missing?: string;
};
export type EntryExportRow = { headword: string; pos: string; _level: Level | null };
export type ScopeRecord = { type: 'entry' | 'variant' | 'level' | 'sense' | 'revision'; id: string };
type Page<T> = { items: T[]; next_page_token: string | null };
const cursorSchema = z.strictObject({
  lemma: z.string().refine((value) => !value.includes('\0') && [...value].length >= 1 && [...value].length <= 100),
  pos: z.enum(VALID_POS), id: z.uuid(),
});
type Cursor = z.infer<typeof cursorSchema>;

// Bước 2 contains only catalog words. Keep staff read scope centralized for future private entries.
const catalogWhere = { language: 'en', entryType: 'word' } satisfies Prisma.EntryWhereInput;
const levelInclude = { source: true } satisfies Prisma.EntryLevelInclude;
const levelsQuery = { include: levelInclude, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] } satisfies Prisma.Entry$levelsArgs;
const revisionsQuery = {
  orderBy: { revisionNo: 'desc' }, take: 1, include: { texts: true },
} satisfies Prisma.Sense$revisionsArgs;
const entryInclude = {
  variants: { orderBy: [{ text: 'asc' }, { id: 'asc' }] }, levels: levelsQuery,
  senses: { orderBy: { id: 'asc' }, include: { revisions: revisionsQuery } },
} satisfies Prisma.EntryInclude;
const senseInclude = {
  entry: { include: { levels: levelsQuery, variants: entryInclude.variants } }, revisions: revisionsQuery,
} satisfies Prisma.SenseInclude;
type EntryRow = Prisma.EntryGetPayload<{ include: typeof entryInclude }>;
type SenseRow = Prisma.SenseGetPayload<{ include: typeof senseInclude }>;
type RevisionRow = Prisma.SenseRevisionGetPayload<{ include: { texts: true } }>;
type LevelRow = Prisma.EntryLevelGetPayload<{ include: typeof levelInclude }>;

function invalidToken(): ProblemDetailsException {
  return new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
}
function binding(route: string, filters: object): string {
  return createHash('sha256').update(JSON.stringify({ route, filters })).digest('hex');
}
function readCursor(token: string | undefined, queryBinding: string): Cursor | undefined {
  if (token === undefined) return undefined;
  const cursor = cursorSchema.safeParse(decodeBoundToken(token, queryBinding));
  if (!cursor.success) throw invalidToken();
  return cursor.data;
}
function afterEntry(cursor: Cursor | undefined): Prisma.EntryWhereInput {
  return cursor ? { OR: [
    { lemma: { gt: cursor.lemma } },
    { lemma: cursor.lemma, pos: { gt: cursor.pos } },
    { lemma: cursor.lemma, pos: cursor.pos, id: { gt: cursor.id } },
  ] } : {};
}
function afterSense(cursor: Cursor | undefined): Prisma.SenseWhereInput {
  return cursor ? { OR: [
    { entry: { lemma: { gt: cursor.lemma } } },
    { entry: { lemma: cursor.lemma, pos: { gt: cursor.pos } } },
    { entry: { lemma: cursor.lemma, pos: cursor.pos }, id: { gt: cursor.id } },
  ] } : {};
}
function levelState(levels: LevelRow[]): { displayed_level: Level | null; conflict: boolean } {
  // levelsQuery orders newest editorial records first; source ties have a deterministic UUID tie-break.
  const editorial = levels.find(({ basis }) => basis === 'editorial');
  const imported = editorial ? undefined : [...levels].sort((left, right) =>
    left.source.displayPriority - right.source.displayPriority
    || (left.sourceId < right.sourceId ? -1 : left.sourceId > right.sourceId ? 1 : 0)
    || LEVELS.indexOf(left.level as Level) - LEVELS.indexOf(right.level as Level))[0];
  return {
    displayed_level: (editorial?.level ?? imported?.level ?? null) as Level | null,
    conflict: !editorial && new Set(levels.map(({ level }) => level)).size > 1,
  };
}
function readContent(revision: RevisionRow): RevisionContent {
  return {
    glossVi: revision.texts.find(({ language, kind }) => language === 'vi' && kind === 'gloss')?.text ?? null,
    definitionEn: revision.texts.find(({ language, kind }) => language === 'en' && kind === 'definition')?.text ?? null,
    examplesEn: revision.examples, topicCodes: revision.topicCodes, acceptedForms: revision.acceptedForms,
  };
}
function senseSummary(sense: EntryRow['senses'][number] | SenseRow) {
  return {
    sense_id: sense.id, context_label: sense.contextLabel, state: sense.state,
    live_revision_id: sense.liveRevisionId, replaces_sense_id: sense.replacesSenseId,
    revision: sense.revisions[0]?.revisionNo ?? null, status: sense.revisions[0]?.status ?? null,
  };
}
function entryView(entry: EntryRow) {
  return {
    id: entry.id, language: entry.language, lemma: entry.lemma, pos: entry.pos, entry_type: entry.entryType,
    function_word: entry.functionWordOverride ?? entry.functionWordDerived,
    function_word_derived: entry.functionWordDerived, function_word_override: entry.functionWordOverride,
    variants: entry.variants.map(({ id, text, kind, acceptedAsAnswer }) => ({ id, text, kind, accepted_as_answer: acceptedAsAnswer })),
    levels: entry.levels.map((row) => ({
      id: row.id, level: row.level, source_id: row.sourceId, basis: row.basis,
      source_extra: row.sourceExtra, created_at: row.createdAt.toISOString(),
      source: { id: row.source.id, kind: row.source.kind, name: row.source.name, version: row.source.version,
        url: row.source.url, license: row.source.license, attribution: row.source.attribution, display_priority: row.source.displayPriority },
    })),
    ...levelState(entry.levels), senses: entry.senses.map(senseSummary),
  };
}
function senseView(sense: SenseRow) {
  const revision = sense.revisions[0];
  const content = revision ? readContent(revision) : null;
  return {
    ...senseSummary(sense), entry_id: sense.entryId, lemma: sense.entry.lemma, pos: sense.entry.pos,
    ...levelState(sense.entry.levels), function_word: sense.entry.functionWordOverride ?? sense.entry.functionWordDerived,
    content: content ? { gloss_vi: content.glossVi, definition_en: content.definitionEn,
      examples_en: content.examplesEn, topics: content.topicCodes, accepted_forms: content.acceptedForms } : null,
  };
}

function selectedSense(row: SenseRow, query: Pick<SenseFilter, 'level' | 'topic' | 'status'>) {
  const revision = row.revisions[0];
  const view = senseView(row);
  if (query.level !== undefined && view.displayed_level !== query.level) return null;
  if (query.topic !== undefined && !revision?.topicCodes.includes(query.topic)) return null;
  if (query.status === 'open_draft' || query.status === 'unpublishable') {
    if (!revision || !['draft', 'reviewed'].includes(revision.status)) return null;
    if (query.status === 'unpublishable') {
      const missing = publishViolations(revision, row.entry.levels.length > 0);
      return missing.length ? { ...view, missing } : null;
    }
  }
  return { ...view, missing: [] };
}

/** Scan keyset chunks so computed filters are applied before the limit and lookahead. */
async function page<Row, View>(
  query: PageQuery, queryBinding: string,
  fetch: (after: Cursor | undefined, take: number) => Promise<Row[]>,
  cursorOf: (row: Row) => Cursor, viewOf: (row: Row) => View | null,
): Promise<Page<View>> {
  let after = readCursor(query.page_token, queryBinding);
  const selected: Array<{ view: View; cursor: Cursor }> = [];
  const chunkSize = Math.max(100, query.page_size + 1);
  while (selected.length <= query.page_size) {
    const rows = await fetch(after, chunkSize);
    for (const row of rows) {
      const view = viewOf(row);
      if (view !== null) selected.push({ view, cursor: cursorOf(row) });
      if (selected.length > query.page_size) break;
    }
    if (selected.length > query.page_size || rows.length < chunkSize) break;
    after = cursorOf(rows[rows.length - 1]);
  }
  return {
    items: selected.slice(0, query.page_size).map(({ view }) => view),
    next_page_token: selected.length > query.page_size
      ? encodeBoundToken(selected[query.page_size - 1].cursor, queryBinding) : null,
  };
}

@Injectable()
export class AdminCatalogQueries {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Optional() @Inject(BATCH_SCOPE) private readonly batchScope?: BatchScope,
  ) {}

  private async batchIds(kind: 'entries' | 'senses', batchId: string | undefined): Promise<string[] | undefined> {
    if (batchId === undefined) return undefined;
    if (!this.batchScope) throw new ProblemDetailsException({
      status: 400, title: 'Batch filter unavailable', type: 'batch-filter-unavailable',
    });
    return kind === 'entries' ? this.batchScope.entryIdsOf(batchId) : this.batchScope.senseIdsOf(batchId);
  }

  async listEntries(query: EntryListQuery) {
    const ids = await this.batchIds('entries', query.batch_id);
    const queryBinding = binding('entries', {
      conflict: query.conflict ?? null, has_sense: query.has_sense ?? null, level: query.level ?? null,
      q: query.q ?? null, batch_id: query.batch_id ?? null,
    });
    // Prisma's contains uses LIKE: escape its three special characters for literal staff searches.
    const q = query.q?.replace(/[\\%_]/g, '\\$&');
    const where: Prisma.EntryWhereInput = {
      ...catalogWhere,
      ...(ids !== undefined ? { id: { in: ids } } : {}),
      ...(query.has_sense !== undefined ? { senses: query.has_sense ? { some: {} } : { none: {} } } : {}),
      ...(query.level !== undefined ? { levels: { some: { level: query.level } } } : {}),
      ...(q !== undefined ? { OR: [{ lemma: { contains: q, mode: 'insensitive' } },
        { variants: { some: { text: { contains: q, mode: 'insensitive' } } } }] } : {}),
    };
    return page(query, queryBinding, (after, take) => this.prisma.entry.findMany({
      where: { AND: [where, afterEntry(after)] }, include: entryInclude,
      orderBy: [{ lemma: 'asc' }, { pos: 'asc' }, { id: 'asc' }], take,
    }), (row) => ({ lemma: row.lemma, pos: row.pos as Cursor['pos'], id: row.id }), (row) => {
      const view = entryView(row);
      if (query.conflict !== undefined && view.conflict !== query.conflict) return null;
      if (query.level !== undefined && view.displayed_level !== query.level) return null;
      return view;
    });
  }

  async listSenses(query: SenseListQuery) {
    const { where } = await this.senseSelection(query);
    const queryBinding = binding('senses', {
      sense_id: query.sense_id ?? null, status: query.status ?? null, level: query.level ?? null,
      pos: query.pos ?? null, topic: query.topic ?? null, batch_id: query.batch_id ?? null,
    });
    return page(query, queryBinding, (after, take) => this.prisma.sense.findMany({
      where: { AND: [where, afterSense(after)] }, include: senseInclude,
      orderBy: [{ entry: { lemma: 'asc' } }, { entry: { pos: 'asc' } }, { id: 'asc' }], take,
    }), (row) => ({ lemma: row.entry.lemma, pos: row.entry.pos as Cursor['pos'], id: row.id }), (row) => {
      const selected = selectedSense(row, query);
      if (!selected) return null;
      // Preserve the existing list interface: missing is present only for unpublishable.
      const { missing, ...view } = selected;
      return query.status === 'unpublishable' ? { ...view, missing } : view;
    });
  }

  private async senseSelection(query: Omit<SenseFilter, 'pos'> & { pos?: string }) {
    const ids = await this.batchIds('senses', query.batch_id);
    const where: Prisma.SenseWhereInput = {
      entry: { ...catalogWhere, ...(query.pos !== undefined ? { pos: query.pos } : {}),
        ...(query.level !== undefined ? { levels: { some: { level: query.level } } } : {}),
      },
      AND: [
        ...(ids !== undefined ? [{ id: { in: ids } }] : []),
        ...(query.sense_id !== undefined ? [{ id: { in: query.sense_id } }] : []),
        ...(query.topic !== undefined ? [{ revisions: { some: { topicCodes: { has: query.topic } } } }] : []),
      ],
      ...(query.status === 'published' ? { state: 'open', liveRevisionId: { not: null } } : {}),
      ...(['open_draft', 'unpublishable'].includes(query.status ?? '') ? {
        state: { not: 'retired' }, revisions: { some: { status: { in: ['draft', 'reviewed'] } } },
      } : {}),
    };
    return { where };
  }

  /** The inverse of unpublishable over the same latest open-revision/filter selection.
   * This unpaged snapshot has no synchronous-publish or export row limit.
   */
  async snapshotPublishable(filter: { senseIds?: string[]; level?: Level; topic?: string; pos?: string }):
    Promise<{ items: Array<{ senseId: string; revisionNo: number }>; notReady: number }> {
    const query = { sense_id: filter.senseIds, level: filter.level, topic: filter.topic, pos: filter.pos,
      status: 'unpublishable' as const };
    // Keep latest revisions and levels in one database snapshot even when
    // staff edit the catalog concurrently. Subsequent changes become per-item refusals.
    return this.prisma.$transaction(async (tx) => {
      const { where } = await this.senseSelection(query);
      const candidates = await tx.sense.findMany({ where, include: senseInclude, orderBy: { id: 'asc' } });
      const items: Array<{ senseId: string; revisionNo: number }> = [];
      let notReady = 0;
      for (const sense of candidates) {
        // open_draft applies latest revision, displayed level and latest topic checks without
        // excluding ready senses. Readiness itself uses the exact unpublishable violation helper.
        if (!selectedSense(sense, { ...query, status: 'open_draft' })) continue;
        const revision = sense.revisions[0];
        const violations = publishViolations(revision, sense.entry.levels.length > 0);
        if (violations.length) notReady++;
        else items.push({ senseId: sense.id, revisionNo: revision.revisionNo });
      }
      return { items, notReady };
    }, { isolationLevel: 'RepeatableRead', timeout: 30_000, maxWait: 5_000 });
  }

  /** Catalog entries with no non-retired sense, counted against limit before any CSV bytes (D34). */
  async exportEntriesWithoutSense(filter: { level?: Level }, limit: number):
    Promise<{ rows: EntryExportRow[] } | { tooMany: true }> {
    const where: Prisma.EntryWhereInput = {
      ...catalogWhere, senses: { none: { state: { not: 'retired' } } },
      ...(filter.level !== undefined ? { levels: { some: { level: filter.level } } } : {}),
    };
    const rows: EntryExportRow[] = [];
    let after: Cursor | undefined;
    while (true) {
      const chunk = await this.prisma.entry.findMany({
        where: { AND: [where, afterEntry(after)] }, include: { levels: levelsQuery, variants: entryInclude.variants },
        orderBy: [{ lemma: 'asc' }, { pos: 'asc' }, { id: 'asc' }], take: 500,
      });
      for (const entry of chunk) {
        const level = levelState(entry.levels).displayed_level;
        if (filter.level !== undefined && level !== filter.level) continue;
        if (rows.length === limit) return { tooMany: true };
        rows.push({ headword: [entry.lemma, ...entry.variants.map(({ text }) => text)].join('/'), pos: entry.pos, _level: level });
      }
      if (chunk.length < 500) return { rows };
      const last = chunk[chunk.length - 1];
      after = { lemma: last.lemma, pos: last.pos as Cursor['pos'], id: last.id };
    }
  }

  /** Count the actual filtered rows, including computed level/readiness, before any CSV bytes.
   * Only limit rows are retained, with keyset reads of 500 and an early limit+1 exit.
   */
  async exportSenses(filter: SenseFilter, limit: number): Promise<{ rows: ExportRow[] } | { tooMany: true }> {
    const { where } = await this.senseSelection(filter);
    const rows: ExportRow[] = [];
    let after: Cursor | undefined;
    while (true) {
      const chunk = await this.prisma.sense.findMany({
        where: { AND: [where, afterSense(after)] }, include: senseInclude,
        orderBy: [{ entry: { lemma: 'asc' } }, { entry: { pos: 'asc' } }, { id: 'asc' }], take: 500,
      });
      for (const sense of chunk) {
        const selected = selectedSense(sense, filter);
        const revision = sense.revisions[0];
        if (!selected || !revision) continue;
        if (rows.length === limit) return { tooMany: true };
        const content = readContent(revision);
        rows.push({
          headword: [sense.entry.lemma, ...sense.entry.variants.map(({ text }) => text)].join('/'),
          pos: sense.entry.pos, gloss_vi: content.glossVi, definition_en: content.definitionEn,
          example_en_1: content.examplesEn[0] ?? '', example_en_2: content.examplesEn[1] ?? '', example_en_3: content.examplesEn[2] ?? '',
          topics: content.topicCodes.join(';'), accepted_forms: content.acceptedForms.join(';'),
          context_label: sense.contextLabel, sense_id: sense.id, revision: revision.revisionNo,
          _status: revision.status, _level: selected.displayed_level,
          ...(filter.status === 'unpublishable' ? { _missing: selected.missing.join(';') } : {}),
        });
      }
      if (chunk.length < 500) return { rows };
      const last = chunk[chunk.length - 1];
      after = { lemma: last.entry.lemma, pos: last.entry.pos as Cursor['pos'], id: last.id };
    }
  }

  /** Pipeline passes record ids through the public facade; content-table FKs stay here.
   * Mirror revert's bounded ownership resolution, skipping records already removed by revert.
   */
  async resolveBatchRecordOwners(records: ScopeRecord[]): Promise<{ entryIds: string[]; senseIds: string[] }> {
    const entryIds = new Set<string>();
    const senseIds = new Set<string>();
    for (const type of ['entry', 'variant', 'level', 'sense', 'revision'] as const) {
      const ids = [...new Set(records.filter((record) => record.type === type).map((record) => record.id))];
      for (let offset = 0; offset < ids.length; offset += 1_000) {
        const where = { id: { in: ids.slice(offset, offset + 1_000) } };
        if (type === 'entry') {
          for (const row of await this.prisma.entry.findMany({ where, select: { id: true } })) entryIds.add(row.id);
        } else if (type === 'variant') {
          for (const row of await this.prisma.entryVariant.findMany({ where, select: { entryId: true } })) entryIds.add(row.entryId);
        } else if (type === 'level') {
          for (const row of await this.prisma.entryLevel.findMany({ where, select: { entryId: true } })) entryIds.add(row.entryId);
        } else if (type === 'sense') {
          for (const row of await this.prisma.sense.findMany({ where, select: { id: true } })) senseIds.add(row.id);
        } else {
          for (const row of await this.prisma.senseRevision.findMany({ where, select: { senseId: true } })) senseIds.add(row.senseId);
        }
      }
    }
    return { entryIds: [...entryIds].sort(), senseIds: [...senseIds].sort() };
  }

  async getSense(id: string) {
    const row = await this.prisma.sense.findFirst({ where: { id, entry: catalogWhere }, include: senseInclude });
    if (!row) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    return senseView(row);
  }

  async latestRevisions(senseIds: string[]): Promise<Map<string, LatestRevision>> {
    if (senseIds.length === 0) return new Map();
    const rows = await this.prisma.sense.findMany({
      where: { id: { in: senseIds }, entry: catalogWhere }, select: { id: true, revisions: revisionsQuery },
    });
    const latest = new Map<string, LatestRevision>();
    for (const row of rows) {
      const revision = row.revisions[0];
      if (revision) latest.set(row.id, { revisionNo: revision.revisionNo, status: revision.status, content: readContent(revision) });
    }
    return latest;
  }
}
