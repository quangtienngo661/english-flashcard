import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

/** Reads what judges have scored (nhóm B design §5.4). The score, label and agreement readers of the next tasks join this class. */
@Injectable()
export class JudgeScoresReader {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /**
   * The subjects this judge revision has already judged completely: every criterion of the revision has a verdict (a "không chấm được"
   * score does not count, so asking again judges it once more and pays only for what is missing, B15). No ids → no query.
   */
  async judgedSubjects(judgeRevisionId: string, subjectIds: string[]): Promise<Set<string>> {
    const ids = [...new Set(subjectIds)];
    if (ids.length === 0) return new Set();
    const revision = await this.prisma.aiJudgeRevision.findUnique({ where: { id: judgeRevisionId }, select: { criteria: true } });
    if (!revision) return new Set();
    const criteria = (revision.criteria as unknown[]).length;
    const scores = await this.prisma.aiJudgeScore.findMany({
      where: { judgeRevisionId, subjectId: { in: ids }, verdict: { not: null } }, select: { subjectId: true },
    });
    const scored = new Map<string, number>();
    for (const { subjectId } of scores) scored.set(subjectId, (scored.get(subjectId) ?? 0) + 1);
    return new Set([...scored].filter(([, count]) => count === criteria).map(([subjectId]) => subjectId));
  }
}
