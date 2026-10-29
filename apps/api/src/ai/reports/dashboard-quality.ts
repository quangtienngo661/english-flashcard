// Pure parts of the dashboard's quality blocks (nhóm B design §8, M5): verdict counts and the shapes the admin reads.
import type { Agreement } from '../judge/agreement.js';
import type { JudgeVerdict } from '../judge/judge.types.js';

/** How many scores got each verdict; a score with no verdict ("không chấm được") is `unscored`. */
export type VerdictCounts = { pass: number; fail_major: number; fail_minor: number; unscored: number };

export function countVerdicts(rows: Array<{ verdict: JudgeVerdict | null; n: number }>): VerdictCounts {
  const counts: VerdictCounts = { pass: 0, fail_major: 0, fail_minor: 0, unscored: 0 };
  for (const { verdict, n } of rows) counts[verdict === null ? 'unscored' : verdict] += n;
  return counts;
}

/**
 * One saved revision of a judge that has scored something, with how well each of its criteria agrees with the owner's labels. The numbers are
 * `JudgeAgreement`'s; the dashboard has no calibration rule of its own (D15).
 */
export type DashboardJudgeRevision = {
  id: string;
  judge_id: string;
  judge_name: string;
  revision: number;
  saved_at: string;
  criteria: Array<{ code: string } & Pick<Agreement, 'labeled' | 'agree' | 'calibrated'>>;
};
