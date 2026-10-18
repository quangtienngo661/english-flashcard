import { z } from 'zod';

/** Admin-tunable values (design §9). Stored camelCase in `app_settings.value`; the API speaks snake_case. */
export type AppSettings = {
  reminders: { enabled: boolean; sendTime: string; minGapDays: number; inactiveAfterDays: number; stopAfterDays: number };
  learning: {
    newPerGroupPerDay: number;
    /** `null` = no limit on the due part (Bước 4 D35). */
    reviewsPerGroupPerDay: number | null;
    backlogAfterDays: number;
  };
  practice: {
    maxQuestionsPerSession: number; defaultQuestionsPerSession: number; historyMonths: number; trueFalseTruePercent: number;
    idleSessionCloseHours: number; reportsPerHour: number; hintDefinitionMaxChars: number;
    /** `null` = no limit (Bước 4 design 5.4). */
    typeWordMaxRetries: number | null;
  };
};

export const SETTINGS_DEFAULTS: AppSettings = {
  reminders: { enabled: true, sendTime: '20:00', minGapDays: 2, inactiveAfterDays: 7, stopAfterDays: 60 },
  learning: { newPerGroupPerDay: 20, reviewsPerGroupPerDay: 100, backlogAfterDays: 60 },
  practice: {
    maxQuestionsPerSession: 20, defaultQuestionsPerSession: 10, historyMonths: 6, trueFalseTruePercent: 50,
    idleSessionCloseHours: 24, reportsPerHour: 20, hintDefinitionMaxChars: 200, typeWordMaxRetries: null,
  },
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
  ['practice', 'max_questions_per_session', 'maxQuestionsPerSession'],
  ['practice', 'default_questions_per_session', 'defaultQuestionsPerSession'],
  ['practice', 'history_months', 'historyMonths'],
  ['practice', 'true_false_true_percent', 'trueFalseTruePercent'],
  ['practice', 'idle_session_close_hours', 'idleSessionCloseHours'],
  ['practice', 'reports_per_hour', 'reportsPerHour'],
  ['practice', 'hint_definition_max_chars', 'hintDefinitionMaxChars'],
  ['practice', 'type_word_max_retries', 'typeWordMaxRetries'],
] as const;

type Section = keyof AppSettings;
/** `null` only where a bound says `nullable` ("để trống"). */
type AnyValue = boolean | number | string | null;
const read = (values: AppSettings, section: Section, field: string): AnyValue =>
  (values[section] as Record<string, AnyValue>)[field];

export function toApiValues(values: AppSettings): Record<Section, Record<string, AnyValue>> {
  const out: Record<Section, Record<string, AnyValue>> = { reminders: {}, learning: {}, practice: {} };
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
