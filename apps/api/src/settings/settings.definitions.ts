import { z } from 'zod';

/** Admin-tunable values (design §9). Stored camelCase in `app_settings.value`; the API speaks snake_case. */
export type AppSettings = {
  reminders: { enabled: boolean; sendTime: string; weeklyMax: number; inactiveAfterDays: number; stopAfterDays: number };
  learning: { newPerGroupPerDay: number; reviewsPerGroupPerDay: number; backlogAfterDays: number };
};

export const SETTINGS_DEFAULTS: AppSettings = {
  reminders: { enabled: true, sendTime: '20:00', weeklyMax: 3, inactiveAfterDays: 7, stopAfterDays: 60 },
  learning: { newPerGroupPerDay: 20, reviewsPerGroupPerDay: 100, backlogAfterDays: 60 },
};

/** Bounds are `ASSUMPTION` in design §9; the admin page shows them next to each field. */
export const SETTINGS_BOUNDS = {
  reminders: {
    send_time: { min: '06:00', max: '22:00', step_minutes: 15 },
    weekly_max: { min: 0, max: 7 },
    inactive_after_days: { min: 3, max: 30 },
    stop_after_days: { min: 30, max: 180, greater_than: 'inactive_after_days' },
  },
  learning: {
    new_per_group_per_day: { min: 1, max: 100 },
    reviews_per_group_per_day: { min: 10, max: 500 },
    backlog_after_days: { min: 30, max: 365 },
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
    weekly_max: intIn(b.reminders.weekly_max).optional(),
    inactive_after_days: intIn(b.reminders.inactive_after_days).optional(),
    stop_after_days: intIn(b.reminders.stop_after_days).optional(),
  }).optional(),
  learning: z.strictObject({
    new_per_group_per_day: intIn(b.learning.new_per_group_per_day).optional(),
    reviews_per_group_per_day: intIn(b.learning.reviews_per_group_per_day).optional(),
    backlog_after_days: intIn(b.learning.backlog_after_days).optional(),
  }).optional(),
});
export type SettingsValuesPatch = z.infer<typeof settingsValuesPatchSchema>;

/** API key ↔ stored path. History rows name the API key, e.g. `reminders.send_time`. */
const FIELDS = [
  ['reminders', 'enabled', 'enabled'],
  ['reminders', 'send_time', 'sendTime'],
  ['reminders', 'weekly_max', 'weeklyMax'],
  ['reminders', 'inactive_after_days', 'inactiveAfterDays'],
  ['reminders', 'stop_after_days', 'stopAfterDays'],
  ['learning', 'new_per_group_per_day', 'newPerGroupPerDay'],
  ['learning', 'reviews_per_group_per_day', 'reviewsPerGroupPerDay'],
  ['learning', 'backlog_after_days', 'backlogAfterDays'],
] as const;

type Section = keyof AppSettings;
type AnyValue = boolean | number | string;
const read = (values: AppSettings, section: Section, field: string): AnyValue =>
  (values[section] as Record<string, AnyValue>)[field];

export function toApiValues(values: AppSettings): Record<Section, Record<string, AnyValue>> {
  const out: Record<Section, Record<string, AnyValue>> = { reminders: {}, learning: {} };
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
  return values.reminders.stopAfterDays > values.reminders.inactiveAfterDays ? []
    : ['values.reminders.stop_after_days: Expected greater than inactive_after_days'];
}

export function changedFields(before: AppSettings, after: AppSettings): Array<{ key: string; oldValue: AnyValue; newValue: AnyValue }> {
  return FIELDS.flatMap(([section, apiKey, field]) => {
    const oldValue = read(before, section, field);
    const newValue = read(after, section, field);
    return oldValue === newValue ? [] : [{ key: `${section}.${apiKey}`, oldValue, newValue }];
  });
}

/** Stored JSON may predate a newly added key: fill it from the defaults. */
export function withDefaults(stored: unknown): AppSettings {
  const value = (stored ?? {}) as Partial<Record<Section, Record<string, AnyValue>>>;
  return {
    reminders: { ...SETTINGS_DEFAULTS.reminders, ...value.reminders } as AppSettings['reminders'],
    learning: { ...SETTINGS_DEFAULTS.learning, ...value.learning } as AppSettings['learning'],
  };
}
