// The only entry point other modules may import from the AI gateway (design §4.1).
export { AiModule } from './ai.module.js';
export { AiService } from './ai.service.js';
export { OPERATION_ID_PATTERN } from './ai.constants.js';
export {
  AI_OPERATIONS, AI_PROVIDERS, GATEWAY_OPERATIONS,
  type AiMeta, type AiOperation, type AiProviderName, type AiPurpose, type AiReadiness, type AiResult, type CallOutcome, type GatewayOperation,
  type PermanentReason, type TransientReason, type UnavailableReason,
} from './ai.types.js';
export type { CallSummary, RunReport } from './runner/runner.service.js';
export type { EvalRules } from './eval/eval-rules.port.js';
export type { ExpectedForms } from './eval/expected.js';
export type { RuleResult } from './eval/eval.types.js';
export type { JudgeCriterion, JudgeSubject, JudgeVerdict } from './judge/judge.types.js';
