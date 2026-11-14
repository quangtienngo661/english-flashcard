import { z } from 'zod';

/** Practice AI count (09/11/2026, design §3): the session maximum, the AI maximum and how AI questions are placed. */
export const SESSION_MAX_MODES = ['fixed', 'scope_words'] as const;
export type SessionMaxMode = (typeof SESSION_MAX_MODES)[number];
export const AI_MAX_MODES = ['fixed', 'percent'] as const;
export type AiMaxMode = (typeof AI_MAX_MODES)[number];
export const AI_PLACEMENTS = ['even', 'random', 'learner'] as const;
export type AiPlacementSetting = (typeof AI_PLACEMENTS)[number];
/**
 * The ceiling of the `scope_words` mode; not admin-editable. `generate_cloze.session_words` sends at most `SESSION_WORDS_MAX` (99)
 * other words of the session, sized for a session of at most 100 questions (D11).
 */
export const SCOPE_QUESTIONS_MAX = 100;

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
    /** Nhóm B (design §10, D39): N, the window in days that makes a learner "đang học" for D7/D30. */
    activeWindowDays: number;
  };
  practice: {
    maxQuestionsPerSession: number; defaultQuestionsPerSession: number; historyMonths: number; trueFalseTruePercent: number;
    idleSessionCloseHours: number; reportsPerHour: number; hintDefinitionMaxChars: number;
    /** `null` = no limit (Bước 4 design 5.4). */
    typeWordMaxRetries: number | null;
    /** Bước 7 (design §14, D8): AI questions generated ahead of the learner. */
    aiPrefetchCount: number;
    /** Practice AI count (09/11/2026): `scope_words` = the scope's word count, at most `SCOPE_QUESTIONS_MAX`. */
    sessionMaxMode: SessionMaxMode;
    /** The AI maximum: `aiMaxFixed` questions, or `aiMaxPercent` of the session rounded down. */
    aiMaxMode: AiMaxMode; aiMaxFixed: number; aiMaxPercent: number;
    /** `learner` lets the learner choose even or random; the session stores what it got. */
    aiPlacement: AiPlacementSetting;
  };
  /** Bước 5 (design §13, D18). */
  entitlements: {
    freePracticeSessionsPerDay: number; proPracticeSessionsPerDay: number;
    /** Launch prep A (design 6.6): the monthly AI allowance of the Free plan; 0 gives Free no AI, as before. */
    freeAiPracticePerCycle: number; freeAiLookupPerCycle: number;
    proAiPracticePerCycle: number; proAiLookupPerCycle: number; trialAiPracticePerCycle: number; trialAiLookupPerCycle: number;
    /** `trialReminderDaysBefore`: at least 3 days before the trial ends (owner 02/11/2026, Q8). */
    graceDays: number; trialReminderDaysBefore: number;
    /** Owner 02/11/2026 (Q8): always sent, at least 7 days before a renewal (was `null` = off, D29). */
    renewalNoticeDaysBefore: number;
    aiEnabled: boolean;
    /** `null` = no daily cap on AI units for the whole system (owner 02/11/2026, Q10); 0 still switches AI off. */
    aiDailyCap: number | null;
    /** Launch prep A (design 6.4, DA19): what all Free accounts together may use of AI in a day, under `aiDailyCap`; 0 = no AI for Free. */
    freeAiDailyCap: number;
    /** `null` = no alert (D36). */
    aiCapAlertPercent: number | null;
    adsEnabled: boolean; adsInterstitialPerDay: number; adsMinIntervalMinutes: number;
    /** Bước 8 (D15): years a payment record is kept after the account is deleted. */
    transactionRetentionYears: number;
    /** Launch prep B (Q-B8, design §3.5): the price in dong of a prepaid Pro period of 1, 3 and 12 months. */
    proPrice1mVnd: number; proPrice3mVnd: number; proPrice12mVnd: number;
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
    /** Nhóm B (design §5.1, E10): the held-out share of a working eval set, 0.1–0.5, at most two decimals. */
    evalHeldOutRatio: number;
    /** Nhóm B (design §5.5, B20): what admin calls (tests, evals, judge passes) may spend a day in USD, two decimals; `null` = no cap, 0 blocks all. */
    adminDailyUsdCap: number | null;
    /** Nhóm B (design §5.4, D15): labels a judge revision needs, and the share of them it must agree with, to count as calibrated. */
    judgeLabelMin: number; judgeAgreementMin: number;
    /** Nhóm B (design §7.1, D26): the most real AI questions one judge run takes, newest first. */
    realJudgeLimit: number;
  };
  /** Round C (H14, design §5.5): the most characters sent to the speech provider in one UTC day; 0 stops new recordings. */
  tts: { dailyCharCap: number };
};

