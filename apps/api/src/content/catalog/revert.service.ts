import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { EntriesService } from './entries.service.js';

export type RevertRecordType = 'entry' | 'variant' | 'level' | 'sense' | 'revision';
export type RevertRecord = {
  type: RevertRecordType; id: string; replacedRevisionId?: string;
  replacedRevisionPreviousStatus?: 'draft' | 'reviewed';
};
/** What the calling batch knows about itself, as plain values (Content never reads Pipeline tables). */
export type RevertContext = {
  /** When the batch's job finished; a reviewed inflection set stamped later was set by someone else. */
  batchFinishedAt: Date | null;
  /** Revisions the batch itself recorded; their form_of links do not keep an entry. */
  ownRevisionIds: ReadonlySet<string>;
};
export type RevertReport = {
  removed: Record<RevertRecordType, number>;
  skipped: Array<{ type: string; id: string; reason: string }>;
};
const recordTypes: RevertRecordType[] = ['entry', 'variant', 'level', 'sense', 'revision'];
const emptyReport = (): RevertReport => ({
  removed: { entry: 0, variant: 0, level: 0, sense: 0, revision: 0 }, skipped: [],
});

/** Resolve immutable ownership in bounded reads; mutable guards are re-read under the entry lock. */
async function groupRecords(prisma: PrismaClient, records: RevertRecord[]) {
  const unique = [...new Map(records.map((record) => [`${record.type}:${record.id}`, record])).values()];
  const ownership = new Map<string, string>();
  for (const type of recordTypes) {
    const ids = unique.filter((record) => record.type === type).map((record) => record.id);
    for (let offset = 0; offset < ids.length; offset += 1_000) {
      const where = { id: { in: ids.slice(offset, offset + 1_000) } };
      if (type === 'entry') {
        for (const row of await prisma.entry.findMany({ where, select: { id: true } })) ownership.set(`${type}:${row.id}`, row.id);
      } else if (type === 'variant') {
        for (const row of await prisma.entryVariant.findMany({ where, select: { id: true, entryId: true } })) ownership.set(`${type}:${row.id}`, row.entryId);
      } else if (type === 'level') {
        for (const row of await prisma.entryLevel.findMany({ where, select: { id: true, entryId: true } })) ownership.set(`${type}:${row.id}`, row.entryId);
      } else if (type === 'sense') {
        for (const row of await prisma.sense.findMany({ where, select: { id: true, entryId: true } })) ownership.set(`${type}:${row.id}`, row.entryId);
      } else {
        for (const row of await prisma.senseRevision.findMany({ where, select: { id: true, sense: { select: { entryId: true } } } })) {
          ownership.set(`${type}:${row.id}`, row.sense.entryId);
        }
      }
    }
  }
  const grouped = new Map<string, RevertRecord[]>();
  for (const record of unique) {
    const entryId = ownership.get(`${record.type}:${record.id}`);
    if (entryId === undefined) continue; // Already gone: neither a removal nor a skip.
    const group = grouped.get(entryId) ?? [];
    group.push(record);
    grouped.set(entryId, group);
  }
  const entryIds = [...grouped.keys()].sort();
  const entries: Array<{ id: string; lemma: string; pos: string }> = [];
  for (let offset = 0; offset < entryIds.length; offset += 1_000) {
    entries.push(...await prisma.entry.findMany({ where: { id: { in: entryIds.slice(offset, offset + 1_000) }, scope: 'catalog' },
      select: { id: true, lemma: true, pos: true }, orderBy: { id: 'asc' },
    }));
  }
  return entries.map((entry) => ({ entry, records: grouped.get(entry.id)! }));
}

