import { z } from 'zod';

/** Admin-tunable values (design §9). Stored camelCase in `app_settings.value`; the API speaks snake_case. */
export type AppSettings = {
  reminders: { enabled: boolean; sendTime: string; minGapDays: number; inactiveAfterDays: number; stopAfterDays: number };
  learning: {
    newPerGroupPerDay: number;
    /** `null` = no limit on the due part (Bước 4 D35). */
    reviewsPerGroupPerDay: number | null;
    backlogAfterDays: number;
    /** Bước 5 (design §13): were `GROUPS_MAX` / `GROUP_ITEMS_MAX`. */
    groupsPerUser: number;
    itemsPerGroup: number;
  };
  practice: {
    maxQuestionsPerSession: number; defaultQuestionsPerSession: number; historyMonths: number; trueFalseTruePercent: number;
    idleSessionCloseHours: number; reportsPerHour: number; hintDefinitionMaxChars: number;
    /** `null` = no limit (Bước 4 design 5.4). */
    typeWordMaxRetries: number | null;
    /** Bước 7 (design §14, D8): AI questions generated ahead of the learner. */
    aiPrefetchCount: number;
  };
  /** Bước 5 (design §13, D18). */
  entitlements: {
    freePracticeSessionsPerDay: number; proPracticeSessionsPerDay: number;
    proAiPracticePerCycle: number; proAiLookupPerCycle: number; trialAiPracticePerCycle: number; trialAiLookupPerCycle: number;
    graceDays: number; trialReminderDaysBefore: number;
    /** `null` = no renewal notice email. */
    renewalNoticeDaysBefore: number | null;
    aiEnabled: boolean; aiDailyCap: number;
    /** `null` = no alert (D36). */
    aiCapAlertPercent: number | null;
    adsEnabled: boolean; adsInterstitialPerDay: number; adsMinIntervalMinutes: number;
    /** Bước 8 (D15): years a payment record is kept after the account is deleted. */
    transactionRetentionYears: number;
  };
  /** Bước 8 (D19): days before an account that never verified its email is deleted. */
  identity: { unverifiedCleanupDays: number };
  /** Bước 5 (design §13): were `PRIVATE_WORDS_MAX` / `SENTENCES_PER_SENSE_MAX`. */
  content: { privateWordsPerUser: number; sentencesPerSense: number };
  /** Bước 6 (design §13). */
  ai: {
    callTimeoutSeconds: number; maxConcurrentCalls: number;
    /** `null` = no cap. */
    dailyProviderCallsCap: number | null;
    contentRetentionDays: number; usdVndRate: number;
  };
};

export const SETTINGS_DEFAULTS: AppSettings = {
  reminders: { enabled: true, sendTime: '20:00', minGapDays: 2, inactiveAfterDays: 7, stopAfterDays: 60 },
  learning: { newPerGroupPerDay: 20, reviewsPerGroupPerDay: 100, backlogAfterDays: 60, groupsPerUser: 100, itemsPerGroup: 2000 },
  practice: {
    maxQuestionsPerSession: 20, defaultQuestionsPerSession: 10, historyMonths: 6, trueFalseTruePercent: 50,
    idleSessionCloseHours: 24, reportsPerHour: 20, hintDefinitionMaxChars: 200, typeWordMaxRetries: null,
    aiPrefetchCount: 2,
  },
  entitlements: {
    freePracticeSessionsPerDay: 3, proPracticeSessionsPerDay: 30, proAiPracticePerCycle: 300, proAiLookupPerCycle: 100,
    trialAiPracticePerCycle: 300, trialAiLookupPerCycle: 100, graceDays: 7, trialReminderDaysBefore: 2,
    renewalNoticeDaysBefore: null, aiEnabled: true, aiDailyCap: 1000, aiCapAlertPercent: 75, adsEnabled: false,
    adsInterstitialPerDay: 3, adsMinIntervalMinutes: 10, transactionRetentionYears: 10,
  },
  identity: { unverifiedCleanupDays: 7 },
  content: { privateWordsPerUser: 10000, sentencesPerSense: 20 },
  ai: { callTimeoutSeconds: 10, maxConcurrentCalls: 50, dailyProviderCallsCap: 3000, contentRetentionDays: 7, usdVndRate: 26100 },
};