export const SETTINGS_DEFAULTS: AppSettings = {
  reminders: { enabled: true, sendTime: '20:00', minGapDays: 2, inactiveAfterDays: 7, stopAfterDays: 60 },
  learning: { newPerGroupPerDay: 20, reviewsPerGroupPerDay: 100, backlogAfterDays: 60, groupsPerUser: 100, itemsPerGroup: 2000,
    activeWindowDays: 7 },
  practice: {
    maxQuestionsPerSession: 20, defaultQuestionsPerSession: 10, historyMonths: 6, trueFalseTruePercent: 50,
    idleSessionCloseHours: 24, reportsPerHour: 20, hintDefinitionMaxChars: 200, typeWordMaxRetries: null,
    aiPrefetchCount: 2, sessionMaxMode: 'fixed', aiMaxMode: 'percent', aiMaxFixed: 5, aiMaxPercent: 50, aiPlacement: 'even',
  },
  entitlements: {
    freePracticeSessionsPerDay: 3, proPracticeSessionsPerDay: 30, freeAiPracticePerCycle: 15, freeAiLookupPerCycle: 5,
    proAiPracticePerCycle: 300, proAiLookupPerCycle: 100,
    trialAiPracticePerCycle: 300, trialAiLookupPerCycle: 100, graceDays: 7, trialReminderDaysBefore: 3,
    renewalNoticeDaysBefore: 7, aiEnabled: true, aiDailyCap: 1000, freeAiDailyCap: 500, aiCapAlertPercent: 75, adsEnabled: false,
    adsInterstitialPerDay: 3, adsMinIntervalMinutes: 10, transactionRetentionYears: 10,
    proPrice1mVnd: 79000, proPrice3mVnd: 199000, proPrice12mVnd: 599000,
  },
  identity: { unverifiedCleanupDays: 7 },
  content: { privateWordsPerUser: 10000, sentencesPerSense: 20 },
  ai: { callTimeoutSeconds: 10, maxConcurrentCalls: 50, dailyProviderCallsCap: 3000, contentRetentionDays: 7, usdVndRate: 26100, evalHeldOutRatio: 0.3,
    adminDailyUsdCap: 2, judgeLabelMin: 30, judgeAgreementMin: 0.85, realJudgeLimit: 200 },
  tts: { dailyCharCap: 120_000 },
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
    active_window_days: { min: 1, max: 60 },
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
    ai_max_fixed: { min: 0, max: 100 },
    ai_max_percent: { min: 0, max: 100 },
  },
  entitlements: {
    free_practice_sessions_per_day: { min: 1, max: 50 },
    pro_practice_sessions_per_day: { min: 1, max: 200, at_least: 'free_practice_sessions_per_day' },
    free_ai_practice_per_cycle: { min: 0, max: 5000 },
    free_ai_lookup_per_cycle: { min: 0, max: 5000 },
    pro_ai_practice_per_cycle: { min: 0, max: 5000 },
    pro_ai_lookup_per_cycle: { min: 0, max: 5000 },
    trial_ai_practice_per_cycle: { min: 0, max: 5000 },
    trial_ai_lookup_per_cycle: { min: 0, max: 5000 },
    grace_days: { min: 0, max: 16 },
    trial_reminder_days_before: { min: 3, max: 6 },
    renewal_notice_days_before: { min: 7, max: 30 },
    ai_daily_cap: { min: 0, max: 100000, nullable: true },
    free_ai_daily_cap: { min: 0, max: 100000 },
    ai_cap_alert_percent: { min: 50, max: 95, nullable: true },
    ads_interstitial_per_day: { min: 0, max: 20 },
    ads_min_interval_minutes: { min: 1, max: 240 },
    transaction_retention_years: { min: 5, max: 30 },
    pro_price_1m_vnd: { min: 1000, max: 10000000 },
    pro_price_3m_vnd: { min: 1000, max: 10000000 },
    pro_price_12m_vnd: { min: 1000, max: 10000000 },
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
    eval_held_out_ratio: { min: 0.1, max: 0.5 },
    admin_daily_usd_cap: { min: 0, max: 1000, nullable: true },
    judge_label_min: { min: 10, max: 1000 },
    judge_agreement_min: { min: 0.5, max: 1 },
    real_judge_limit: { min: 1, max: 500 },
  },
  tts: {
    daily_char_cap: { min: 0, max: 1_000_000 },
  },
} as const;

