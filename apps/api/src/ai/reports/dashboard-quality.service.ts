import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { AI_OPERATIONS } from '../ai.types.js';
import type { EvalSplit, ExpectedResult, RuleResult, RunItemStatus } from '../eval/eval.types.js';
import { EvalSetsService } from '../eval/eval-sets.service.js';
import { isComplete, runStats, type RunItemResult } from '../eval/run-stats.js';
import { JudgeAgreement } from '../judge/agreement.service.js';
import type { JudgeCriterion, JudgeVerdict } from '../judge/judge.types.js';
import { countVerdicts, type DashboardJudgeRevision, type LatestEvalView, type VerdictCounts } from './dashboard-quality.js';

type RevisionRow = { id: string; judge_id: string; judge_name: string; revision: number; saved_at: Date; criteria: unknown };
type RunJudgeRow = { judge_revision_id: string; criterion: string; split: EvalSplit; verdict: JudgeVerdict | null; n: number };

/** How many finished runs of the live config are looked through for one that is complete. */
const CANDIDATE_RUNS = 20;

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

  /**
   * One entry per operation, in `AI_OPERATIONS` order: its newest frozen set, its live config and the latest complete eval of that config on
   * that set (design §8.2). A run of the live config made while it was still a draft has an older `config_version` and is not "the live
   * config's" run; a run deleted while it held labels is hidden (Review focus 1, 2).
   */
  async latestEvals(): Promise<LatestEvalView[]> {
    const [liveRows, sets] = await Promise.all([
      this.prisma.aiLiveConfig.findMany({ include: { config: { include: { model: true } } } }),
      Promise.all(AI_OPERATIONS.map((operation) => this.sets.latest(operation))),
    ]);
    return Promise.all(AI_OPERATIONS.map(async (operation, index) => {
      const set = sets[index];
      const row = liveRows.find((item) => item.operation === operation);
      const live = row ? { config_id: row.configId, number: row.config.number, model: row.config.model?.modelId ?? null } : null;
      const run = set && row ? await this.completeRun(row.configId, row.config.version, set.id) : null;
      return { operation, set, live, run };
    }));
  }

  /** The newest complete run ("xong trọn") of the config at that version on that set, with its judge counts; null when none is complete. */
  private async completeRun(configId: string, configVersion: number, setId: string): Promise<LatestEvalView['run']> {
    const runs = await this.prisma.aiEvalRun.findMany({
      where: { configId, configVersion, setId, status: 'finished', hiddenAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: CANDIDATE_RUNS, select: { id: true, createdAt: true, model: true },
    });
    for (const run of runs) {
      const rows = await this.prisma.aiEvalRunItem.findMany({ where: { runId: run.id }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
      const items: RunItemResult[] = rows.map((row) => ({
        exampleId: row.exampleId, position: row.position, split: row.split as EvalSplit, status: row.status as RunItemStatus,
        rule: row.rule as RuleResult | null, expectedResult: row.expectedResult as ExpectedResult | null,
      }));
      if (!isComplete('finished', items)) continue;
      return { id: run.id, created_at: run.createdAt.toISOString(), model: run.model, stats: runStats(items), judge: await this.runJudgeCounts(run.id) };
    }
    return null;
  }

  /** The verdicts the judge gave the outputs of one run, by judge revision, criterion and split (counts only: the held-out reasons stay hidden, R7). */
  private async runJudgeCounts(runId: string): Promise<NonNullable<LatestEvalView['run']>['judge']> {
    const rows = await this.prisma.$queryRaw<RunJudgeRow[]>(Prisma.sql`
      SELECT s.judge_revision_id::text AS judge_revision_id, s.criterion, i.split, s.verdict, count(*)::int AS n
      FROM ai_judge_scores s JOIN ai_eval_run_items i ON i.id = s.subject_id
      WHERE s.subject_kind = 'eval_item' AND i.run_id = ${runId}::uuid AND NOT i.hidden
      GROUP BY 1, 2, 3, 4 ORDER BY 1, 2, 3, 4`);
    const groups = new Map<string, { judge_revision_id: string; criterion: string; rows: Record<EvalSplit, RunJudgeRow[]> }>();
    for (const row of rows) {
      const key = `${row.judge_revision_id}|${row.criterion}`;
      const group = groups.get(key) ?? { judge_revision_id: row.judge_revision_id, criterion: row.criterion, rows: { dev: [], held_out: [] } };
      group.rows[row.split].push(row);
      groups.set(key, group);
    }
    const counts = (list: RunJudgeRow[]): VerdictCounts => countVerdicts(list.map(({ verdict, n }) => ({ verdict, n })));
    return [...groups.values()].map((group) => ({
      judge_revision_id: group.judge_revision_id, criterion: group.criterion, dev: counts(group.rows.dev), held_out: counts(group.rows.held_out),
    }));
  }

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
