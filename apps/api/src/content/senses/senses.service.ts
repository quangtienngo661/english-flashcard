import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { normalizeText } from '../catalog/normalize.js';
import { ContentRuleError, contentHash, mergeContent, normalizeContent, type RevisionContent } from './revision-content.js';

export type CreateSenseInput = {
  entryId: string; contextLabel: string | null; content?: Partial<RevisionContent>;
  replacesSenseId?: string; source: 'ui' | 'csv'; actorId: string;
};
export type SaveDraftInput = {
  senseId: string; baseRevision: number; content: Partial<RevisionContent>; source: 'ui' | 'csv'; actorId: string;
};
export type SaveDraftResult = { revisionId: string; revisionNo: number; changed: boolean; droppedTopics: string[] };
export type MarkRevisionItem ={ senseId: string; revision: number; action: 'reviewed' | 'rejected' };
export type MarkRevisionResult = { senseId: string; ok: boolean; reason?: string };
export type TopicLookup = (codes: string[]) => Promise<Array<{ code: string; archivedAt: Date | null }>>;
const empty: RevisionContent = { glossVi: null, definitionEn: null, examplesEn: [], topicCodes: [], acceptedForms: [] };
const revisionInclude = { texts: true } satisfies Prisma.SenseRevisionInclude;
type RevisionRow = Prisma.SenseRevisionGetPayload<{ include: typeof revisionInclude }>;

function readContent(revision: RevisionRow): RevisionContent {
  return {
    glossVi: revision.texts.find(({ language, kind }) => language === 'vi' && kind === 'gloss')?.text ?? null,
    definitionEn: revision.texts.find(({ language, kind }) => language === 'en' && kind === 'definition')?.text ?? null,
    examplesEn: revision.examples, topicCodes: revision.topicCodes, acceptedForms: revision.acceptedForms,
  };
}

async function validateTopics(codes: string[], lookup: TopicLookup): Promise<void> {
  const topics = new Map((await lookup(codes)).map((topic) => [topic.code, topic]));
  for (const code of codes) {
    const topic = topics.get(code);
    if (!topic) throw new ContentRuleError('unknown-topic');
    if (topic.archivedAt) throw new ContentRuleError('topic-archived');
  }
}

function revisionData(content: RevisionContent, source: 'ui' | 'csv', actorId: string) {
  const texts: Array<{ language: string; kind: string; text: string }> = [];
  if (content.glossVi) texts.push({ language: 'vi', kind: 'gloss', text: content.glossVi });
  if (content.definitionEn) texts.push({ language: 'en', kind: 'definition', text: content.definitionEn });
  return {
    draftSource: source, createdBy: actorId, status: 'draft', contentHash: contentHash(content),
    examples: content.examplesEn, topicCodes: content.topicCodes, acceptedForms: content.acceptedForms,
    texts: { create: texts },
  };
}

/** All writes use the caller's transaction, with its entry-key lock already acquired. */
@Injectable()
export class SensesService {
  async createSense(tx: Prisma.TransactionClient, input: CreateSenseInput, topics: TopicLookup): Promise<{ senseId: string; revisionId: string }> {
    const entry = await tx.entry.findUnique({ where: { id: input.entryId }, select: { id: true, lemma: true } });
    if (!entry) throw new ContentRuleError('not-found');
    const contextLabel = input.contextLabel === null ? null : normalizeText(input.contextLabel) || null;
    if (contextLabel && (contextLabel.includes('\0') || [...contextLabel].length > 2_000)) throw new ContentRuleError('validation-failed');
    if (input.replacesSenseId) {
      const target = await tx.sense.findUnique({ where: { id: input.replacesSenseId } });
      if (!target) throw new ContentRuleError('not-found');
      if (target.entryId !== entry.id) throw new ContentRuleError('sense-entry-mismatch');
      if (target.state === 'retired') throw new ContentRuleError('sense-retired');
      if (target.replacesSenseId !== null && target.liveRevisionId === null) throw new ContentRuleError('replacement-waiting');
      if (await tx.sense.findFirst({ where: {
        replacesSenseId: target.id, liveRevisionId: null, state: { not: 'retired' },
      }, select: { id: true } })) throw new ContentRuleError('replacement-exists');
    } else if (await tx.sense.findFirst({ where: {
      entryId: entry.id, contextLabel, state: { not: 'retired' },
      OR: [{ replacesSenseId: null }, { liveRevisionId: { not: null } }],
    }, select: { id: true } })) throw new ContentRuleError('sense-exists');
    const content = mergeContent(empty, normalizeContent(input.content ?? {}, entry.lemma));
    await validateTopics(content.topicCodes, topics);
    const sense = await tx.sense.create({ data: {
      entryId: entry.id, contextLabel, replacesSenseId: input.replacesSenseId,
      revisions: { create: { revisionNo: 1, ...revisionData(content, input.source, input.actorId) } },
    }, select: { id: true, revisions: { select: { id: true } } } });
    return { senseId: sense.id, revisionId: sense.revisions[0].id };
  }

