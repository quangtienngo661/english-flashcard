// Pure rules that turn the judge's scores of real AI questions into the dashboard's totals (nhóm B M5, design §8.3, §8.4).
import { AI_OPERATIONS, countVerdicts, type AiOperation, type JudgeScoreGroup, type RealJudgeScore, type VerdictCounts } from '../../ai/index.js';

/** A score of a real question with what Practice knows of the question's AI call (`ai_meta`): the operation, the config number and the model. */
export type ScoredQuestion = RealJudgeScore & { operation: AiOperation; configNumber: number | null; model: string | null };

/** The latest finished pass of one operation: one row per criterion of that pass, counts over its scores of that operation. */
export type RealLatestRow = {
  operation: AiOperation;
  pass_id: string;
  judge_revision_id: string;
  criterion: string;
  counts: VerdictCounts;
  scored_at: string;
};

const compare = <T extends string | number>(a: T, b: T): number => (a < b ? -1 : a > b ? 1 : 0);
/** A number that is not known goes after every known one. */
const numberRank = (value: number | null): number => value ?? Number.POSITIVE_INFINITY;
const count = (rows: ScoredQuestion[]): VerdictCounts => countVerdicts(rows.map(({ verdict }) => ({ verdict, n: 1 })));
const newest = (rows: ScoredQuestion[]): number => rows.reduce((at, row) => Math.max(at, row.scoredAt.getTime()), Number.NEGATIVE_INFINITY);
const oldest = (rows: ScoredQuestion[]): number => rows.reduce((at, row) => Math.min(at, row.scoredAt.getTime()), Number.POSITIVE_INFINITY);

/** Groups rows by a key, keeping the order in which each key first appears. */
function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const name = key(row);
    const list = groups.get(name);
    if (list) list.push(row);
    else groups.set(name, [row]);
  }
  return groups;
}

/**
 * Real-question scores grouped by operation, (config number, model), judge revision and criterion (R12: never by number alone). A group counts the
 * scores of every pass, finished or not; `first_scored_at` is its oldest score. Ordered by that, then by number (an unknown number last).
 */
export function realScoreGroups(rows: ScoredQuestion[]): JudgeScoreGroup[] {
  const groups = [...groupBy(rows, (row) => JSON.stringify([row.operation, row.configNumber, row.model, row.judgeRevisionId, row.criterion])).values()];
  return groups.map((group) => ({
    operation: group[0].operation, source: 'real' as const, config_number: group[0].configNumber, model: group[0].model,
    judge_revision_id: group[0].judgeRevisionId, criterion: group[0].criterion, counts: count(group),
    first_scored_at: new Date(oldest(group)).toISOString(),
  })).sort((a, b) => compare(a.first_scored_at, b.first_scored_at) || compare(numberRank(a.config_number), numberRank(b.config_number))
    || compare(a.operation, b.operation) || compare(a.model ?? '', b.model ?? '') || compare(a.judge_revision_id, b.judge_revision_id)
    || compare(a.criterion, b.criterion));
}

/**
 * Per operation, the finished pass whose newest score of that operation is newest (a pass still running is not a "latest pass"; a tie goes to
 * the greater pass id, so the answer does not depend on the order of the rows). One row per criterion of that pass, with the counts over that
 * pass's scores of the operation and the time of the newest of them. Operations in `AI_OPERATIONS` order.
 */
export function latestRealPasses(rows: ScoredQuestion[]): RealLatestRow[] {
  return AI_OPERATIONS.flatMap((operation) => {
    const finished = rows.filter((row) => row.operation === operation && row.passFinished);
    const passes = [...groupBy(finished, (row) => row.passId).entries()]
      .map(([passId, own]) => ({ passId, own, at: newest(own) }))
      .sort((a, b) => b.at - a.at || compare(b.passId, a.passId));
    const latest = passes[0];
    if (!latest) return [];
    return [...groupBy(latest.own, (row) => JSON.stringify([row.judgeRevisionId, row.criterion])).values()].map((group) => ({
      operation, pass_id: latest.passId, judge_revision_id: group[0].judgeRevisionId, criterion: group[0].criterion, counts: count(group),
      scored_at: new Date(newest(group)).toISOString(),
    }));
  });
}