/** Bounds are `ASSUMPTION` in design §9 (Bước 4: design 5.4); the admin page shows them next to each field. */
export const SETTINGS_BOUNDS = {
  reminders: {
    send_time: { min: '06:00', max: '22:00', step_minutes: 15 },
    min_gap_days: { min: 1, max: 7 },
    inactive_after_days: { min: 3, max: 30 },
    stop_after_days: { min: 30, max: 180, greater_than: 'inactive_after_days' },
  },
  learning: {
    new_per_group_per_day: { min: 1, max: 100 },
    reviews_per_group_per_day: { min: 10, max: 500, nullable: true },
    backlog_after_days: { min: 30, max: 365 },
    groups_per_user: { min: 10, max: 1000 },
    items_per_group: { min: 100, max: 10000 },
  },
  practice: {
    max_questions_per_session: { min: 5, max: 100 },
    default_questions_per_session: { min: 1, max: 100 },
    history_months: { min: 3, max: 24 },
    true_false_true_percent: { min: 20, max: 80 },
    idle_session_close_hours: { min: 1, max: 168 },
    reports_per_hour: { min: 5, max: 100 },
    hint_definition_max_chars: { min: 80, max: 500 },
    type_word_max_retries: { min: 1, max: 10, nullable: true },
    ai_prefetch_count: { min: 0, max: 20 },
  },
  entitlements: {
    free_practice_sessions_per_day: { min: 1, max: 50 },
    pro_practice_sessions_per_day: { min: 1, max: 200, at_least: 'free_practice_sessions_per_day' },
    pro_ai_practice_per_cycle: { min: 0, max: 5000 },
    pro_ai_lookup_per_cycle: { min: 0, max: 5000 },
    trial_ai_practice_per_cycle: { min: 0, max: 5000 },
    trial_ai_lookup_per_cycle: { min: 0, max: 5000 },
    grace_days: { min: 0, max: 16 },
    trial_reminder_days_before: { min: 1, max: 6 },
    renewal_notice_days_before: { min: 1, max: 30, nullable: true },
    ai_daily_cap: { min: 0, max: 100000 },
    ai_cap_alert_percent: { min: 50, max: 95, nullable: true },
    ads_interstitial_per_day: { min: 0, max: 20 },
    ads_min_interval_minutes: { min: 1, max: 240 },
    transaction_retention_years: { min: 5, max: 30 },
  },
  identity: {
    unverified_cleanup_days: { min: 1, max: 365 },
  },
  content: {
    private_words_per_user: { min: 1000, max: 100000 },
    sentences_per_sense: { min: 5, max: 100 },
  },
  ai: {
    call_timeout_seconds: { min: 3, max: 30 },
    max_concurrent_calls: { min: 1, max: 500 },
    daily_provider_calls_cap: { min: 0, max: 1000000, nullable: true },
    content_retention_days: { min: 0, max: 30 },
    usd_vnd_rate: { min: 10000, max: 100000 },
  },
} as const;

