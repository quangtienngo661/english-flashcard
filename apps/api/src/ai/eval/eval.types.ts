// Types of the golden set and of eval results (nhóm B design §4, §5.1; contract §2).

export const EVAL_SPLITS = ['dev', 'held_out'] as const;
export type EvalSplit = (typeof EVAL_SPLITS)[number];

export const EXAMPLE_SOURCES = ['manual', 'import', 'report', 'real_judge'] as const;
export type ExampleSource = (typeof EXAMPLE_SOURCES)[number];

export type RuleStatus = 'pass' | 'fail' | 'skipped' | 'not_applicable';

export type RuleResult = {
  status: RuleStatus;
  problems: string[];
  reason: 'not-in-catalog' | 'no-rules' | null;
};

/** One example's call status inside a run; `pending` = not tried yet, `skipped` = the example is gone, `in_progress` = a call is still running. */
export type RunItemStatus = 'pending' | 'succeeded' | 'transient_failure' | 'permanent_failure' | 'unavailable' | 'in_progress' | 'skipped';

export type ExpectedResult = 'pass' | 'fail';
