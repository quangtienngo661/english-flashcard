import type { MockHandler } from './mock-api';

/** `GET /v1/admin/settings` as the API returns it with the code defaults (`settings.definitions.ts`). */
const DEFAULTS = {
  reminders: { enabled: true, send_time: '20:00', min_gap_days: 2, inactive_after_days: 7, stop_after_days: 60 },
  learning: { new_per_group_per_day: 20, reviews_per_group_per_day: 100, backlog_after_days: 60, groups_per_user: 100, items_per_group: 2000 },
  practice: {
    max_questions_per_session: 20, default_questions_per_session: 10, history_months: 6, true_false_true_percent: 50,
    idle_session_close_hours: 24, reports_per_hour: 20, hint_definition_max_chars: 200, type_word_max_retries: null, ai_prefetch_count: 2,
  },
  entitlements: {
    free_practice_sessions_per_day: 3, pro_practice_sessions_per_day: 30, pro_ai_practice_per_cycle: 300, pro_ai_lookup_per_cycle: 100,
    trial_ai_practice_per_cycle: 300, trial_ai_lookup_per_cycle: 100, grace_days: 7, trial_reminder_days_before: 2,
    renewal_notice_days_before: null, ai_enabled: true, ai_daily_cap: 1000, ai_cap_alert_percent: 75, ads_enabled: false,
    ads_interstitial_per_day: 3, ads_min_interval_minutes: 10,
  },
  content: { private_words_per_user: 10000, sentences_per_sense: 20 },
  ai: { call_timeout_seconds: 10, max_concurrent_calls: 50, daily_provider_calls_cap: 3000, content_retention_days: 7, usd_vnd_rate: 26100 },
};
const BOUNDS = {
  reminders: {
    send_time: { min: '06:00', max: '22:00', step_minutes: 15 }, min_gap_days: { min: 1, max: 7 }, inactive_after_days: { min: 3, max: 30 },
    stop_after_days: { min: 30, max: 180, greater_than: 'inactive_after_days' },
  },
  learning: {
    new_per_group_per_day: { min: 1, max: 100 }, reviews_per_group_per_day: { min: 10, max: 500, nullable: true },
    backlog_after_days: { min: 30, max: 365 }, groups_per_user: { min: 10, max: 1000 }, items_per_group: { min: 100, max: 10000 },
  },
  practice: {
    max_questions_per_session: { min: 5, max: 100 }, default_questions_per_session: { min: 1, max: 100 }, history_months: { min: 3, max: 24 },
    true_false_true_percent: { min: 20, max: 80 }, idle_session_close_hours: { min: 1, max: 168 }, reports_per_hour: { min: 5, max: 100 },
    hint_definition_max_chars: { min: 80, max: 500 }, type_word_max_retries: { min: 1, max: 10, nullable: true }, ai_prefetch_count: { min: 0, max: 20 },
  },
  entitlements: {
    free_practice_sessions_per_day: { min: 1, max: 50 },
    pro_practice_sessions_per_day: { min: 1, max: 200, at_least: 'free_practice_sessions_per_day' },
    pro_ai_practice_per_cycle: { min: 0, max: 5000 }, pro_ai_lookup_per_cycle: { min: 0, max: 5000 },
    trial_ai_practice_per_cycle: { min: 0, max: 5000 }, trial_ai_lookup_per_cycle: { min: 0, max: 5000 }, grace_days: { min: 0, max: 16 },
    trial_reminder_days_before: { min: 1, max: 6 }, renewal_notice_days_before: { min: 1, max: 30, nullable: true },
    ai_daily_cap: { min: 0, max: 100000 }, ai_cap_alert_percent: { min: 50, max: 95, nullable: true },
    ads_interstitial_per_day: { min: 0, max: 20 }, ads_min_interval_minutes: { min: 1, max: 240 },
  },
  content: { private_words_per_user: { min: 1000, max: 100000 }, sentences_per_sense: { min: 5, max: 100 } },
  ai: {
    call_timeout_seconds: { min: 3, max: 30 }, max_concurrent_calls: { min: 1, max: 500 },
    daily_provider_calls_cap: { min: 0, max: 1000000, nullable: true }, content_retention_days: { min: 0, max: 30 },
    usd_vnd_rate: { min: 10000, max: 100000 },
  },
};

export const settingsView = (version = 1) => ({ version, values: structuredClone(DEFAULTS), defaults: structuredClone(DEFAULTS), bounds: BOUNDS });

export const settingsMocks: Record<string, MockHandler> = {
  'GET /v1/admin/settings': () => ({ json: settingsView() }),
  'GET /v1/admin/entitlements/ai-usage': () => ({
    json: { date: '2026-10-27', used: 812, confirmed: 790, reserved: 22, cap: 1000, alert_percent: 75, alert_reached: true, enabled: true },
  }),
  'GET /v1/admin/settings/history': () => ({
    json: {
      items: [{
        key: 'reminders.send_time', old_value: '20:00', new_value: '21:15',
        changed_by: { id: 'admin-1', email: 'an.admin.with-a-rather-long-address@wordmet.com' }, changed_at: '2026-10-27T02:12:00.000Z',
      }],
      next_page_token: null,
    },
  }),
};
