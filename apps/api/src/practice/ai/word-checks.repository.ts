import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { lockUserForDataWrite, USER_DATA_TX } from '../../identity/user-lock.js';

export type WordVerdict = 'ok' | 'not_recognized';

/** The last `check_private_word` result per learner and sense, with the content key it was made for (design §7.6). */
@Injectable()
export class WordChecksRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async get(userId: string, senseId: string): Promise<{ contentKey: string; verdict: WordVerdict } | null> {
    const row = await this.prisma.practiceWordCheck.findUnique({ where: { userId_senseId: { userId, senseId } } });
    return row ? { contentKey: row.contentKey, verdict: row.verdict as WordVerdict } : null;
  }

  async put(userId: string, senseId: string, contentKey: string, verdict: WordVerdict, now: Date): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      if (!(await lockUserForDataWrite(tx, userId))) return false;
      await tx.practiceWordCheck.upsert({
        where: { userId_senseId: { userId, senseId } },
        create: { userId, senseId, contentKey, verdict, checkedAt: now },
        update: { contentKey, verdict, checkedAt: now },
      });
      return true;
    }, USER_DATA_TX);
  }
}
