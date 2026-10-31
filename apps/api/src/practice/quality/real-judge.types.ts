// Types and request schemas of the real-question judge (nhóm B M4, design §7.1).
import { z } from 'zod';
import type { RealPassItem, RealPassView } from '../../ai/index.js';
import type { UserRef } from '../../common/user-ref.js';
import { PRACTICE_AI_OPERATIONS, type PracticeAiOperation } from './real-questions.js';

/** The pair (config number, model id) a question was made with: the number is `ai_meta.prompt_revision`, the config number since M2 (design §6.5). */
export type ConfigPair = { number: number; model: string };

/** What the admin picked: one operation, optionally one config pair, optionally only test accounts (D26). */
export type RealJudgeFilters = {
  judge_id: string;
  operation: PracticeAiOperation;
  config: ConfigPair | null;
  test_accounts_only: boolean;
};

const judgeId = z.uuid().transform((value) => value.toLowerCase());
const configPair = z.strictObject({ number: z.number().int().min(0), model: z.string().min(1).max(200) });

/** Body of `POST /v1/admin/practice/real-judge`. */
export const realJudgeBodySchema = z.strictObject({
  judge_id: judgeId,
  operation: z.enum(PRACTICE_AI_OPERATIONS),
  config: configPair.nullable().optional(),
  test_accounts_only: z.boolean().optional(),
}).transform((body): RealJudgeFilters => ({
  judge_id: body.judge_id, operation: body.operation, config: body.config ?? null, test_accounts_only: body.test_accounts_only ?? false,
}));

/** Query of `GET /v1/admin/practice/real-judge/estimate`: the config pair is two parameters, both or neither. */
export const realJudgeQuerySchema = z.strictObject({
  judge_id: judgeId,
  operation: z.enum(PRACTICE_AI_OPERATIONS),
  config_number: z.string().regex(/^\d{1,9}$/).transform(Number).optional(),
  model: z.string().min(1).max(200).optional(),
  test_accounts_only: z.enum(['true', 'false']).default('false'),
}).superRefine((query, ctx) => {
  if ((query.config_number === undefined) !== (query.model === undefined)) {
    ctx.addIssue({ code: 'custom', path: [query.config_number === undefined ? 'config_number' : 'model'], message: 'config_number and model go together' });
  }
}).transform((query): RealJudgeFilters => ({
  judge_id: query.judge_id, operation: query.operation,
  config: query.config_number === undefined || query.model === undefined ? null : { number: query.config_number, model: query.model },
  test_accounts_only: query.test_accounts_only === 'true',
}));

/** How many questions of the window were left out and why. */
export type Skipped = { private_word: number; no_content: number; already_judged: number };

export type RealJudgeEstimate = {
  judge_revision: number;
  selected: number;
  remaining: number;
  limit: number;
  skipped: Skipped;
  estimate_usd: number | null;
  admin_usd_cap: number | null;
  reason: 'retention-off' | 'no-staff' | null;
  retention_days: number;
  pairs: Array<{ config_number: number | null; model: string; questions: number }>;
};

/** Query of `GET …/real-judge/passes`. */
export const realPassesQuerySchema = z.strictObject({
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  page_token: z.string().optional(),
});

export type RealPassWithStarter = RealPassView & { started_by_user: UserRef };

/**
 * One question of a pass as the admin sees it. The scores and the snapshot are the pass's own; `created_at` and the config pair come from the
 * question while it still exists. No learner id anywhere (D3, R6). `can_add_to_examples` = it failed and its question row is still there.
 */
export type RealPassItemView = Omit<RealPassItem, 'subject_id'> & {
  question_id: string;
  created_at: string | null;
  config_number: number | null;
  model: string | null;
  provider: string | null;
  failed: boolean;
  can_add_to_examples: boolean;
};

/** The report or the question an example is made from: exactly one of the two ids. */
export type SourceRef = { report_id: string } | { question_id: string };

/** What the dialog shows before anything is added. `input` is null when it has to be rebuilt; `expected` is the machine's guess for the person to correct. */
export type SourcePreview = {
  operation: PracticeAiOperation;
  source: 'report' | 'real_judge';
  source_ref: string;
  word: string;
  part_of_speech: string;
  input: Record<string, unknown> | null;
  rebuilt: boolean;
  expected: { forms: string[] } | null;
};

const lowerUuid = z.uuid().transform((value) => value.toLowerCase());
const exactlyOne = (value: { report_id?: string; question_id?: string }) => (value.report_id === undefined) !== (value.question_id === undefined);
const oneIdIssue = { message: 'send exactly one of report_id and question_id', path: ['report_id'] };
const refOf = (value: { report_id?: string; question_id?: string }): SourceRef => (value.report_id !== undefined ? { report_id: value.report_id } : { question_id: value.question_id! });

/** Query of `GET …/eval-examples/from-source`. */
export const sourceQuerySchema = z.strictObject({ report_id: lowerUuid.optional(), question_id: lowerUuid.optional() })
  .refine(exactlyOne, oneIdIssue).transform(refOf);

/** Body of `POST …/eval-examples/from-source`: the machine's expected answer, as the person corrected it, and a note. */
export const addFromSourceBodySchema = z.strictObject({
  report_id: lowerUuid.optional(),
  question_id: lowerUuid.optional(),
  expected: z.record(z.string(), z.unknown()).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
}).refine(exactlyOne, oneIdIssue).transform((body) => ({
  ...refOf(body), expected: body.expected ?? null, note: body.note === undefined || body.note === '' ? null : body.note,
}));
export type AddFromSourceBody = z.output<typeof addFromSourceBodySchema>;
