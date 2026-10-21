import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

export type WordVerdict = 'ok' | 'not_recognized';

/** The last `check_private_word` result per learner and sense, with the content key it was made for (design §7.6). */
@Injectable()
export class WordChecksRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async get(userId: string, senseId: string): Promise<{ contentKey: string; verdict: WordVerdict } | null> {
    const row = await this.prisma.practiceWordCheck.findUnique({ where: { userId_senseId: { userId, senseId } } });
    return row ? { contentKey: row.contentKey, verdict: row.verdict as WordVerdict } : null;
  }

  async put(userId: string, senseId: string, contentKey: string, verdict: WordVerdict, now: Date): Promise<void> {
    await this.prisma.practiceWordCheck.upsert({
      where: { userId_senseId: { userId, senseId } },
      create: { userId, senseId, contentKey, verdict, checkedAt: now },
      update: { contentKey, verdict, checkedAt: now },
    });
  }
}
