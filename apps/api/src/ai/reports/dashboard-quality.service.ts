import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { EvalSetsService } from '../eval/eval-sets.service.js';
import { JudgeAgreement } from '../judge/agreement.service.js';
import type { JudgeCriterion } from '../judge/judge.types.js';
import type { DashboardJudgeRevision } from './dashboard-quality.js';

type RevisionRow = { id: string; judge_id: string; judge_name: string; revision: number; saved_at: Date; criteria: unknown };

/**
 * What the AI dashboard says about quality (nhóm B design §8, M5): the latest eval of each live config, the judge's scores grouped by
 * config and model, and how far each judge revision is calibrated. Read only from the `ai` tables, as totals: no example, item, question or
 * learner id leaves here (R7).
 */
@Injectable()
export class DashboardQualityService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(EvalSetsService) private readonly sets: EvalSetsService,
    @Inject(JudgeAgreement) private readonly agreement: JudgeAgreement,
  ) {}

  /** Every judge revision that has scored anything (eval or real), judge name then revision, each criterion with its agreement. */
  async judgeRevisions(): Promise<DashboardJudgeRevision[]> {
    const rows = await this.prisma.$queryRaw<RevisionRow[]>(Prisma.sql`
      SELECT r.id::text AS id, r.judge_id::text AS judge_id, j.name AS judge_name, r.revision, r.saved_at, r.criteria
      FROM ai_judge_revisions r JOIN ai_judges j ON j.id = r.judge_id
      WHERE EXISTS (SELECT 1 FROM ai_judge_scores s WHERE s.judge_revision_id = r.id)
      ORDER BY j.name, r.revision`);
    if (rows.length === 0) return [];
    const measured = await this.agreement.forRevisions(rows.map((row) => row.id));
    return rows.map((row) => ({
      id: row.id, judge_id: row.judge_id, judge_name: row.judge_name, revision: row.revision, saved_at: row.saved_at.toISOString(),
      criteria: (row.criteria as JudgeCriterion[]).map(({ code }) => {
        const found = measured.get(`${row.id}|${code}`);
        return { code, labeled: found?.labeled ?? 0, agree: found?.agree ?? 0, calibrated: found?.calibrated ?? false };
      }),
    }));
  }
}