async function restoreRevision(
  tx: Prisma.TransactionClient, record: RevertRecord, senseId: string, report: RevertReport,
): Promise<void> {
  if (record.replacedRevisionId === undefined) return;
  const id = record.replacedRevisionId;
  const previous = await tx.senseRevision.findUnique({ where: { id }, select: { senseId: true, status: true } });
  const reason = !previous ? 'replaced-revision-missing'
    : previous.senseId !== senseId ? 'replaced-revision-sense-mismatch'
    : previous.status !== 'superseded' ? 'replaced-revision-not-superseded'
    : record.replacedRevisionPreviousStatus === undefined ? 'replaced-revision-status-unknown' : undefined;
  if (reason) {
    report.skipped.push({ type: 'revision', id, reason });
    return;
  }
  // Old batches without the saved status cannot be restored by guessing draft versus reviewed.
  await tx.senseRevision.updateMany({ where: { id, senseId, status: 'superseded' },
    data: { status: record.replacedRevisionPreviousStatus },
  });
}

/** Is any revision outside the batch pointing at this entry with form_of? Paged by id, so the batch size never
 * becomes a query parameter list. */
async function referencedOutsideBatch(tx: Prisma.TransactionClient, entryId: string, own: ReadonlySet<string>): Promise<boolean> {
  let after: string | undefined;
  for (;;) {
    const page = await tx.senseRevision.findMany({
      where: { formOfEntryId: entryId, ...(after === undefined ? {} : { id: { gt: after } }) },
      select: { id: true }, orderBy: { id: 'asc' }, take: 100,
    });
    if (page.some((revision) => !own.has(revision.id))) return true;
    if (page.length < 100) return false;
    after = page[page.length - 1].id;
  }
}

