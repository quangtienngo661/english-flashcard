import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { normalizeLemma, normalizeText } from '../catalog/normalize.js';
import {
  LEMMA_MAX, LEVELS, MEANING_MAX, OWNER_SOURCE_ID, PRIVATE_EXAMPLES_MAX, PRIVATE_POS_UNSET, SENTENCE_MAX, VALID_POS,
  type InflectionKind, type Level,
} from '../content.constants.js';
import { ContentRuleError, contentHash, revisionFormOf, type RevisionContent } from '../senses/revision-content.js';
import { LevelsService } from '../catalog/levels.service.js';
import { generateInflections } from '../inflections/inflect.js';
import { InflectionsService } from '../inflections/inflections.service.js';
import { visibleSenseCondition } from '../learner/visible-senses.js';
import { SettingsService } from '../../settings/index.js';

export type Meaning = { text: string; language: 'vi' | 'en' };
/**
 * `examples` (0..PRIVATE_EXAMPLES_MAX) go to the first revision's `examples_en`; `aiSuggestion` marks it `draft_source =
 * 'ai_suggestion'`, shown as "AI gợi ý" until a later edit publishes a revision (Bước 7 design §11.2, D22, plan choice 3).
 */
export type CreatePrivateSenseInput = {
  ownerId: string; lemma: string; pos: string | null; meaning: Meaning; level: Level | null; topicCodes: string[];
  formOf: { entryId: string; kind: InflectionKind } | null; examples: string[]; aiSuggestion: boolean;
};
export type CreatePrivateSenseResult = {
  entryId: string; senseId: string; createdEntry: boolean; catalogMatch: { entryId: string } | null;
};
/** Per sense: a new meaning, new examples (an empty list removes them; plan choice 4), or both. */
export type PrivateWordPatch = {
  lemma?: string; pos?: string | null; senses?: Array<{ senseId: string; meaning?: Meaning; examples?: string[] }>;
  level?: Level | null; topicCodes?: string[];
};
export class PrivateWordLimitError extends ContentRuleError {
  constructor() { super('private-word-limit-reached'); }
}
type Tx = Prisma.TransactionClient;
const revisionInclude = { texts: true } satisfies Prisma.SenseRevisionInclude;
type RevisionRow = Prisma.SenseRevisionGetPayload<{ include: typeof revisionInclude }>;

const invalid = () => new ContentRuleError('validation-failed');

/** NFC + trim, 1..max code points, no NUL (Review Focus 3). */
function boundedText(value: string, max: number): string {
  const text = normalizeText(value);
  if (!text || text.includes('\0') || [...text].length > max) throw invalid();
  return text;
}
function privateLemma(value: string): string {
  const lemma = normalizeLemma(value);
  if (!lemma || lemma.includes('\0') || [...lemma].length > LEMMA_MAX) throw invalid();
  return lemma;
}
function privatePos(value: string | null): string {
  if (value === null) return PRIVATE_POS_UNSET;
  const pos = normalizeText(value).toLowerCase();
  if (!VALID_POS.some((valid) => valid === pos)) throw invalid();
  return pos;
}
function privateExamples(examples: string[]): string[] {
  if (examples.length > PRIVATE_EXAMPLES_MAX) throw invalid();
  return examples.map((example) => boundedText(example, SENTENCE_MAX));
}
function meaningContent(meaning: Meaning): Pick<RevisionContent, 'glossVi' | 'definitionEn'> {
  const text = boundedText(meaning.text, MEANING_MAX);
  return meaning.language === 'vi' ? { glossVi: text, definitionEn: null } : { glossVi: null, definitionEn: text };
}
function readContent(revision: RevisionRow): RevisionContent {
  return {
    glossVi: revision.texts.find(({ language, kind }) => language === 'vi' && kind === 'gloss')?.text ?? null,
    definitionEn: revision.texts.find(({ language, kind }) => language === 'en' && kind === 'definition')?.text ?? null,
    examplesEn: revision.examples, topicCodes: revision.topicCodes, acceptedForms: revision.acceptedForms,
    ...revisionFormOf(revision),
  };
}

