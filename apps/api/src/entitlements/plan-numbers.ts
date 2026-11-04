import type { AppSettings } from '../settings/index.js';
import type { PlanNumbers } from './rules/plan-rules.js';

/** The plan numbers of Settings (design §5.2, §13). Free AI is the monthly allowance of launch prep A (design 6.6); 0 in Settings turns it off. */
export function planNumbers(settings: AppSettings['entitlements']): PlanNumbers {
  return {
    free: {
      practice_sessions: settings.freePracticeSessionsPerDay, ai_practice: settings.freeAiPracticePerCycle,
      ai_lookup: settings.freeAiLookupPerCycle,
    },
    pro: {
      practice_sessions: settings.proPracticeSessionsPerDay, ai_practice: settings.proAiPracticePerCycle,
      ai_lookup: settings.proAiLookupPerCycle,
    },
    trial: { ai_practice: settings.trialAiPracticePerCycle, ai_lookup: settings.trialAiLookupPerCycle },
  };
}
