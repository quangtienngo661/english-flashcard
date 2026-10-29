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
