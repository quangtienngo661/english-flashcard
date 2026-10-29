// Types of the config lifecycle (nhóm B design §6; contract §2).
import type { UserRef } from '../../common/user-ref.js';
import type { AiOperation, AiProviderName } from '../ai.types.js';
import type { PromptExample } from '../prompts/prompt-rules.js';
import type { CostEstimate } from '../runner/cost.js';

export const CONFIG_STATUSES = ['draft', 'published', 'retired'] as const;
export type ConfigStatus = (typeof CONFIG_STATUSES)[number];

/** Items of a run that passed, out of the items that were judged (a criterion nothing judged has `counted: 0`). */
export type Tally = { passed: number; counted: number };

/** What a publish warns about (design §6.3 step 3); M3 adds the judge criteria. */
export type PublishWarning =
  | { code: 'rate-drop'; criterion: 'shape' | 'rule' | 'expected'; before: Tally; after: Tally }
  | { code: 'dev-regressed'; example_ids: string[] }
  | { code: 'held-out-failures-up'; before: number; after: number };

/** One config as the admin API shows it (design §4, §6.1). */
export type ConfigView = {
  id: string;
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
};

/** `GET /v1/admin/ai/configs/{op}`: what runs now, the draft being prepared and the config before the live one (the rollback target). */
export type ConfigsView = {
  operation: AiOperation;
  input_fields: string[];
  guard: string;
  live_version: number;
  live: ConfigView;
  draft: ConfigView | null;
  previous: ConfigView | null;
};
