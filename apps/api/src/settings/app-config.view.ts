import { SCOPE_QUESTIONS_MAX, type AiMaxMode, type AiPlacementSetting, type AppSettings, type SessionMaxMode } from './settings.definitions.js';

/** The admin-editable numbers the learner screens show (design §8.7, D16); nothing else of the settings. */
export type AppConfigView = {
  /** The practice AI count fields (09/11/2026) let the session dialog compute both maxima without another call. */
  practice: {
    max_questions_per_session: number; default_questions_per_session: number; session_max_mode: SessionMaxMode; ai_max_mode: AiMaxMode;
    ai_max_fixed: number; ai_max_percent: number; ai_placement: AiPlacementSetting; scope_questions_max: number;
  };
  reminders: { send_time: string };
  learning: { backlog_after_days: number; groups_per_user: number };
  /** Bước 8: the delete-account screen says how long payment records are kept (D15). */
  account: { transaction_retention_years: number };
  plans: {
    free: { practice_sessions_per_day: number; ai_practice_per_cycle: number; ai_lookup_per_cycle: number };
    trial: { ai_practice_per_cycle: number; ai_lookup_per_cycle: number };
    /** `prices`: dong per prepaid period of 1, 3 and 12 months (launch prep B §3.5); the learner sees what they pay. */
    pro: {
      practice_sessions_per_day: number; ai_practice_per_cycle: number; ai_lookup_per_cycle: number;
      prices: { '1': number; '3': number; '12': number };
    };
  };
};

export function appConfigView(s: AppSettings): AppConfigView {
  const e = s.entitlements;
  return {
    practice: {
      max_questions_per_session: s.practice.maxQuestionsPerSession,
      default_questions_per_session: s.practice.defaultQuestionsPerSession,
      session_max_mode: s.practice.sessionMaxMode,
      ai_max_mode: s.practice.aiMaxMode,
      ai_max_fixed: s.practice.aiMaxFixed,
      ai_max_percent: s.practice.aiMaxPercent,
      ai_placement: s.practice.aiPlacement,
      scope_questions_max: SCOPE_QUESTIONS_MAX,
    },
    reminders: { send_time: s.reminders.sendTime },
    learning: { backlog_after_days: s.learning.backlogAfterDays, groups_per_user: s.learning.groupsPerUser },
    account: { transaction_retention_years: e.transactionRetentionYears },
    plans: {
      free: {
        practice_sessions_per_day: e.freePracticeSessionsPerDay,
        ai_practice_per_cycle: e.freeAiPracticePerCycle,
        ai_lookup_per_cycle: e.freeAiLookupPerCycle,
      },
      trial: { ai_practice_per_cycle: e.trialAiPracticePerCycle, ai_lookup_per_cycle: e.trialAiLookupPerCycle },
      pro: {
        practice_sessions_per_day: e.proPracticeSessionsPerDay,
        ai_practice_per_cycle: e.proAiPracticePerCycle,
        ai_lookup_per_cycle: e.proAiLookupPerCycle,
        prices: { '1': e.proPrice1mVnd, '3': e.proPrice3mVnd, '12': e.proPrice12mVnd },
      },
    },
  };
}
