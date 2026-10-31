import { JUDGE_VERDICTS, type JudgeAnswer, type JudgeCriterion, type JudgeVerdict, type ScoreRow } from './judge.types.js';

const isVerdict = (value: string): value is JudgeVerdict => (JUDGE_VERDICTS as readonly string[]).includes(value);

/**
 * One row per sent criterion, in the order they were sent (design §5.4).
 * No usable answer → every criterion is "không chấm được" with the failure as its problem (B13).
 * A sent code the judge did not answer is `missing`, one it answered twice is `duplicate`; codes that were never sent are ignored (B14).
 */
export function scoresFromOutput(sent: JudgeCriterion[], answer: JudgeAnswer | null, failure: string | null): ScoreRow[] {
  if (answer === null) {
    return sent.map((criterion) => ({ criterion: criterion.code, verdict: null, problem: failure, reason: null }));
  }
  return sent.map(({ code }): ScoreRow => {
    const at = answer.codes.flatMap((answered, index) => (answered === code ? [index] : []));
    if (at.length === 0) return { criterion: code, verdict: null, problem: 'missing', reason: null };
    if (at.length > 1) return { criterion: code, verdict: null, problem: 'duplicate', reason: null };
    const verdict = answer.verdicts[at[0]!];
    if (verdict === undefined || !isVerdict(verdict)) return { criterion: code, verdict: null, problem: 'invalid-verdict', reason: null };
    return { criterion: code, verdict, problem: null, reason: answer.reasons[at[0]!] ?? null };
  });
}