const b = SETTINGS_BOUNDS;
const intIn = (bounds: { min: number; max: number }) => z.number().int().min(bounds.min).max(bounds.max);
/** A number inside the bounds with at most two decimals (M1-T2; M3's `judge_agreement_min` reuses it). */
export const ratioIn = (bounds: { min: number; max: number }) => z.number().min(bounds.min).max(bounds.max)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9, 'Expected at most two decimals');
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
    active_window_days: intIn(b.learning.active_window_days).optional(),
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
    session_max_mode: z.enum(SESSION_MAX_MODES).optional(),
    ai_max_mode: z.enum(AI_MAX_MODES).optional(),
    ai_max_fixed: intIn(b.practice.ai_max_fixed).optional(),
    ai_max_percent: intIn(b.practice.ai_max_percent).optional(),
    ai_placement: z.enum(AI_PLACEMENTS).optional(),
  }).optional(),
  entitlements: z.strictObject({
    free_practice_sessions_per_day: intIn(b.entitlements.free_practice_sessions_per_day).optional(),
    pro_practice_sessions_per_day: intIn(b.entitlements.pro_practice_sessions_per_day).optional(),
    free_ai_practice_per_cycle: intIn(b.entitlements.free_ai_practice_per_cycle).optional(),
    free_ai_lookup_per_cycle: intIn(b.entitlements.free_ai_lookup_per_cycle).optional(),
    pro_ai_practice_per_cycle: intIn(b.entitlements.pro_ai_practice_per_cycle).optional(),
    pro_ai_lookup_per_cycle: intIn(b.entitlements.pro_ai_lookup_per_cycle).optional(),
    trial_ai_practice_per_cycle: intIn(b.entitlements.trial_ai_practice_per_cycle).optional(),
    trial_ai_lookup_per_cycle: intIn(b.entitlements.trial_ai_lookup_per_cycle).optional(),
    grace_days: intIn(b.entitlements.grace_days).optional(),
    trial_reminder_days_before: intIn(b.entitlements.trial_reminder_days_before).optional(),
    renewal_notice_days_before: intIn(b.entitlements.renewal_notice_days_before).optional(),
    ai_enabled: z.boolean().optional(),
    ai_daily_cap: intIn(b.entitlements.ai_daily_cap).nullable().optional(),
    free_ai_daily_cap: intIn(b.entitlements.free_ai_daily_cap).optional(),
    ai_cap_alert_percent: intIn(b.entitlements.ai_cap_alert_percent).nullable().optional(),
    ads_enabled: z.boolean().optional(),
    ads_interstitial_per_day: intIn(b.entitlements.ads_interstitial_per_day).optional(),
    ads_min_interval_minutes: intIn(b.entitlements.ads_min_interval_minutes).optional(),
    transaction_retention_years: intIn(b.entitlements.transaction_retention_years).optional(),
    pro_price_1m_vnd: intIn(b.entitlements.pro_price_1m_vnd).optional(),
    pro_price_3m_vnd: intIn(b.entitlements.pro_price_3m_vnd).optional(),
    pro_price_12m_vnd: intIn(b.entitlements.pro_price_12m_vnd).optional(),
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
    eval_held_out_ratio: ratioIn(b.ai.eval_held_out_ratio).optional(),
    admin_daily_usd_cap: ratioIn(b.ai.admin_daily_usd_cap).nullable().optional(),
    judge_label_min: intIn(b.ai.judge_label_min).optional(),
    judge_agreement_min: ratioIn(b.ai.judge_agreement_min).optional(),
    real_judge_limit: intIn(b.ai.real_judge_limit).optional(),
  }).optional(),
  tts: z.strictObject({
    daily_char_cap: intIn(b.tts.daily_char_cap).optional(),
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
  ['learning', 'active_window_days', 'activeWindowDays'],
  ['practice', 'max_questions_per_session', 'maxQuestionsPerSession'],
  ['practice', 'default_questions_per_session', 'defaultQuestionsPerSession'],
  ['practice', 'session_max_mode', 'sessionMaxMode'],
  ['practice', 'ai_max_mode', 'aiMaxMode'],
  ['practice', 'ai_max_fixed', 'aiMaxFixed'],
  ['practice', 'ai_max_percent', 'aiMaxPercent'],
  ['practice', 'ai_placement', 'aiPlacement'],
  ['practice', 'history_months', 'historyMonths'],
  ['practice', 'true_false_true_percent', 'trueFalseTruePercent'],
  ['practice', 'idle_session_close_hours', 'idleSessionCloseHours'],
  ['practice', 'reports_per_hour', 'reportsPerHour'],
  ['practice', 'hint_definition_max_chars', 'hintDefinitionMaxChars'],
  ['practice', 'type_word_max_retries', 'typeWordMaxRetries'],
  ['practice', 'ai_prefetch_count', 'aiPrefetchCount'],
  ['entitlements', 'free_practice_sessions_per_day', 'freePracticeSessionsPerDay'],
  ['entitlements', 'pro_practice_sessions_per_day', 'proPracticeSessionsPerDay'],
  ['entitlements', 'free_ai_practice_per_cycle', 'freeAiPracticePerCycle'],
  ['entitlements', 'free_ai_lookup_per_cycle', 'freeAiLookupPerCycle'],
  ['entitlements', 'pro_ai_practice_per_cycle', 'proAiPracticePerCycle'],
  ['entitlements', 'pro_ai_lookup_per_cycle', 'proAiLookupPerCycle'],
  ['entitlements', 'trial_ai_practice_per_cycle', 'trialAiPracticePerCycle'],
  ['entitlements', 'trial_ai_lookup_per_cycle', 'trialAiLookupPerCycle'],
  ['entitlements', 'grace_days', 'graceDays'],
  ['entitlements', 'trial_reminder_days_before', 'trialReminderDaysBefore'],
  ['entitlements', 'renewal_notice_days_before', 'renewalNoticeDaysBefore'],
  ['entitlements', 'ai_enabled', 'aiEnabled'],
  ['entitlements', 'ai_daily_cap', 'aiDailyCap'],
  ['entitlements', 'free_ai_daily_cap', 'freeAiDailyCap'],
  ['entitlements', 'ai_cap_alert_percent', 'aiCapAlertPercent'],
  ['entitlements', 'ads_enabled', 'adsEnabled'],
  ['entitlements', 'ads_interstitial_per_day', 'adsInterstitialPerDay'],
  ['entitlements', 'ads_min_interval_minutes', 'adsMinIntervalMinutes'],
  ['entitlements', 'transaction_retention_years', 'transactionRetentionYears'],
  ['entitlements', 'pro_price_1m_vnd', 'proPrice1mVnd'],
  ['entitlements', 'pro_price_3m_vnd', 'proPrice3mVnd'],
  ['entitlements', 'pro_price_12m_vnd', 'proPrice12mVnd'],
  ['identity', 'unverified_cleanup_days', 'unverifiedCleanupDays'],
  ['content', 'private_words_per_user', 'privateWordsPerUser'],
  ['content', 'sentences_per_sense', 'sentencesPerSense'],
  ['ai', 'call_timeout_seconds', 'callTimeoutSeconds'],
  ['ai', 'max_concurrent_calls', 'maxConcurrentCalls'],
  ['ai', 'daily_provider_calls_cap', 'dailyProviderCallsCap'],
  ['ai', 'content_retention_days', 'contentRetentionDays'],
  ['ai', 'usd_vnd_rate', 'usdVndRate'],
  ['ai', 'eval_held_out_ratio', 'evalHeldOutRatio'],
  ['ai', 'admin_daily_usd_cap', 'adminDailyUsdCap'],
  ['ai', 'judge_label_min', 'judgeLabelMin'],
  ['ai', 'judge_agreement_min', 'judgeAgreementMin'],
  ['ai', 'real_judge_limit', 'realJudgeLimit'],
  ['tts', 'daily_char_cap', 'dailyCharCap'],
] as const;

type Section = keyof AppSettings;
/** `null` only where a bound says `nullable` ("để trống"). */
type AnyValue = boolean | number | string | null;
const read = (values: AppSettings, section: Section, field: string): AnyValue =>
  (values[section] as Record<string, AnyValue>)[field];

export function toApiValues(values: AppSettings): Record<Section, Record<string, AnyValue>> {
  const out: Record<Section, Record<string, AnyValue>> = {
    reminders: {}, learning: {}, practice: {}, entitlements: {}, content: {}, ai: {}, identity: {}, tts: {},
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
    // Only the fixed mode has a maximum to compare with; under `scope_words` the API lowers the default to the scope (09/11/2026).
    ...(values.practice.sessionMaxMode !== 'fixed' || values.practice.defaultQuestionsPerSession <= values.practice.maxQuestionsPerSession ? []
      : ['values.practice.default_questions_per_session: Expected at most max_questions_per_session']),
    ...(values.entitlements.proPracticeSessionsPerDay >= values.entitlements.freePracticeSessionsPerDay ? []
      : ['values.entitlements.pro_practice_sessions_per_day: Expected at least free_practice_sessions_per_day']),
  ];
}

const FIELD_OF_KEY = new Map(FIELDS.map(([section, apiKey, field]) => [`${section}.${apiKey}`, [section, field] as const]));

/** One value by the key history rows name it with (`<section>.<api_key>`); `undefined` for a key no setting has. */
export function apiValueOf(values: AppSettings, key: string): AnyValue | undefined {
  const target = FIELD_OF_KEY.get(key);
  return target ? read(values, target[0], target[1]) : undefined;
}

export function changedFields(before: AppSettings, after: AppSettings): Array<{ key: string; oldValue: AnyValue; newValue: AnyValue }> {
  return FIELDS.flatMap(([section, apiKey, field]) => {
    const oldValue = read(before, section, field);
    const newValue = read(after, section, field);
    return oldValue === newValue ? [] : [{ key: `${section}.${apiKey}`, oldValue, newValue }];
  });
}

const fieldSchema = (section: Section, apiKey: string): z.ZodType =>
  (settingsValuesPatchSchema.shape[section].unwrap().shape as Record<string, z.ZodType>)[apiKey];

/**
 * Stored JSON may predate a newly added key: fill it from the defaults. Keys no longer defined (e.g. `weeklyMax`,
 * replaced by `minGapDays` in D44) are dropped. A stored value the current bounds reject (a minimum raised later, as in Q8)
 * falls back to the default too, so the app never runs on a value the admin page could not save.
 */
export function withDefaults(stored: unknown): AppSettings {
  const value = (stored ?? {}) as Partial<Record<Section, Record<string, AnyValue | undefined>>>;
  const out = structuredClone(SETTINGS_DEFAULTS);
  for (const [section, apiKey, field] of FIELDS) {
    const storedValue = value[section]?.[field];
    if (storedValue !== undefined && fieldSchema(section, apiKey).safeParse(storedValue).success) {
      (out[section] as Record<string, AnyValue>)[field] = storedValue;
    }
  }
  return out;
}
