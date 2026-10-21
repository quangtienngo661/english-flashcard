import { Inject, Injectable, Optional } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { localDate } from '../../common/time/local-date.js';
import { ContentRuleError, ContentService, type InflectionKind, type Level } from '../../content/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { GroupsService } from '../groups/groups.service.js';
import { ItemsService } from '../items/items.service.js';
import { withLearnerLock } from '../learning-lock.js';
import { PRIVATE_SENSES_CLEANUP, type PrivateSensesCleanup } from '../private-senses-cleanup.port.js';

const transactionOptions = { timeout: 30_000, maxWait: 5_000 };
const conflicts = new Set(['private-word-exists', 'private-word-limit-reached', 'sentence-limit-reached']);

export type NewWord = {
  lemma: string; pos?: string | null; meaning: string; level?: Level | null; topics?: string[];
  form_of?: { entry_id: string; kind: InflectionKind }; examples?: string[]; ai_suggestion?: boolean;
};
export type QuickAddInput = { groupId: string; senseId?: string; newWord?: NewWord; sentence?: string };
export type QuickAddResult = {
  item_id: string; sense_id: string; created_item: boolean; created_word: boolean; sentence_id: string | null;
};

const notFound = () => new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });

/** Content rule errors as problem details: missing or not visible is 404, never 403. */
async function contentProblems<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (!(error instanceof ContentRuleError)) throw error;
    if (error.code === 'not-found') throw notFound();
    if (conflicts.has(error.code)) throw new ProblemDetailsException({ status: 409, title: error.code, type: error.code });
    throw new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
  }
}

/** Learning orchestrates writes that span Content and Learning, since Content must not call Learning (design §4). */
@Injectable()
export class QuickAddService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(GroupsService) private readonly groups: GroupsService,
    @Inject(ItemsService) private readonly items: ItemsService,
    @Optional() @Inject(PRIVATE_SENSES_CLEANUP) private readonly privateSensesCleanup?: PrivateSensesCleanup,
  ) {}

  /** B3#8, B3#9: private word, sentence, item and group link in one transaction — any refusal stores nothing (B3E11). */
  async quickAdd(userId: string, nativeLanguage: 'vi' | 'en', input: QuickAddInput): Promise<QuickAddResult> {
    const profile = await this.identity.getProfile(userId);
    if (!profile) throw notFound();
    if (input.senseId !== undefined && !(await this.content.visibleSenseIds(userId, [input.senseId])).has(input.senseId)) {
      await this.groups.assertOwned(this.prisma, userId, input.groupId);
      throw notFound();
    }
    return contentProblems(() => this.prisma.$transaction(async (tx) => {
      // Learning's lock first, then Content's owner lock inside createPrivateSense: the same order as deleteMyWord.
      await withLearnerLock(tx, userId);
      await this.groups.assertOwned(tx, userId, input.groupId);
      let senseId = input.senseId!;
      const word = input.newWord;
      if (word) {
        senseId = (await this.content.createPrivateSense(tx, {
          ownerId: userId, lemma: word.lemma, pos: word.pos ?? null, meaning: { text: word.meaning, language: nativeLanguage },
          level: word.level ?? null, topicCodes: word.topics ?? [],
          formOf: word.form_of ? { entryId: word.form_of.entry_id, kind: word.form_of.kind } : null,
          examples: word.examples ?? [], aiSuggestion: word.ai_suggestion ?? false,
        })).senseId;
      }
      const today = localDate(profile.timezone, this.clock.now());
      const item = await this.items.linkInTx(tx, userId, input.groupId, senseId, today);
      const sentence = input.sentence === undefined ? null
        : await this.content.addSentence(tx, { userId, senseId, text: input.sentence });
      return {
        item_id: item.item_id, sense_id: senseId, created_item: item.created, created_word: word !== undefined,
        sentence_id: sentence?.id ?? null,
      };
    }, transactionOptions));
  }

  /** B3E17 / CR23: the private entry with its senses and sentences, plus their items, group links and log rows. */
  async deleteMyWord(userId: string, entryId: string): Promise<void> {
    await contentProblems(() => this.prisma.$transaction(async (tx) => {
      await withLearnerLock(tx, userId);
      const { senseIds } = await this.content.deletePrivateEntryContent(tx, userId, entryId);
      // Practice's rows go before the items: the port locks practice rows, and nothing may hold a Learning item first.
      await this.privateSensesCleanup?.deleteForSenses(tx, userId, senseIds);
      await tx.learningItem.deleteMany({ where: { userId, senseId: { in: senseIds } } });
      await tx.learningLogEntry.deleteMany({ where: { userId, senseId: { in: senseIds } } });
    }, transactionOptions));
  }
}
