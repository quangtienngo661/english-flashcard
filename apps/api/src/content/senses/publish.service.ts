import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { EntriesService } from '../catalog/entries.service.js';
import { ContentRuleError } from './revision-content.js';
import type { SaveDraftResult } from './senses.service.js';

export type PublishViolation = 'gloss-missing' | 'example-missing' | 'level-missing';
export type PublishItemResult = { outcome: 'published' | 'already_published' } | {
  outcome: 'refused'; reason: 'stale-revision' | 'publish-incomplete' | 'sense-not-found' | 'sense-retired';
  violations?: PublishViolation[];
};
export type PublishItem = { senseId: string; revision: number };
export type SenseStateResult = { senseId: string; ok: boolean; reason?: string };
export type QuickPublishResult = {
  outcome: 'published' | 'already_published'; revisionNo: number; droppedTopics: string[];
};
export class PublishIncompleteError extends ContentRuleError {
  constructor(readonly violations: PublishViolation[]) { super('publish-incomplete'); }
}
const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

/** Shared by publishing and staff's unpublishable list; callers resolve catalog facts. */
export function publishViolations(
  revision: { texts: readonly { language: string; kind: string; text: string }[]; examples: readonly string[] },
  hasLevel: boolean,
): PublishViolation[] {
  const violations: PublishViolation[] = [];
  if (!revision.texts.some(({ language, kind, text }) => language === 'vi' && kind === 'gloss' && text.trim())) {
    violations.push('gloss-missing');
  }
  if (!revision.examples.some((example) => example.trim())) violations.push('example-missing');
  if (!hasLevel) violations.push('level-missing');
  return violations;
}

@Injectable()
export class PublishService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(EntriesService) private readonly entries: EntriesService,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  // `opts.skipUnpublished` is declared for the publish job (Task 15) and not read yet.
  async publishItem(item: PublishItem, actorId: string, _opts?: { skipUnpublished?: boolean }): Promise<PublishItemResult> {
    return await this.writeSense(item.senseId, (tx) => this.publishRevision(tx, item, actorId))
      ?? { outcome: 'refused', reason: 'sense-not-found' };
  }

  unpublish(senseIds: string[], actorId: string): Promise<SenseStateResult[]> {
    return this.changeStates(senseIds, 'unpublished', actorId);
  }

  retire(senseIds: string[], actorId: string): Promise<SenseStateResult[]> {
    return this.changeStates(senseIds, 'retired', actorId);
  }

  async quickPublish(
    senseId: string, actorId: string, saveDraft: (tx: Prisma.TransactionClient) => Promise<SaveDraftResult>,
  ): Promise<QuickPublishResult> {
    const result = await this.writeSense(senseId, async (tx) => {
      const draft = await saveDraft(tx);
      const published = await this.publishRevision(tx, { senseId, revision: draft.revisionNo }, actorId);
      if (published.outcome === 'refused') {
        // Throw inside the transaction: even supersession of the previous open revision rolls back.
        if (published.reason === 'publish-incomplete') throw new PublishIncompleteError(published.violations ?? []);
        throw new ContentRuleError(published.reason === 'sense-not-found' ? 'not-found' : published.reason);
      }
      return { outcome: published.outcome, revisionNo: draft.revisionNo, droppedTopics: draft.droppedTopics };
    });
    if (!result) throw new ContentRuleError('not-found');
    return result;
  }

  private async writeSense<T>(senseId: string, write: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T | null> {
    // Read only the immutable entry key outside the transaction; re-read mutable state after locking.
    const sense = await this.prisma.sense.findFirst({ where: { id: senseId, entry: { scope: 'catalog' } }, select: {
      entry: { select: { lemma: true, pos: true } },
    } });
    if (!sense) return null;
    return this.prisma.$transaction(async (tx) => {
      await this.entries.lockEntryKey(tx, sense.entry.lemma, sense.entry.pos);
      return write(tx);
    }, transactionOptions);
  }

  private async publishRevision(tx: Prisma.TransactionClient, item: PublishItem, actorId: string): Promise<PublishItemResult> {
    const now = this.clock.now();
    const sense = await tx.sense.findUnique({ where: { id: item.senseId }, include: {
      revisions: { orderBy: { revisionNo: 'desc' }, take: 1, include: { texts: true } },
    } });
    if (!sense) return { outcome: 'refused', reason: 'sense-not-found' };
    if (sense.state === 'retired') return { outcome: 'refused', reason: 'sense-retired' };
    const revision = sense.revisions[0];
    if (!revision || revision.revisionNo !== item.revision) return { outcome: 'refused', reason: 'stale-revision' };
    if (sense.state === 'open' && sense.liveRevisionId === revision.id) return { outcome: 'already_published' };

    const hasLevel = await tx.entryLevel.findFirst({ where: { entryId: sense.entryId }, select: { id: true } });
    const violations = publishViolations(revision, hasLevel !== null);
    if (violations.length) return { outcome: 'refused', reason: 'publish-incomplete', violations };

    // This must precede the replacement's live pointer: senses_entry_label_live_key is not deferred.
    if (sense.replacesSenseId !== null) {
      await tx.sense.update({ where: { id: sense.replacesSenseId }, data: {
        state: 'retired', stateChangedBy: actorId, stateChangedAt: now,
      } });
    }
    if (sense.liveRevisionId !== null && sense.liveRevisionId !== revision.id) {
      await tx.senseRevision.update({ where: { id: sense.liveRevisionId }, data: { status: 'superseded' } });
    }
    await tx.senseRevision.update({ where: { id: revision.id }, data: {
      status: 'published', publishedAt: revision.publishedAt ?? now, publishedBy: actorId,
    } });
    await tx.sense.update({ where: { id: sense.id }, data: {
      state: 'open', liveRevisionId: revision.id, stateChangedBy: actorId, stateChangedAt: now,
    } });
    return { outcome: 'published' };
  }

  private async changeStates(
    senseIds: string[], state: 'unpublished' | 'retired', actorId: string,
  ): Promise<SenseStateResult[]> {
    const results: SenseStateResult[] = [];
    for (const senseId of senseIds) {
      const result = await this.writeSense(senseId, async (tx): Promise<SenseStateResult> => {
        const sense = await tx.sense.findUnique({ where: { id: senseId }, select: { state: true } });
        if (!sense) return { senseId, ok: false, reason: 'sense-not-found' };
        if (sense.state === 'retired' && state !== 'retired') return { senseId, ok: false, reason: 'sense-retired' };
        if (sense.state !== state) await tx.sense.update({ where: { id: senseId }, data: {
          state, stateChangedBy: actorId, stateChangedAt: this.clock.now(),
        } });
        // Keep live_revision_id and published_at: unpublish hides content without erasing publication history.
        return { senseId, ok: true };
      });
      results.push(result ?? { senseId, ok: false, reason: 'sense-not-found' });
    }
    return results;
  }
}
