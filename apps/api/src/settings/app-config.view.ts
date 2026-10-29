import type { AppSettings } from './settings.definitions.js';

/** The admin-editable numbers the learner screens show (design §8.7, D16); nothing else of the settings. */
export type AppConfigView = {
  practice: { max_questions_per_session: number; default_questions_per_session: number };
  reminders: { send_time: string };
  learning: { backlog_after_days: number; groups_per_user: number };
  /** Bước 8: the delete-account screen says how long payment records are kept (D15). */
  account: { transaction_retention_years: number };
  plans: {
    free: { practice_sessions_per_day: number };
    trial: { ai_practice_per_cycle: number; ai_lookup_per_cycle: number };
    pro: { practice_sessions_per_day: number; ai_practice_per_cycle: number; ai_lookup_per_cycle: number };
  };
};

export function appConfigView(s: AppSettings): AppConfigView {
  const e = s.entitlements;
  return {
    practice: {
      max_questions_per_session: s.practice.maxQuestionsPerSession,
      default_questions_per_session: s.practice.defaultQuestionsPerSession,
    },
    reminders: { send_time: s.reminders.sendTime },
    learning: { backlog_after_days: s.learning.backlogAfterDays, groups_per_user: s.learning.groupsPerUser },
    account: { transaction_retention_years: e.transactionRetentionYears },
    plans: {
      free: { practice_sessions_per_day: e.freePracticeSessionsPerDay },
      trial: { ai_practice_per_cycle: e.trialAiPracticePerCycle, ai_lookup_per_cycle: e.trialAiLookupPerCycle },
      pro: {
        practice_sessions_per_day: e.proPracticeSessionsPerDay,
        ai_practice_per_cycle: e.proAiPracticePerCycle,
        ai_lookup_per_cycle: e.proAiLookupPerCycle,
      },
    },
  };
}
