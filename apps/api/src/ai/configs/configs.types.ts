// Types of the config lifecycle (nhóm B design §6; contract §2).
import type { UserRef } from '../../common/user-ref.js';
import type { AiOperation, AiProviderName } from '../ai.types.js';
import type { PromptExample } from '../prompts/prompt-rules.js';
import type { CostEstimate } from '../runner/cost.js';

export const CONFIG_STATUSES = ['draft', 'published', 'retired'] as const;
export type ConfigStatus = (typeof CONFIG_STATUSES)[number];

/** Items of a run that passed, out of the items that were judged (a criterion nothing judged has `counted: 0`). */
export type Tally = { passed: number; counted: number };

/** What a publish warns about (design §6.3 step 3). */
export type PublishWarning =
  | { code: 'rate-drop'; criterion: 'shape' | 'rule' | 'expected'; before: Tally; after: Tally }
  // A judge criterion judged by the same revision in both runs (nhóm B M3): `before` is the baseline, `after` the candidate.
  | { code: 'judge-rate-drop'; judge_id: string; judge_name: string; judge_revision_id: string; revision: number; criterion: string; before: Tally; after: Tally }
  | { code: 'dev-regressed'; example_ids: string[] }
  | { code: 'held-out-failures-up'; before: number; after: number };

/** Latest quick-test/eval execution of a draft. `id` is the batch ID; `source_id` is the eval run ID, when present. */
export type ConfigLastRun = {
  id: string; config_id: string; kind: 'test' | 'eval'; status: string; config_version: number | null;
  fingerprint: string | null; source_id: string | null; model: string; provider: string; total: number;
  created_at: string; started_at: string | null; finished_at: string | null;
};

/** One config as the admin API shows it (design §4, §6.1). */
export type ConfigView = {
  id: string;
  name: string | null;
  fingerprint: string;
  updated_at: string;
  operation: AiOperation;
  number: number;
  version: number;
  status: ConfigStatus;
  instructions: string;
  examples: PromptExample[];
  model: { id: string; provider: AiProviderName; model_id: string } | null;
  effort: string | null;
  thinking: 'off' | null;
  max_output_tokens: number | null;
  note: string | null;
  created_from: string | null;
  created_by_user: UserRef;
  created_at: string;
  published_by_user: UserRef | null;
  published_at: string | null;
  estimate: CostEstimate | null;
  last_run?: ConfigLastRun | null;
};

/** `GET /v1/admin/ai/configs/{op}`: what runs now, the draft being prepared and the config before the live one (the rollback target). */
export type ConfigsView = {
  operation: AiOperation;
  input_fields: string[];
  guard: string;
  live_version: number;
  live: ConfigView;
  draft: ConfigView | null;
  draft_count: number;
  previous: ConfigView | null;
};
