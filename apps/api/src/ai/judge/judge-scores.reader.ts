import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { userRef } from '../../common/user-ref.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { AI_SYSTEM_ACTOR_ID } from '../ai.constants.js';
import type { EvalSplit } from '../eval/eval.types.js';
import type { JudgeVerdict, LabelView, SubjectKind } from './judge.types.js';
import type { RunJudgeScore } from './judge-stats.js';

const SYSTEM_IDS: ReadonlySet<string> = new Set([AI_SYSTEM_ACTOR_ID]);

/** Reads what judges have scored (nhóm B design §5.4). The score, label and agreement readers of the next tasks join this class. */
@Injectable()
export class JudgeScoresReader {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(IdentityService) private readonly identity: IdentityService,
  ) {}

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

  /**
   * Every score of every output of a run, with the split of its item and the judge revision it came from (held-out ones too: the callers turn them
   * into totals and never show their reasons, R7).
   */
  async byRun(runId: string): Promise<RunJudgeScore[]> {
    const items = await this.prisma.aiEvalRunItem.findMany({ where: { runId }, select: { id: true, split: true } });
    if (items.length === 0) return [];
    const split = new Map(items.map((item) => [item.id, item.split as EvalSplit]));
    const rows = await this.prisma.aiJudgeScore.findMany({
      where: { subjectKind: 'eval_item', subjectId: { in: [...split.keys()] } }, include: { revision: { include: { judge: true } } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({
      itemId: row.subjectId, split: split.get(row.subjectId) as EvalSplit, judgeId: row.revision.judge.id, judgeName: row.revision.judge.name,
      judgeRevisionId: row.judgeRevisionId, revision: row.revision.revision, criterion: row.criterion, verdict: row.verdict as JudgeVerdict | null,
      problem: row.problem, reason: row.reason,
    }));
  }

  /** The labels on these outputs, grouped by output id (an output with none is absent). */
  async labelsOf(kind: SubjectKind, ids: string[]): Promise<Map<string, LabelView[]>> {
    const labels = new Map<string, LabelView[]>();
    if (ids.length === 0) return labels;
    const rows = await this.prisma.aiLabel.findMany({ where: { subjectKind: kind, subjectId: { in: ids } }, orderBy: [{ labeledAt: 'asc' }, { id: 'asc' }] });
    const emails = await this.identity.emailsOf(rows.map((row) => row.labeledBy));
    for (const row of rows) {
      const view: LabelView = {
        subject_kind: kind, subject_id: row.subjectId, criterion: row.criterion, verdict: row.verdict as JudgeVerdict,
        labeled_by_user: userRef(row.labeledBy, emails, SYSTEM_IDS), labeled_at: row.labeledAt.toISOString(),
      };
      labels.set(row.subjectId, [...(labels.get(row.subjectId) ?? []), view]);
    }
    return labels;
  }
}
