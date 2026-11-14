import { AI_OPERATION_ORDER, type AiOperation } from '../ai/ai-api';
import type { DashboardJudgeRevision, JudgeScoreGroup, VerdictCounts } from './dashboard-api';

/** The scores that have a verdict; the ones the judge could not score ("không chấm được") are not part of any rate. */
export const scoredOf = (c: VerdictCounts): number => c.pass + c.fail_major + c.fail_minor;

/** Indices `i > 0` where the judge revision differs from the one of the column before: where the chart draws its dashed line (D17). */
export function judgeMarkers(revisions: number[]): number[] {
  return revisions.flatMap((revision, index) => (index > 0 && revision !== revisions[index - 1] ? [index] : []));
}

export type JudgeColumn = JudgeScoreGroup & { revision: number; calibrated: boolean; labeled: number; agree: number };

export type JudgeChart = {
  key: string;
  operation: AiOperation;
  judgeName: string;
  criterion: string;
  columns: JudgeColumn[];
  /** Indices into `columns`. */
  markers: number[];
};

const compare = <T extends string | number>(a: T, b: T): number => (a < b ? -1 : a > b ? 1 : 0);
/** A config number that is not known goes after every known one, as in the API. */
const numberRank = (value: number | null): number => value ?? Number.POSITIVE_INFINITY;

/**
 * One chart per (operation, judge, criterion). Its columns are the groups of every config number, model and source, in the order they were first
 * scored (then by config number), each with the judge revision that scored it and whether that revision agrees with the owner's labels on this
 * criterion. A group whose revision is not among `revisions` is left out: the chart could not say which judge made it.
 */
export function judgeCharts(groups: JudgeScoreGroup[], revisions: DashboardJudgeRevision[]): JudgeChart[] {
  const byId = new Map(revisions.map((revision) => [revision.id, revision]));
  const charts = new Map<string, JudgeChart>();
  for (const group of groups) {
    const revision = byId.get(group.judge_revision_id);
    if (!revision) continue;
    const key = `${group.operation}|${revision.judge_id}|${group.criterion}`;
    const chart = charts.get(key) ?? { key, operation: group.operation, judgeName: revision.judge_name, criterion: group.criterion, columns: [], markers: [] };
    const found = revision.criteria.find((criterion) => criterion.code === group.criterion);
    chart.columns.push({
      ...group, revision: revision.revision, calibrated: found?.calibrated ?? false, labeled: found?.labeled ?? 0, agree: found?.agree ?? 0,
    });
    charts.set(key, chart);
  }
  return [...charts.values()].map((chart) => {
    const columns = [...chart.columns].sort((a, b) =>
      compare(Date.parse(a.first_scored_at), Date.parse(b.first_scored_at)) || compare(numberRank(a.config_number), numberRank(b.config_number)));
    return { ...chart, columns, markers: judgeMarkers(columns.map((column) => column.revision)) };
  }).sort((a, b) =>
    compare(AI_OPERATION_ORDER.indexOf(a.operation), AI_OPERATION_ORDER.indexOf(b.operation)) || compare(a.judgeName, b.judgeName) || compare(a.criterion, b.criterion));
}