async function revertEntry(
  tx: Prisma.TransactionClient, entryId: string, records: RevertRecord[], context: RevertContext,
): Promise<RevertReport> {
  const report = emptyReport();
  // FE22: row lock first, so a concurrent private word cannot add a form_of link between our check and the delete.
  await tx.$queryRaw`SELECT id FROM entries WHERE id = ${entryId}::uuid FOR UPDATE`;
  const ids = (type: RevertRecordType) => records.filter((record) => record.type === type).map((record) => record.id);
  const revisionRecords = new Map(records.filter((record) => record.type === 'revision').map((record) => [record.id, record]));
  const revisions = revisionRecords.size ? await tx.senseRevision.findMany({
    where: { id: { in: ids('revision') }, sense: { entryId } },
    select: { id: true, senseId: true, status: true, publishedAt: true, revisionNo: true },
    // Undo several revisions of the same sense newest first, regardless of BatchRecord order.
    orderBy: [{ revisionNo: 'desc' }, { id: 'asc' }],
  }) : [];
  for (const revision of revisions) {
    // A later publish supersedes the previous live revision's status, but keeps publishedAt.
    if (revision.status === 'published' || revision.publishedAt !== null) {
      report.skipped.push({ type: 'revision', id: revision.id, reason: 'published' });
      continue;
    }
    const latest = await tx.senseRevision.findFirst({ where: { senseId: revision.senseId },
      orderBy: { revisionNo: 'desc' }, select: { revisionNo: true },
    });
    if (revision.revisionNo !== latest?.revisionNo) {
      report.skipped.push({ type: 'revision', id: revision.id, reason: 'superseded-by-later-edit' });
      continue;
    }
    const removed = await tx.senseRevision.deleteMany({ where: { id: revision.id } });
    report.removed.revision += removed.count; // Text rows cascade from SenseRevision.
    if (removed.count) await restoreRevision(tx, revisionRecords.get(revision.id)!, revision.senseId, report);
  }

  const senses = ids('sense').length ? await tx.sense.findMany({ where: { id: { in: ids('sense') }, entryId },
    select: { id: true, liveRevisionId: true, replacesSenseId: true, _count: { select: { revisions: true, replacements: true } } },
    orderBy: { id: 'asc' },
  }) : [];
  const pending = new Map(senses.filter((sense) => sense.liveRevisionId === null && sense._count.revisions === 0)
    .map((sense) => [sense.id, sense]));
  for (const sense of senses) {
    if (pending.has(sense.id)) continue;
    report.skipped.push({ type: 'sense', id: sense.id, reason: sense.liveRevisionId !== null ? 'published' : 'edited-after-import' });
  }
  // SenseReplacement is Restrict, not Cascade: delete eligible replacement children first.
  // A replacement retained by another batch/edit keeps its target, without unlinking user data.
  while (pending.size) {
    const leaf = [...pending.values()].find((sense) => sense._count.replacements === 0);
    if (!leaf) break;
    const removed = await tx.sense.deleteMany({ where: { id: leaf.id, entryId } });
    report.removed.sense += removed.count;
    pending.delete(leaf.id);
    const target = leaf.replacesSenseId === null ? undefined : pending.get(leaf.replacesSenseId);
    if (target && removed.count) target._count.replacements -= removed.count;
  }
  for (const sense of pending.values()) report.skipped.push({ type: 'sense', id: sense.id, reason: 'edited-after-import' });

  const levelIds = new Set(ids('level'));
  if (levelIds.size) {
    const allLevels = await tx.entryLevel.findMany({ where: { entryId }, select: { id: true, basis: true }, orderBy: { id: 'asc' } });
    const levels = allLevels.filter((level) => levelIds.has(level.id));
    let remaining = allLevels.length; // Across every source, updated after each actual deletion.
    // CR5 protects currently live content; publication history alone does not require a level.
    const published = levels.length ? await tx.sense.findFirst({ where: { entryId, state: 'open', liveRevisionId: { not: null } }, select: { id: true } }) : null;
    for (const level of levels) {
      if (level.basis === 'editorial') { // Staff confirmed this level after the import.
        report.skipped.push({ type: 'level', id: level.id, reason: 'level-confirmed' });
        continue;
      }
      if (published && remaining === 1) {
        report.skipped.push({ type: 'level', id: level.id, reason: 'only-level-of-published-entry' });
        continue;
      }
      const removed = await tx.entryLevel.deleteMany({ where: { id: level.id, entryId } });
      report.removed.level += removed.count;
      remaining -= removed.count;
    }
  }
  if (ids('variant').length) report.removed.variant += (await tx.entryVariant.deleteMany({ where: { id: { in: ids('variant') }, entryId } })).count;
  if (ids('entry').includes(entryId)) {
    // Others rely on this entry when its inflection set was reviewed after the batch finished (by another batch or
    // staff; the batch's own inflections cell stamps it while running), or when a revision outside the batch
    // (another batch, a staff draft, a learner's private word) links to it with form_of.
    const { inflectionsReviewedAt } = await tx.entry.findUnique({ where: { id: entryId }, select: { inflectionsReviewedAt: true } })
      ?? { inflectionsReviewedAt: null };
    const reviewedLater = inflectionsReviewedAt != null && context.batchFinishedAt !== null
      && inflectionsReviewedAt > context.batchFinishedAt;
    if (reviewedLater || await referencedOutsideBatch(tx, entryId, context.ownRevisionIds)) {
      report.skipped.push({ type: 'entry', id: entryId, reason: 'entry-in-use' });
      return report;
    }
    // Kept entries with remaining content are ordinary non-events, not additional skips.
    report.removed.entry += (await tx.entry.deleteMany({ where: {
      id: entryId, senses: { none: {} }, levels: { none: {} }, variants: { none: {} },
    } })).count;
  }
  return report;
}

/** Plain function: one committed transaction per entry, with no whole-batch transaction or job lease. */
export async function revertRecords(
  prisma: PrismaClient, entries: EntriesService, records: RevertRecord[], context: RevertContext,
): Promise<RevertReport> {
  const report = emptyReport();
  for (const group of await groupRecords(prisma, records)) {
    const result = await prisma.$transaction(async (tx) => {
      await entries.lockEntryKey(tx, group.entry.lemma, group.entry.pos);
      return revertEntry(tx, group.entry.id, group.records, context);
    }, { timeout: 30_000, maxWait: 5_000 });
    for (const type of recordTypes) report.removed[type] += result.removed[type];
    report.skipped.push(...result.skipped);
  }
  return report;
}