  async saveDraft(tx: Prisma.TransactionClient, input: SaveDraftInput, topics: TopicLookup): Promise<SaveDraftResult> {
    const sense = await tx.sense.findUnique({ where: { id: input.senseId }, include: {
      entry: { select: { lemma: true } }, revisions: { orderBy: { revisionNo: 'desc' }, take: 1, include: revisionInclude },
    } });
    if (!sense) throw new ContentRuleError('not-found');
    if (sense.state === 'retired') throw new ContentRuleError('sense-retired');
    const latest = sense.revisions[0];
    if (!latest || input.baseRevision !== latest.revisionNo) throw new ContentRuleError('stale-revision');
    const patch = normalizeContent(input.content, sense.entry.lemma);
    const base = readContent(latest);
    let droppedTopics: string[] = [];
    if (patch.topicCodes !== undefined) {
      // Only codes the caller sends are validated (unknown-topic / topic-archived).
      await validateTopics(patch.topicCodes, topics);
    } else if (base.topicCodes.length > 0) {
      // Design §5 / B2E20: an inherited topic archived since the last revision is dropped, so editing an
      // old sense is never blocked by a topic nobody asked to keep; the caller reports it as a warning.
      const archived = new Set((await topics(base.topicCodes)).filter((topic) => topic.archivedAt).map((topic) => topic.code));
      droppedTopics = base.topicCodes.filter((code) => archived.has(code));
      base.topicCodes = base.topicCodes.filter((code) => !archived.has(code));
    }
    const content = mergeContent(base, patch);
    if (contentHash(content) === latest.contentHash) {
      return { revisionId: latest.id, revisionNo: latest.revisionNo, changed: false, droppedTopics: [] };
    }
    await tx.senseRevision.updateMany({ where: { senseId: sense.id, status: { in: ['draft', 'reviewed'] } }, data: { status: 'superseded' } });
    const revision = await tx.senseRevision.create({ data: {
      senseId: sense.id, revisionNo: latest.revisionNo + 1, ...revisionData(content, input.source, input.actorId),
    }, select: { id: true, revisionNo: true } });
    return { revisionId: revision.id, revisionNo: revision.revisionNo, changed: true, droppedTopics };
  }

  async markRevisions(tx: Prisma.TransactionClient, items: MarkRevisionItem[]): Promise<MarkRevisionResult[]> {
    const results: MarkRevisionResult[] = [];
    for (const item of items) {
      const sense = await tx.sense.findUnique({ where: { id: item.senseId }, include: {
        revisions: { orderBy: { revisionNo: 'desc' }, take: 1 },
      } });
      const latest = sense?.revisions[0];
      const reason = !sense ? 'not-found' : sense.state === 'retired' ? 'sense-retired'
        : !latest || latest.revisionNo !== item.revision ? 'stale-revision'
        : !['draft', 'reviewed', item.action].includes(latest.status) ? 'revision-not-open' : undefined;
      if (reason || !sense || !latest) {
        results.push({ senseId: item.senseId, ok: false, reason });
        continue;
      }
      await tx.senseRevision.update({ where: { id: latest.id }, data: { status: item.action } });
      if (item.action === 'rejected' && sense.replacesSenseId !== null && sense.liveRevisionId === null) {
        await tx.sense.update({ where: { id: sense.id }, data: { state: 'retired' } });
      }
      results.push({ senseId: item.senseId, ok: true });
    }
    return results;
  }
}
