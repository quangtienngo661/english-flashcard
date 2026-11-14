import { AI_OPERATION_ORDER, type AiOperation, type Judge, type JudgeBody, type JudgeCriterion, type SaveJudgeBody } from '../ai-api';
import { fieldOfViolation, fieldOrder, toForm, toPayload, type PromptForm } from '../prompt-form';

export { switchConfigModel as switchJudgeModel } from '../configs/config-form';

/** The five fields of the data a judge call carries (`operations/judge.ts`): an example of a judge is one such input and the answer it should give. */
export const JUDGE_INPUT_FIELDS = ['target_operation', 'input', 'output', 'criteria', 'context'];

/** What the judge editor holds: the prompt form (instructions and examples) plus the judge's own boxes (`max_output_tokens` is a text box's text). */
export type JudgeForm = PromptForm & {
  name: string;
  operations: AiOperation[];
  active: boolean;
  criteria: JudgeCriterion[];
  model_ref: string | null;
  effort: string | null;
  thinking: 'off' | null;
  max_output_tokens: string;
};

export const JUDGE_IDS = {
  name: 'judge-name', operations: 'judge-operations', model: 'judge-model', effort: 'judge-effort', thinking: 'judge-thinking', tokens: 'judge-tokens',
} as const;
export const criterionFieldId = (index: number, part: 'code' | 'question') => `judge-criterion-${index}-${part}`;
/** The API's limit on criteria per judge (`ai.constants.ts` JUDGE_CRITERIA_MAX). */
export const CRITERIA_MAX = 10;

const FIXED_PATHS: Record<string, string> = {
  name: JUDGE_IDS.name, operations: JUDGE_IDS.operations, model_ref: JUDGE_IDS.model, effort: JUDGE_IDS.effort, thinking: JUDGE_IDS.thinking,
  max_output_tokens: JUDGE_IDS.tokens,
};

export const emptyJudgeForm = (): JudgeForm => ({
  name: '', operations: [], active: true, criteria: [{ code: '', question: '' }], instructions: '', examples: [], model_ref: null, effort: null, thinking: null,
  max_output_tokens: '',
});

/** The newest revision of the judge in the boxes (a judge is its newest revision, E4). */
export function toJudgeForm(judge: Judge): JudgeForm {
  const { latest } = judge;
  return {
    ...toForm(latest, JUDGE_INPUT_FIELDS),
    name: judge.name,
    operations: [...judge.operations],
    active: judge.active,
    criteria: latest.criteria.map((criterion) => ({ ...criterion })),
    model_ref: latest.model?.id ?? null,
    effort: latest.effort,
    thinking: latest.thinking,
    max_output_tokens: latest.max_output_tokens === null ? '' : String(latest.max_output_tokens),
  };
}

/** Operations in the order of the copy deck, whatever order they were ticked in. */
export const sortedOperations = (operations: AiOperation[]): AiOperation[] =>
  [...operations].sort((a, b) => AI_OPERATION_ORDER.indexOf(a) - AI_OPERATION_ORDER.indexOf(b));

/**
 * The `POST` body, or with `expectedRevision` (the revision the page showed) the `PUT` body; or the positions whose example output is not a JSON
 * object (nothing is sent then). Texts are trimmed, an empty limit is `null`.
 */
export function toJudgeBody(form: JudgeForm, expectedRevision?: number): { ok: true; body: JudgeBody | SaveJudgeBody } | { ok: false; badOutputs: number[] } {
  const payload = toPayload(form);
  if (!payload.ok) return payload;
  const tokens = form.max_output_tokens.trim();
  const body: JudgeBody = {
    name: form.name.trim(),
    operations: form.operations,
    active: form.active,
    criteria: form.criteria.map((criterion) => ({ code: criterion.code.trim(), question: criterion.question.trim() })),
    instructions: payload.body.instructions,
    examples: payload.body.examples,
    model_ref: form.model_ref,
    effort: form.effort,
    thinking: form.thinking,
    max_output_tokens: tokens === '' ? null : Number(tokens),
  };
  return { ok: true, body: expectedRevision === undefined ? body : { ...body, expected_revision: expectedRevision } };
}

export const sameJudgeForm = (a: JudgeForm, b: JudgeForm): boolean => JSON.stringify(a) === JSON.stringify(b);

/** The box a 400 violation path points at, or null for a path with no box of its own. */
export function judgeFieldOfViolation(path: string, form: JudgeForm): string | null {
  if (path in FIXED_PATHS) return FIXED_PATHS[path]!;
  if (path.startsWith('operations.')) return JUDGE_IDS.operations;
  if (path === 'criteria') return criterionFieldId(0, 'code');
  const criterion = /^criteria\.(\d+)\.(code|question)$/.exec(path);
  if (criterion) return Number(criterion[1]) < form.criteria.length ? criterionFieldId(Number(criterion[1]), criterion[2] as 'code' | 'question') : null;
  return fieldOfViolation(path, form);
}

/** Field ids in screen order, for `useFocusFirstError`. */
export function judgeFieldOrder(form: JudgeForm): string[] {
  return [
    JUDGE_IDS.name, JUDGE_IDS.operations,
    ...form.criteria.flatMap((_, index) => [criterionFieldId(index, 'code'), criterionFieldId(index, 'question')]),
    JUDGE_IDS.model, JUDGE_IDS.effort, JUDGE_IDS.thinking, JUDGE_IDS.tokens,
    ...fieldOrder(form),
  ];
}
