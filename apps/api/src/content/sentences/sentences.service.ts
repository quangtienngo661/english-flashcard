import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { normalizeText } from '../catalog/normalize.js';
import { SettingsService } from '../../settings/index.js';
import { SENTENCE_MAX } from '../content.constants.js';
import { visibleSenseCondition } from '../learner/visible-senses.js';
import { ContentRuleError } from '../senses/revision-content.js';

export type Sentence = { id: string; text: string; createdAt: Date };
export class NotVisibleError extends ContentRuleError {
  constructor() { super('not-found'); }
}
export class SentenceLimitError extends ContentRuleError {
  constructor() { super('sentence-limit-reached'); }
}
const sentenceSelect = { id: true, text: true, createdAt: true } satisfies Prisma.ContextSentenceSelect;

/** Context sentences (design 7.4). Never log their text (SR10). */
@Injectable()
export class SentencesService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(AppLogger) private readonly logger: AppLogger,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  async addSentence(tx: Prisma.TransactionClient, input: { userId: string; senseId: string; text: string }): Promise<Sentence> {
    // Through the caller's tx: quick add calls this holding its locks, so no second connection.
    const { sentencesPerSense } = (await this.settings.get(tx)).content;
    const text = normalizeText(input.text);
    if (!text || text.includes('\0') || [...text].length > SENTENCE_MAX) throw new ContentRuleError('validation-failed');
    // The shared rule (L5): an open sense with a live revision, in the catalog or the learner's own.
    const [visible] = await tx.$queryRaw<Array<{ ok: boolean }>>`
      SELECT ${visibleSenseCondition(Prisma.sql`${input.senseId}::uuid`, input.userId)} AS ok`;
    if (!visible?.ok) throw new NotVisibleError();
    // Serialize adds per (learner, sense) so concurrent requests cannot pass the limit together.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`content.sentences:${input.userId}:${input.senseId}`}, 0))`;
    if (await tx.contextSentence.count({ where: { userId: input.userId, senseId: input.senseId } }) >= sentencesPerSense) {
      throw new SentenceLimitError();
    }
    let sentence: Sentence;
    try {
      sentence = await tx.contextSentence.create({
        data: { userId: input.userId, senseId: input.senseId, text, createdAt: this.clock.now() }, select: sentenceSelect,
      });
    } catch (error) {
      // The owner deleted the private word between the check and the insert (L19): the sense is gone, so 404.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new NotVisibleError();
      throw error;
    }
    this.logger.info('context_sentence_added', { user_id: input.userId, sense_id: input.senseId, sentence_id: sentence.id });
    return sentence;
  }

  /** A caller inside an open transaction passes its `tx` as `db`, so the read needs no second connection (Bước 7 plan choice 5). */
  async listSentences(userId: string, senseIds: string[], db: Prisma.TransactionClient | PrismaClient = this.prisma):
    Promise<Map<string, Sentence[]>> {
    const result = new Map<string, Sentence[]>();
    if (senseIds.length === 0) return result;
    const rows = await db.contextSentence.findMany({
      where: { userId, senseId: { in: senseIds } }, select: { ...sentenceSelect, senseId: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    for (const { senseId, ...sentence } of rows) result.set(senseId, [...(result.get(senseId) ?? []), sentence]);
    return result;
  }

  async deleteSentence(userId: string, id: string): Promise<boolean> {
    const deleted = (await this.prisma.contextSentence.deleteMany({ where: { id, userId } })).count === 1;
    if (deleted) this.logger.info('context_sentence_deleted', { user_id: userId, sentence_id: id });
    return deleted;
  }
}
