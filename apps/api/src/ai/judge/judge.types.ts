// Types shared by the judge module and its callers (nhóm B design §5; contract §2).
import type { UserRef } from '../../common/user-ref.js';
import type { AiOperation } from '../ai.types.js';

export const JUDGE_VERDICTS = ['pass', 'fail_major', 'fail_minor'] as const;
export type JudgeVerdict = (typeof JUDGE_VERDICTS)[number];

/** One question a judge answers about an output; `code` is what the judge's answer is keyed by. */
export type JudgeCriterion = { code: string; question: string };

/** An output handed to a judge. `context` carries what only some subjects have (the session's words for a real question). */
export type JudgeSubject = {
  subjectId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  context: { session_words: string[] } | null;
};

export const SUBJECT_KINDS = ['eval_item', 'real_question'] as const;
export type SubjectKind = (typeof SUBJECT_KINDS)[number];

export type JudgePassKind = 'eval_run' | 'real';
export type JudgePassStatus = 'queued' | 'running' | 'finished' | 'failed';

/** One label as the API shows it; `verdict` null is the answer to taking a label back. */
export type LabelView = {
  subject_kind: SubjectKind; subject_id: string; criterion: string; verdict: JudgeVerdict | null; labeled_by_user: UserRef | null; labeled_at: string | null;
};

/** What the gateway returns for the `judge` operation: parallel arrays, one entry per answered criterion. */
export type JudgeAnswer = { codes: string[]; verdicts: string[]; reasons: string[] };

/** One judged criterion of one subject. `verdict` null means "không chấm được", with `problem` saying why. */
export type ScoreRow = { criterion: string; verdict: JudgeVerdict | null; problem: string | null; reason: string | null };

export type JudgeTally = { pass: number; fail_major: number; fail_minor: number; unjudged: number };

/** The request the gateway builds for one judge call. */
export type JudgeData = {
  target_operation: AiOperation;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  criteria: JudgeCriterion[];
  context: { session_words: string[] } | null;
};
