import type { Tally } from '../configs/configs.types.js';
import type { EvalSplit } from '../eval/eval.types.js';
import type { Agreement } from './agreement.js';
import type { JudgeTally, JudgeVerdict } from './judge.types.js';

/** One judge score of one run item, with the item's split (what the run stats are built from). */
export type RunJudgeScore = {
  itemId: string;
  split: EvalSplit;
  judgeId: string;
  judgeName: string;
  judgeRevisionId: string;
  revision: number;
  criterion: string;
  verdict: JudgeVerdict | null;
  problem: string | null;
  reason: string | null;
};

type SplitTallies = { dev: JudgeTally; held_out: JudgeTally };
type RevisionKey = { judge_id: string; judge_name: string; judge_revision_id: string; revision: number };

export type JudgeStatsRow = RevisionKey & { criterion: string; dev: JudgeTally; held_out: JudgeTally; calibrated: boolean };

export type JudgeComparisonRow = RevisionKey & { criterion: string; a: SplitTallies; b: SplitTallies };
export type JudgeUnmatched = RevisionKey & { scored: 'a' | 'b' };

export function judgeTally(verdicts: Array<JudgeVerdict | null>): JudgeTally {
  const tally: JudgeTally = { pass: 0, fail_major: 0, fail_minor: 0, unjudged: 0 };
  for (const verdict of verdicts) {
    if (verdict === null) tally.unjudged += 1;
    else tally[verdict] += 1;
  }
  return tally;
}

/** What the publish gate counts: only what was judged; "không chấm được" is not counted either way. */
export function gateTally(tally: JudgeTally): Tally {
  return { passed: tally.pass, counted: tally.pass + tally.fail_major + tally.fail_minor };
}

const keyOf = (score: RunJudgeScore): RevisionKey => ({
  judge_id: score.judgeId, judge_name: score.judgeName, judge_revision_id: score.judgeRevisionId, revision: score.revision,
});

const byRevision = (a: RevisionKey, b: RevisionKey): number => {
  if (a.judge_name !== b.judge_name) return a.judge_name < b.judge_name ? -1 : 1;
  if (a.revision !== b.revision) return b.revision - a.revision;
  return a.judge_revision_id < b.judge_revision_id ? -1 : a.judge_revision_id > b.judge_revision_id ? 1 : 0;
};

const byCriterion = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function splitTallies(scores: RunJudgeScore[]): SplitTallies {
  return {
    dev: judgeTally(scores.filter((score) => score.split === 'dev').map((score) => score.verdict)),
    held_out: judgeTally(scores.filter((score) => score.split === 'held_out').map((score) => score.verdict)),
  };
}

/** The scores of one run grouped by judge revision, then by criterion. */
function groupByRevision(scores: RunJudgeScore[]): Map<string, { key: RevisionKey; criteria: Map<string, RunJudgeScore[]> }> {
  const groups = new Map<string, { key: RevisionKey; criteria: Map<string, RunJudgeScore[]> }>();
  for (const score of scores) {
    const group = groups.get(score.judgeRevisionId) ?? { key: keyOf(score), criteria: new Map<string, RunJudgeScore[]>() };
    group.criteria.set(score.criterion, [...(group.criteria.get(score.criterion) ?? []), score]);
    groups.set(score.judgeRevisionId, group);
  }
  return groups;
}

/**
 * One row per judge revision and criterion; dev and held-out apart (held-out only ever as a tally, B3). `calibration` is keyed
 * `${judgeRevisionId}|${criterion}`; a key that is missing is not calibrated.
 */
export function judgeStatsRows(scores: RunJudgeScore[], calibration: ReadonlyMap<string, Agreement>): JudgeStatsRow[] {
  const rows: JudgeStatsRow[] = [];
  for (const { key, criteria } of groupByRevision(scores).values()) {
    for (const [criterion, group] of criteria) {
      rows.push({
        ...key, criterion, ...splitTallies(group), calibrated: calibration.get(`${key.judge_revision_id}|${criterion}`)?.calibrated ?? false,
      });
    }
  }
  return rows.sort((x, y) => byRevision(x, y) || byCriterion(x.criterion, y.criterion));
}

/** Compares two runs through the judge revisions that scored both (B11); the others are listed apart as unmatched. */
export function judgeComparison(a: RunJudgeScore[], b: RunJudgeScore[]): { judge: JudgeComparisonRow[]; judge_unmatched: JudgeUnmatched[] } {
  const groupsA = groupByRevision(a);
  const groupsB = groupByRevision(b);
  const judge: JudgeComparisonRow[] = [];
  const unmatched: JudgeUnmatched[] = [];
  for (const [id, groupA] of groupsA) {
    const groupB = groupsB.get(id);
    if (!groupB) { unmatched.push({ ...groupA.key, scored: 'a' }); continue; }
    for (const criterion of new Set([...groupA.criteria.keys(), ...groupB.criteria.keys()])) {
      judge.push({
        ...groupA.key, criterion, a: splitTallies(groupA.criteria.get(criterion) ?? []), b: splitTallies(groupB.criteria.get(criterion) ?? []),
      });
    }
  }
  for (const [id, groupB] of groupsB) if (!groupsA.has(id)) unmatched.push({ ...groupB.key, scored: 'b' });
  return {
    judge: judge.sort((x, y) => byRevision(x, y) || byCriterion(x.criterion, y.criterion)),
    judge_unmatched: unmatched.sort((x, y) => byRevision(x, y) || byCriterion(x.scored, y.scored)),
  };
}
