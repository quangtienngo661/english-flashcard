import type { Prisma } from '../../generated/prisma/client.js';
import { normalizeText } from '../catalog/normalize.js';
import { ContentRuleError, contentHash, mergeContent, normalizeContent, revisionFormOf, type RevisionContent } from './revision-content.js';
import { emptyContent, latestUsableRevision, type SensesService, type TopicLookup } from './senses.service.js';

export type ImportContentResult =
  | { kind: 'created_sense'; senseId: string; revisionId: string }
  | { kind: 'new_revision'; senseId: string; revisionId: string; supersededRevisionId: string | null;
    droppedReviewedMark: boolean; droppedTopics: string[] }
  | { kind: 'unchanged'; senseId: string | null }
  | { kind: 'rejected'; codes: Array<'revision-required' | 'stale-revision' | 'sense-not-found' | 'sense-retired'
    | 'sense-entry-mismatch' | 'open-draft-conflict' | 'gloss-changed' | 'unknown-topic' | 'topic-archived' | 'too-many-examples'> };

export type ImportContentInput = {
  entryId: string; lemma: string; content: Partial<RevisionContent>; senseId: string | null;
  revision: number | null; contextLabel: string | null; replaceMeaning: boolean; actorId: string;
};
type RejectionCode = Extract<ImportContentResult, { kind: 'rejected' }>['codes'][number];
const revisionInclude = { texts: true } satisfies Prisma.SenseRevisionInclude;
const senseInclude = {
  revisions: { orderBy: { revisionNo: 'desc' }, take: 1, include: revisionInclude },
} satisfies Prisma.SenseInclude;
type RevisionRow = Prisma.SenseRevisionGetPayload<{ include: typeof revisionInclude }>;

// saveDraft's reader is private. Keep the same text/language mapping for the read-only import guards;
// all writes, topic validation and inherited-topic dropping stay in SensesService.
function readContent(revision: RevisionRow): RevisionContent {
  return {
    glossVi: revision.texts.find(({ language, kind }) => language === 'vi' && kind === 'gloss')?.text ?? null,
    definitionEn: revision.texts.find(({ language, kind }) => language === 'en' && kind === 'definition')?.text ?? null,
    examplesEn: revision.examples, topicCodes: revision.topicCodes, acceptedForms: revision.acceptedForms,
    ...revisionFormOf(revision),
  };
}

function hasContent(content: RevisionContent): boolean {
  return Boolean(content.glossVi?.trim() || content.definitionEn?.trim()
    || content.examplesEn.some((value) => value.trim()) || content.topicCodes.some((value) => value.trim())
    || content.acceptedForms.some((value) => value.trim()));
}

const rejected = (code: RejectionCode): ImportContentResult => ({ kind: 'rejected', codes: [code] });

/** The caller already holds the entry-key lock in this transaction. No nested transaction or lock. */
export async function importContent(
  tx: Prisma.TransactionClient, input: ImportContentInput, senses: SensesService, topics: TopicLookup,
): Promise<ImportContentResult> {
  try {
    const contextLabel = input.contextLabel === null ? null : normalizeText(input.contextLabel) || null;
    let sense = input.senseId !== null
      ? await tx.sense.findFirst({ where: { id: input.senseId, entry: { scope: 'catalog' } }, include: senseInclude })
      : await tx.sense.findFirst({ where: {
        entryId: input.entryId, contextLabel, state: { not: 'retired' },
        OR: [{ replacesSenseId: null }, { liveRevisionId: { not: null } }],
      }, include: senseInclude });
    let replacesSenseId: string | undefined;

    if (input.senseId !== null) {
      if (!sense) return rejected('sense-not-found');
      if (sense.state === 'retired') return rejected('sense-retired');
      if (sense.entryId !== input.entryId) return rejected('sense-entry-mismatch');
      if (input.revision === null) return rejected('revision-required');
      if (input.revision !== sense.revisions[0]?.revisionNo) return rejected('stale-revision');
    } else if (input.replaceMeaning && sense) {
      replacesSenseId = sense.id;
      // Reuse createSense's waiting-replacement definition and exclude retired replacements.
      sense = await tx.sense.findFirst({ where: {
        replacesSenseId: sense.id, liveRevisionId: null, state: { not: 'retired' },
      }, include: senseInclude });
    }

    if (!sense) {
      // A form_of "-" alone clears a link; with no sense there is no link to clear, so nothing is created (M4).
      if (Object.entries(input.content).every(([key, value]) => key === 'formOf' && value === null)) {
        return { kind: 'unchanged', senseId: null };
      }
      return { kind: 'created_sense', ...await senses.createSense(tx, {
        entryId: input.entryId, contextLabel, content: input.content, replacesSenseId,
        source: 'csv', actorId: input.actorId,
      }, topics) };
    }

    const latest = sense.revisions[0];
    if (!latest) return rejected('stale-revision');
    // A rejected latest revision never seeds the merge: build on the last usable one (or empty content).
    const latestRejected = latest.status === 'rejected';
    const usable = latestRejected ? await latestUsableRevision(tx, sense.id) : latest;
    const base = usable ? readContent(usable) : { ...emptyContent };
    const merged = mergeContent(base, normalizeContent(input.content, input.lemma));
    // This precedes conflicts AND topic validation/dropping. An already-applied merge writes nothing.
    // After a rejection the same content still needs a fresh revision, so that shortcut is skipped.
    if (!latestRejected && contentHash(merged) === latest.contentHash) return { kind: 'unchanged', senseId: sense.id };

    const open = await tx.senseRevision.findFirst({ where: {
      senseId: sense.id, status: { in: ['draft', 'reviewed'] },
    }, orderBy: { revisionNo: 'desc' }, include: revisionInclude });
    if (input.senseId === null) {
      if (open?.draftSource === 'ui' && hasContent(readContent(open))) return rejected('open-draft-conflict');
      if (sense.liveRevisionId !== null && !input.replaceMeaning) {
        const live = await tx.senseRevision.findUniqueOrThrow({ where: { id: sense.liveRevisionId }, include: revisionInclude });
        if (merged.glossVi !== readContent(live).glossVi) return rejected('gloss-changed');
      }
    }

    // saveDraft owns the given-vs-inherited topic split, warning data, hash, texts and supersession.
    const draft = await senses.saveDraft(tx, {
      senseId: sense.id, baseRevision: latest.revisionNo, content: input.content, source: 'csv', actorId: input.actorId,
    }, topics);
    if (!draft.changed) return { kind: 'unchanged', senseId: sense.id };
    return { kind: 'new_revision', senseId: sense.id, revisionId: draft.revisionId,
      supersededRevisionId: open?.id ?? null, droppedReviewedMark: open?.status === 'reviewed', droppedTopics: draft.droppedTopics };
  } catch (error) {
    if (!(error instanceof ContentRuleError)) throw error;
    // Unexpected invariant/validation errors must still escape so the caller rolls back the row.
    switch (error.code) {
      case 'too-many-examples': case 'unknown-topic': case 'topic-archived':
      case 'sense-retired': case 'sense-entry-mismatch': case 'stale-revision':
        return rejected(error.code);
      default: throw error;
    }
  }
}
