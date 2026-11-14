import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import type { AiOperation } from '../ai.types.js';
import type { JudgeCriterion, JudgeVerdict } from './judge.types.js';

/** The judge a real-question pass would use now: the judge, and the newest revision that a pass would run. */
export type RealJudgeTarget = {
  judgeId: string; name: string; operations: AiOperation[]; active: boolean; revisionId: string; revision: number;
};

/** A pass of `kind: 'real'` as the admin lists it. `total` is never null: a real pass takes its snapshot when it is made (M3-T8). */
export type RealPassView = {
  id: string;
  judge: { id: string; name: string };
  revision: number;
  revision_id: string;
  criteria: JudgeCriterion[];
  judge_model: { provider: string; model_id: string } | null;
  status: 'queued' | 'running' | 'finished' | 'failed';
  error: string | null;
  total: number;
  judged: number;
  cost_usd: string | null;
  filters: Record<string, unknown>;
  started_by: string;
  created_at: string;
  finished_at: string | null;
};

/** One snapshot item of a pass, with what the judge answered and what the admin labelled; scores follow the order of the revision's criteria. */
export type RealPassItem = {
  subject_id: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  context: { session_words: string[] } | null;
  scores: Array<{ criterion: string; verdict: JudgeVerdict | null; problem: string | null; reason: string | null }>;
  labels: Array<{ criterion: string; verdict: JudgeVerdict }>;
};

type PassRecord = {
  id: string; kind: string; status: string; error: string | null; total: number | null; judged: number; filters: unknown; startedBy: string;
  judgeRevisionId: string; costUsd: { toFixed(digits: number): string } | null; createdAt: Date; finishedAt: Date | null;
  revision: {
    id: string; revision: number; criteria: unknown; judge: { id: string; name: string }; model: { provider: string; modelId: string } | null;
  };
};

const cursorSchema = z.strictObject({ created_at: z.iso.datetime(), id: z.string() });
const BINDING = createHash('sha256').update(JSON.stringify({ route: 'ai-real-judge-passes' })).digest('hex');
const invalid = (violations: string[]) => new ProblemDetailsException({
  status: 400, type: 'validation-failed', title: 'Validation failed', extensions: { violations },
});

function viewOf(row: PassRecord): RealPassView {
  return {
    id: row.id, judge: { id: row.revision.judge.id, name: row.revision.judge.name }, revision: row.revision.revision, revision_id: row.revision.id,
    criteria: row.revision.criteria as JudgeCriterion[],
    judge_model: row.revision.model ? { provider: row.revision.model.provider, model_id: row.revision.model.modelId } : null,
    status: row.status as RealPassView['status'], error: row.error, total: row.total ?? 0, judged: row.judged, cost_usd: row.costUsd?.toFixed(8) ?? null,
    filters: (row.filters ?? {}) as Record<string, unknown>, started_by: row.startedBy, created_at: row.createdAt.toISOString(),
    finished_at: row.finishedAt?.toISOString() ?? null,
  };
}

/**
 * What Practice reads about judge passes over real questions (nhóm B M4, design §7.1): the judge it would start, the average cost of a
 * judged subject, the passes and one pass's items with their scores and labels. It reads only the judge tables (D3, R8).
 */
@Injectable()
export class RealPassesReader {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /** The judge and its newest revision; null for an unknown judge or one with no revision. */
  async target(judgeId: string): Promise<RealJudgeTarget | null> {
    const judge = await this.prisma.aiJudge.findUnique({ where: { id: judgeId } });
    if (!judge) return null;
    const revision = await this.prisma.aiJudgeRevision.findFirst({ where: { judgeId }, orderBy: { revision: 'desc' }, select: { id: true, revision: true } });
    if (!revision) return null;
    return {
      judgeId: judge.id, name: judge.name, operations: judge.operations as AiOperation[], active: judge.active, revisionId: revision.id, revision: revision.revision,
    };
  }