/** Learners' private words (design 7.2). Every write uses the caller's transaction and takes the owner's lock. */
@Injectable()
export class PrivateWordsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(LevelsService) private readonly levels: LevelsService,
    @Inject(InflectionsService) private readonly inflections: InflectionsService,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  /** One lock per owner serializes the limit count and the (owner, lemma, pos) uniqueness check. */
  private async lockOwner(tx: Tx, ownerId: string): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'content.private:' + ownerId}, 0))`;
  }

  private async validTopics(tx: Tx, codes: string[]): Promise<string[]> {
    const normalized = [...new Set(codes.map((code) => normalizeText(code).toLowerCase()))];
    if (normalized.some((code) => !code)) throw invalid();
    const active = await tx.topic.count({ where: { code: { in: normalized }, archivedAt: null } });
    if (active !== normalized.length) throw invalid();
    return normalized;
  }

  private async setLevel(tx: Tx, entryId: string, level: Level | null, basis: 'user' | 'derived'): Promise<void> {
    await tx.entryLevel.deleteMany({ where: { entryId } });
    if (level !== null) {
      if (!LEVELS.includes(level)) throw invalid();
      await tx.entryLevel.create({ data: { entryId, level, sourceId: OWNER_SOURCE_ID, basis, createdAt: this.clock.now() } });
    }
  }

  private async publishRevision(tx: Tx, senseId: string, revisionNo: number, content: RevisionContent, ownerId: string,
    draftSource: 'user' | 'ai_suggestion' = 'user'): Promise<void> {
    const now = this.clock.now();
    const texts = [
      ...(content.glossVi ? [{ language: 'vi', kind: 'gloss', text: content.glossVi }] : []),
      ...(content.definitionEn ? [{ language: 'en', kind: 'definition', text: content.definitionEn }] : []),
    ];
    await tx.senseRevision.updateMany({ where: { senseId, status: 'published' }, data: { status: 'superseded' } });
    const revision = await tx.senseRevision.create({ data: {
      senseId, revisionNo, status: 'published', draftSource, createdBy: ownerId, publishedAt: now, publishedBy: ownerId,
      contentHash: contentHash(content), examples: content.examplesEn, topicCodes: content.topicCodes,
      acceptedForms: content.acceptedForms, formOfEntryId: content.formOf?.entryId ?? null, formKind: content.formOf?.kind ?? null,
      texts: { create: texts },
    }, select: { id: true } });
    await tx.sense.update({ where: { id: senseId }, data: {
      state: 'open', liveRevisionId: revision.id, stateChangedBy: ownerId, stateChangedAt: now,
    } });
  }

  private async ownedEntry(tx: Tx, ownerId: string, entryId: string) {
    const entry = await tx.entry.findFirst({ where: { id: entryId, scope: 'private', ownerUserId: ownerId } });
    if (!entry) throw new ContentRuleError('not-found');
    return entry;
  }

  async createPrivateSense(tx: Tx, input: CreatePrivateSenseInput): Promise<CreatePrivateSenseResult> {
    // Through the caller's tx: quick add calls this holding the learner lock, so no second connection.
    const { privateWordsPerUser } = (await this.settings.get(tx)).content;
    const lemma = privateLemma(input.lemma);
    const pos = privatePos(input.pos);
    const meaning = meaningContent(input.meaning);
    const examples = privateExamples(input.examples);
    if (input.level !== null && !LEVELS.includes(input.level)) throw invalid();
    await this.lockOwner(tx, input.ownerId);
    const topicCodes = await this.validTopics(tx, input.topicCodes);
    if (input.formOf) {
      // FE22: FOR SHARE blocks a concurrent batch revert (FOR UPDATE) from deleting the base entry under us.
      const base = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM entries WHERE id = ${input.formOf.entryId}::uuid
        AND (scope = 'catalog' OR (scope = 'private' AND owner_user_id = ${input.ownerId}::uuid)) FOR SHARE`;
      if (base.length === 0) throw new ContentRuleError('not-found');
    }

    let entry = await tx.entry.findFirst({ where: { scope: 'private', ownerUserId: input.ownerId, language: 'en', lemma, pos } });
    const createdEntry = entry === null;
    if (!entry) {
      if (await tx.entry.count({ where: { scope: 'private', ownerUserId: input.ownerId } }) >= privateWordsPerUser) {
        throw new PrivateWordLimitError();
      }
      entry = await tx.entry.create({ data: { language: 'en', lemma, pos, scope: 'private', ownerUserId: input.ownerId } });
      // Private words have only the library set (design 7.3).
      await this.inflections.replaceInflections(tx, entry.id, 'library', generateInflections(lemma, pos));
    }

    // Private labels are internal: the live-sense index allows one null label per entry, so later meanings get p2, p3, …
    const labels = new Set((await tx.sense.findMany({ where: { entryId: entry.id }, select: { contextLabel: true } }))
      .map(({ contextLabel }) => contextLabel));
    let contextLabel: string | null = null;
    for (let n = 2; labels.has(contextLabel); n++) contextLabel = `p${n}`;
    const sense = await tx.sense.create({ data: { entryId: entry.id, contextLabel, state: 'unpublished' }, select: { id: true } });
    await this.publishRevision(tx, sense.id, 1, { ...meaning, examplesEn: examples, topicCodes, acceptedForms: [], formOf: input.formOf },
      input.ownerId, input.aiSuggestion ? 'ai_suggestion' : 'user');

    if (input.level !== null) {
      await this.setLevel(tx, entry.id, input.level, 'user');
    } else if (input.formOf && !await tx.entryLevel.findFirst({ where: { entryId: entry.id }, select: { id: true } })) {
      const base = await this.levels.displayedLevel(tx, input.formOf.entryId);
      if (base !== null) await this.setLevel(tx, entry.id, base, 'derived');
    }

    const catalog = await tx.entry.findFirst({
      where: { scope: 'catalog', language: 'en', lemma, ...(pos === PRIVATE_POS_UNSET ? {} : { pos }) },
      orderBy: [{ pos: 'asc' }, { id: 'asc' }], select: { id: true },
    });
    return { entryId: entry.id, senseId: sense.id, createdEntry, catalogMatch: catalog ? { entryId: catalog.id } : null };
  }

  async updatePrivateWord(tx: Tx, ownerId: string, entryId: string, patch: PrivateWordPatch): Promise<void> {
    await this.lockOwner(tx, ownerId);
    const entry = await this.ownedEntry(tx, ownerId, entryId);
    if (patch.lemma !== undefined || patch.pos !== undefined) {
      const lemma = patch.lemma !== undefined ? privateLemma(patch.lemma) : entry.lemma;
      const pos = patch.pos !== undefined ? privatePos(patch.pos) : entry.pos;
      if (await tx.entry.findFirst({ where: { scope: 'private', ownerUserId: ownerId, language: 'en', lemma, pos, id: { not: entry.id } },
        select: { id: true } })) throw new ContentRuleError('private-word-exists');
      await tx.entry.update({ where: { id: entry.id }, data: { lemma, pos } });
      if (lemma !== entry.lemma || pos !== entry.pos) {
        await this.inflections.replaceInflections(tx, entry.id, 'library', generateInflections(lemma, pos));
      }
    }
    const topicCodes = patch.topicCodes !== undefined ? await this.validTopics(tx, patch.topicCodes) : undefined;
    const changes = new Map((patch.senses ?? []).map(({ senseId, meaning, examples }) => [senseId, {
      ...(meaning === undefined ? {} : meaningContent(meaning)),
      ...(examples === undefined ? {} : { examplesEn: privateExamples(examples) }),
    }]));
    const senses = await tx.sense.findMany({ where: { entryId: entry.id }, include: {
      revisions: { orderBy: { revisionNo: 'desc' }, take: 1, include: revisionInclude },
    } });
    if ([...changes.keys()].some((id) => !senses.some((sense) => sense.id === id))) throw new ContentRuleError('not-found');
    for (const sense of senses) {
      const latest = sense.revisions[0];
      const change = changes.get(sense.id);
      if (!latest || (change === undefined && topicCodes === undefined)) continue;
      const base = readContent(latest);
      // A published revision is the learner's own content, so it is always draft_source 'user' (the AI label goes, plan choice 3).
      const content: RevisionContent = { ...base, ...change, topicCodes: topicCodes ?? base.topicCodes };
      if (contentHash(content) === latest.contentHash) continue;
      await this.publishRevision(tx, sense.id, latest.revisionNo + 1, content, ownerId);
    }
    if (patch.level !== undefined) await this.setLevel(tx, entry.id, patch.level, 'user');
  }

  /** Deletes the entry and, by cascade, its senses, revisions, texts, levels and inflections. Learning calls this (Task 16). */
  async deletePrivateEntryContent(tx: Tx, ownerId: string, entryId: string): Promise<{ senseIds: string[] }> {
    await this.lockOwner(tx, ownerId);
    const entry = await this.ownedEntry(tx, ownerId, entryId);
    const senseIds = (await tx.sense.findMany({ where: { entryId: entry.id }, select: { id: true } })).map(({ id }) => id);
    await tx.entry.delete({ where: { id: entry.id } });
    return { senseIds };
  }

  /** The ids of the owner's private senses: Practice reads them before the account eraser deletes the entries (design §7.3, D27a). */
  async privateSenseIdsOf(tx: Tx, ownerId: string): Promise<string[]> {
    const rows = await tx.sense.findMany({ where: { entry: { scope: 'private', ownerUserId: ownerId } }, select: { id: true } });
    return rows.map(({ id }) => id);
  }

  /**
   * Catalog senses that are published and open, plus the viewer's own private senses. A caller inside an open transaction
   * passes its `tx` as `db` (Bước 7 plan choice 5).
   */
  async visibleSenseIds(viewerId: string, senseIds: string[], db: Prisma.TransactionClient | PrismaClient = this.prisma):
    Promise<Set<string>> {
    if (senseIds.length === 0) return new Set();
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT t.id::text AS id FROM unnest(${senseIds}::uuid[]) AS t(id)
      WHERE ${visibleSenseCondition(Prisma.sql`t.id`, viewerId)}`;
    return new Set(rows.map(({ id }) => id));
  }

  /** Published catalog senses matching the filter, function words excluded and counted (K11). */
  async bulkCandidates(filter: { level?: Level; topic?: string; pos?: string }, limit: number):
    Promise<{ senseIds: string[]; skippedFunctionWords: number }> {
    const filters = [
      Prisma.sql`s.state = 'open' AND s.live_revision_id IS NOT NULL`,
      Prisma.sql`e.scope = 'catalog' AND e.language = 'en' AND e.entry_type = 'word'`,
      ...(filter.level === undefined ? [] : [Prisma.sql`displayed.level = ${filter.level}`]),
      ...(filter.topic === undefined ? [] : [Prisma.sql`${filter.topic} = ANY(r.topic_codes)`]),
      ...(filter.pos === undefined ? [] : [Prisma.sql`e.pos = ${filter.pos}`]),
    ];
    const rows = await this.prisma.$queryRaw<Array<{ sense_id: string; function_word: boolean }>>`
      SELECT s.id::text AS sense_id, COALESCE(e.function_word_override, e.function_word_derived) AS function_word
      FROM senses s
      JOIN entries e ON e.id = s.entry_id
      JOIN sense_revisions r ON r.id = s.live_revision_id
      LEFT JOIN LATERAL (
        SELECT el.level FROM entry_levels el JOIN data_sources ds ON ds.id = el.source_id
        WHERE el.entry_id = e.id
        ORDER BY (el.basis = 'editorial') DESC,
          CASE WHEN el.basis = 'editorial' THEN el.created_at END DESC,
          CASE WHEN el.basis = 'editorial' THEN el.id END ASC,
          ds.display_priority ASC, ds.id ASC,
          array_position(ARRAY['A1', 'A2', 'B1', 'B2', 'C1', 'C2']::text[], el.level) ASC
        LIMIT 1
      ) displayed ON true
      WHERE ${Prisma.join(filters, ' AND ')}
      ORDER BY e.lemma ASC, e.pos ASC, s.id ASC`;
    const words = rows.filter(({ function_word }) => !function_word);
    return { senseIds: words.slice(0, limit).map(({ sense_id }) => sense_id), skippedFunctionWords: rows.length - words.length };
  }
}
