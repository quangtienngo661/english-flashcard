// The only entry point other modules may import from the AI gateway (design §4.1).
export { AiModule } from './ai.module.js';
export { AiService } from './ai.service.js';
export { OPERATION_ID_PATTERN } from './ai.constants.js';
export {
  AI_OPERATIONS, AI_PROVIDERS,
  type AiMeta, type AiOperation, type AiProviderName, type AiPurpose, type AiReadiness, type AiResult, type CallOutcome,
  type PermanentReason, type TransientReason, type UnavailableReason,
} from './ai.types.js';
export type { CallSummary, RunReport } from './runner/runner.service.js';