  /** What one judged subject cost on average over every pass of this revision that judged something and has a cost; null when no pass does. */
  async costPerSubject(revisionId: string): Promise<number | null> {
    const { _sum } = await this.prisma.aiJudgePass.aggregate({
      where: { judgeRevisionId: revisionId, judged: { gt: 0 }, costUsd: { not: null } }, _sum: { costUsd: true, judged: true },
    });
    if (_sum.costUsd === null || _sum.costUsd === undefined || !_sum.judged) return null;
    return new Prisma.Decimal(_sum.costUsd).div(_sum.judged).toNumber();
  }

  /** Real passes, newest first. A token this listing did not make is a 400, as the eval run list. */
  async passes(pageSize: number, pageToken?: string): Promise<{ items: RealPassView[]; next_page_token: string | null }> {
    let cursor: z.infer<typeof cursorSchema> | undefined;
    if (pageToken !== undefined) {
      const parsed = cursorSchema.safeParse(decodeBoundToken(pageToken, BINDING));
      if (!parsed.success) throw invalid(['page_token: Invalid page token']);
      cursor = parsed.data;
    }
    const rows = await this.prisma.aiJudgePass.findMany({
      where: {
        kind: 'real',
        ...(cursor ? { OR: [
          { createdAt: { lt: new Date(cursor.created_at) } },
          { createdAt: new Date(cursor.created_at), id: { lt: cursor.id } },
        ] } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: pageSize + 1,
      include: { revision: { include: { judge: true, model: true } } },
    }) as unknown as PassRecord[];
    const page = rows.slice(0, pageSize);
    const last = page.at(-1);
    return {
      items: page.map(viewOf),
      next_page_token: rows.length > pageSize && last ? encodeBoundToken({ created_at: last.createdAt.toISOString(), id: last.id }, BINDING) : null,
    };
  }

  /** One real pass with its items by position; null for an unknown pass or one made for an eval run. */
  async pass(passId: string): Promise<{ pass: RealPassView; items: RealPassItem[] } | null> {
    const row = await this.prisma.aiJudgePass.findUnique({
      where: { id: passId }, include: { revision: { include: { judge: true, model: true } } },
    }) as unknown as PassRecord | null;
    if (!row || row.kind !== 'real') return null;
    const pass = viewOf(row);
    const items = await this.prisma.aiJudgePassItem.findMany({ where: { passId }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
    if (items.length === 0) return { pass, items: [] };
    const subjectIds = items.map((item) => item.subjectId);
    const [scores, labels] = await Promise.all([
      this.prisma.aiJudgeScore.findMany({
        where: { judgeRevisionId: row.judgeRevisionId, subjectKind: 'real_question', subjectId: { in: subjectIds } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.aiLabel.findMany({
        where: { subjectKind: 'real_question', subjectId: { in: subjectIds } }, orderBy: [{ labeledAt: 'asc' }, { id: 'asc' }],
      }),
    ]);
    const rank = new Map(pass.criteria.map((criterion, index) => [criterion.code, index]));
    const byRank = (a: { criterion: string }, b: { criterion: string }) => (rank.get(a.criterion) ?? rank.size) - (rank.get(b.criterion) ?? rank.size);
    return {
      pass,
      items: items.map((item) => ({
        subject_id: item.subjectId, input: item.input as Record<string, unknown>, output: item.output as Record<string, unknown>,
        context: item.context as { session_words: string[] } | null,
        scores: scores.filter((score) => score.subjectId === item.subjectId).map((score) => ({
          criterion: score.criterion, verdict: score.verdict as JudgeVerdict | null, problem: score.problem, reason: score.reason,
        })).sort(byRank),
        labels: labels.filter((label) => label.subjectId === item.subjectId).map((label) => ({
          criterion: label.criterion, verdict: label.verdict as JudgeVerdict,
        })).sort(byRank),
      })),
    };
  }
}