const b = SETTINGS_BOUNDS;
const intIn = (bounds: { min: number; max: number }) => z.number().int().min(bounds.min).max(bounds.max);
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const sendTime = z.string().refine((value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  && minutes(value) % b.reminders.send_time.step_minutes === 0
  && minutes(value) >= minutes(b.reminders.send_time.min) && minutes(value) <= minutes(b.reminders.send_time.max),
  `Expected HH:MM from ${b.reminders.send_time.min} to ${b.reminders.send_time.max} in 15-minute steps`);

export const settingsValuesPatchSchema = z.strictObject({
  reminders: z.strictObject({
    enabled: z.boolean().optional(),
    send_time: sendTime.optional(),
    min_gap_days: intIn(b.reminders.min_gap_days).optional(),
    inactive_after_days: intIn(b.reminders.inactive_after_days).optional(),
    stop_after_days: intIn(b.reminders.stop_after_days).optional(),
  }).optional(),
  learning: z.strictObject({
    new_per_group_per_day: intIn(b.learning.new_per_group_per_day).optional(),
    reviews_per_group_per_day: intIn(b.learning.reviews_per_group_per_day).nullable().optional(),
    backlog_after_days: intIn(b.learning.backlog_after_days).optional(),
    groups_per_user: intIn(b.learning.groups_per_user).optional(),
    items_per_group: intIn(b.learning.items_per_group).optional(),
  }).optional(),
  practice: z.strictObject({
    max_questions_per_session: intIn(b.practice.max_questions_per_session).optional(),
    default_questions_per_session: intIn(b.practice.default_questions_per_session).optional(),
    history_months: intIn(b.practice.history_months).optional(),
    true_false_true_percent: intIn(b.practice.true_false_true_percent).optional(),
    idle_session_close_hours: intIn(b.practice.idle_session_close_hours).optional(),
    reports_per_hour: intIn(b.practice.reports_per_hour).optional(),
    hint_definition_max_chars: intIn(b.practice.hint_definition_max_chars).optional(),
    type_word_max_retries: intIn(b.practice.type_word_max_retries).nullable().optional(),
    ai_prefetch_count: intIn(b.practice.ai_prefetch_count).optional(),
  }).optional(),
  entitlements: z.strictObject({
    free_practice_sessions_per_day: intIn(b.entitlements.free_practice_sessions_per_day).optional(),
    pro_practice_sessions_per_day: intIn(b.entitlements.pro_practice_sessions_per_day).optional(),
    pro_ai_practice_per_cycle: intIn(b.entitlements.pro_ai_practice_per_cycle).optional(),
    pro_ai_lookup_per_cycle: intIn(b.entitlements.pro_ai_lookup_per_cycle).optional(),
    trial_ai_practice_per_cycle: intIn(b.entitlements.trial_ai_practice_per_cycle).optional(),
    trial_ai_lookup_per_cycle: intIn(b.entitlements.trial_ai_lookup_per_cycle).optional(),
    grace_days: intIn(b.entitlements.grace_days).optional(),
    trial_reminder_days_before: intIn(b.entitlements.trial_reminder_days_before).optional(),
    renewal_notice_days_before: intIn(b.entitlements.renewal_notice_days_before).nullable().optional(),
    ai_enabled: z.boolean().optional(),
    ai_daily_cap: intIn(b.entitlements.ai_daily_cap).optional(),
    ai_cap_alert_percent: intIn(b.entitlements.ai_cap_alert_percent).nullable().optional(),
    ads_enabled: z.boolean().optional(),
    ads_interstitial_per_day: intIn(b.entitlements.ads_interstitial_per_day).optional(),
    ads_min_interval_minutes: intIn(b.entitlements.ads_min_interval_minutes).optional(),
    transaction_retention_years: intIn(b.entitlements.transaction_retention_years).optional(),
  }).optional(),
  identity: z.strictObject({
    unverified_cleanup_days: intIn(b.identity.unverified_cleanup_days).optional(),
  }).optional(),
  content: z.strictObject({
    private_words_per_user: intIn(b.content.private_words_per_user).optional(),
    sentences_per_sense: intIn(b.content.sentences_per_sense).optional(),
  }).optional(),
  ai: z.strictObject({
    call_timeout_seconds: intIn(b.ai.call_timeout_seconds).optional(),
    max_concurrent_calls: intIn(b.ai.max_concurrent_calls).optional(),
    daily_provider_calls_cap: intIn(b.ai.daily_provider_calls_cap).nullable().optional(),
    content_retention_days: intIn(b.ai.content_retention_days).optional(),
    usd_vnd_rate: intIn(b.ai.usd_vnd_rate).optional(),
  }).optional(),
});
export type SettingsValuesPatch = z.infer<typeof settingsValuesPatchSchema>;

/** API key ↔ stored path. History rows name the API key, e.g. `reminders.send_time`. */
const FIELDS = [
  ['reminders', 'enabled', 'enabled'],
  ['reminders', 'send_time', 'sendTime'],
  ['reminders', 'min_gap_days', 'minGapDays'],
  ['reminders', 'inactive_after_days', 'inactiveAfterDays'],
  ['reminders', 'stop_after_days', 'stopAfterDays'],
  ['learning', 'new_per_group_per_day', 'newPerGroupPerDay'],
  ['learning', 'reviews_per_group_per_day', 'reviewsPerGroupPerDay'],
  ['learning', 'backlog_after_days', 'backlogAfterDays'],
  ['learning', 'groups_per_user', 'groupsPerUser'],
  ['learning', 'items_per_group', 'itemsPerGroup'],
  ['practice', 'max_questions_per_session', 'maxQuestionsPerSession'],
  ['practice', 'default_questions_per_session', 'defaultQuestionsPerSession'],
  ['practice', 'history_months', 'historyMonths'],
  ['practice', 'true_false_true_percent', 'trueFalseTruePercent'],
  ['practice', 'idle_session_close_hours', 'idleSessionCloseHours'],
  ['practice', 'reports_per_hour', 'reportsPerHour'],
  ['practice', 'hint_definition_max_chars', 'hintDefinitionMaxChars'],
  ['practice', 'type_word_max_retries', 'typeWordMaxRetries'],
  ['practice', 'ai_prefetch_count', 'aiPrefetchCount'],
  ['entitlements', 'free_practice_sessions_per_day', 'freePracticeSessionsPerDay'],
  ['entitlements', 'pro_practice_sessions_per_day', 'proPracticeSessionsPerDay'],
  ['entitlements', 'pro_ai_practice_per_cycle', 'proAiPracticePerCycle'],
  ['entitlements', 'pro_ai_lookup_per_cycle', 'proAiLookupPerCycle'],
  ['entitlements', 'trial_ai_practice_per_cycle', 'trialAiPracticePerCycle'],
  ['entitlements', 'trial_ai_lookup_per_cycle', 'trialAiLookupPerCycle'],
  ['entitlements', 'grace_days', 'graceDays'],
  ['entitlements', 'trial_reminder_days_before', 'trialReminderDaysBefore'],
  ['entitlements', 'renewal_notice_days_before', 'renewalNoticeDaysBefore'],
  ['entitlements', 'ai_enabled', 'aiEnabled'],
  ['entitlements', 'ai_daily_cap', 'aiDailyCap'],
  ['entitlements', 'ai_cap_alert_percent', 'aiCapAlertPercent'],
  ['entitlements', 'ads_enabled', 'adsEnabled'],
  ['entitlements', 'ads_interstitial_per_day', 'adsInterstitialPerDay'],
  ['entitlements', 'ads_min_interval_minutes', 'adsMinIntervalMinutes'],
  ['entitlements', 'transaction_retention_years', 'transactionRetentionYears'],
  ['identity', 'unverified_cleanup_days', 'unverifiedCleanupDays'],
  ['content', 'private_words_per_user', 'privateWordsPerUser'],
  ['content', 'sentences_per_sense', 'sentencesPerSense'],
  ['ai', 'call_timeout_seconds', 'callTimeoutSeconds'],
  ['ai', 'max_concurrent_calls', 'maxConcurrentCalls'],
  ['ai', 'daily_provider_calls_cap', 'dailyProviderCallsCap'],
  ['ai', 'content_retention_days', 'contentRetentionDays'],
  ['ai', 'usd_vnd_rate', 'usdVndRate'],
] as const;

type Section = keyof AppSettings;
/** `null` only where a bound says `nullable` ("để trống"). */
type AnyValue = boolean | number | string | null;
const read = (values: AppSettings, section: Section, field: string): AnyValue =>
  (values[section] as Record<string, AnyValue>)[field];

export function toApiValues(values: AppSettings): Record<Section, Record<string, AnyValue>> {
  const out: Record<Section, Record<string, AnyValue>> = {
    reminders: {}, learning: {}, practice: {}, entitlements: {}, content: {}, ai: {}, identity: {},
  };
  for (const [section, apiKey, field] of FIELDS) out[section][apiKey] = read(values, section, field);
  return out;
}

export function applyPatch(current: AppSettings, patch: SettingsValuesPatch): AppSettings {
  const next = structuredClone(current);
  for (const [section, apiKey, field] of FIELDS) {
    const value = (patch[section] as Record<string, AnyValue | undefined> | undefined)?.[apiKey];
    if (value !== undefined) (next[section] as Record<string, AnyValue>)[field] = value;
  }
  return next;
}

/** Rules across fields, checked on the merged values; each violation names the API key like the schema does. */
export function crossFieldViolations(values: AppSettings): string[] {
  return [
    ...(values.reminders.stopAfterDays > values.reminders.inactiveAfterDays ? []
      : ['values.reminders.stop_after_days: Expected greater than inactive_after_days']),
    ...(values.practice.defaultQuestionsPerSession <= values.practice.maxQuestionsPerSession ? []
      : ['values.practice.default_questions_per_session: Expected at most max_questions_per_session']),
    ...(values.entitlements.proPracticeSessionsPerDay >= values.entitlements.freePracticeSessionsPerDay ? []
      : ['values.entitlements.pro_practice_sessions_per_day: Expected at least free_practice_sessions_per_day']),
  ];
}

export function changedFields(before: AppSettings, after: AppSettings): Array<{ key: string; oldValue: AnyValue; newValue: AnyValue }> {
  return FIELDS.flatMap(([section, apiKey, field]) => {
    const oldValue = read(before, section, field);
    const newValue = read(after, section, field);
    return oldValue === newValue ? [] : [{ key: `${section}.${apiKey}`, oldValue, newValue }];
  });
}

/**
 * Stored JSON may predate a newly added key: fill it from the defaults. Keys no longer defined (e.g. `weeklyMax`,
 * replaced by `minGapDays` in D44) are dropped.
 */
export function withDefaults(stored: unknown): AppSettings {
  const value = (stored ?? {}) as Partial<Record<Section, Record<string, AnyValue | undefined>>>;
  const out = structuredClone(SETTINGS_DEFAULTS);
  for (const [section, , field] of FIELDS) {
    const storedValue = value[section]?.[field];
    if (storedValue !== undefined) (out[section] as Record<string, AnyValue>)[field] = storedValue;
  }
  return out;
}
