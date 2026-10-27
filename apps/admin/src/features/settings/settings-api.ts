import type { ApiClient } from '../../api/client';

export type Section = 'reminders' | 'learning' | 'practice' | 'entitlements' | 'content' | 'ai';
export const SECTIONS: Section[] = ['reminders', 'learning', 'practice', 'entitlements', 'content', 'ai'];

export type SettingValue = boolean | number | string | null;
export type Values = Record<Section, Record<string, SettingValue>>;
/** Only the changed keys of the sections that have one (the `PUT` body is a strict object of optional keys). */
export type Patch = Partial<Record<Section, Record<string, SettingValue>>>;
export type Bound = {
  min: number | string;
  max: number | string;
  nullable?: boolean;
  step_minutes?: number;
  greater_than?: string;
  at_least?: string;
};

/** `GET /v1/admin/settings` (API 10.8 adds `defaults`); bool keys have no bound. */
export type SettingsView = {
  version: number;
  values: Values;
  defaults: Values;
  bounds: Record<Section, Record<string, Bound>>;
};

export type Unit = 'days' | 'hours' | 'minutes' | 'months' | 'percent' | 'chars' | 'seconds' | 'sessions' | 'uses' | 'times';
export type FieldSpec = { key: string; kind: 'bool' | 'int' | 'time'; unit?: Unit };

/** The 41 keys per tab, in the order of the copy doc §8.2. */
export const SETTINGS_LAYOUT: Record<Section, FieldSpec[]> = {
  reminders: [
    { key: 'enabled', kind: 'bool' },
    { key: 'send_time', kind: 'time' },
    { key: 'min_gap_days', kind: 'int', unit: 'days' },
    { key: 'inactive_after_days', kind: 'int', unit: 'days' },
    { key: 'stop_after_days', kind: 'int', unit: 'days' },
  ],
  learning: [
    { key: 'new_per_group_per_day', kind: 'int' },
    { key: 'reviews_per_group_per_day', kind: 'int' },
    { key: 'backlog_after_days', kind: 'int', unit: 'days' },
    { key: 'groups_per_user', kind: 'int' },
    { key: 'items_per_group', kind: 'int' },
  ],
  practice: [
    { key: 'max_questions_per_session', kind: 'int' },
    { key: 'default_questions_per_session', kind: 'int' },
    { key: 'history_months', kind: 'int', unit: 'months' },
    { key: 'true_false_true_percent', kind: 'int', unit: 'percent' },
    { key: 'idle_session_close_hours', kind: 'int', unit: 'hours' },
    { key: 'reports_per_hour', kind: 'int' },
    { key: 'hint_definition_max_chars', kind: 'int', unit: 'chars' },
    { key: 'type_word_max_retries', kind: 'int' },
    { key: 'ai_prefetch_count', kind: 'int' },
  ],
  entitlements: [
    { key: 'free_practice_sessions_per_day', kind: 'int', unit: 'sessions' },
    { key: 'pro_practice_sessions_per_day', kind: 'int', unit: 'sessions' },
    { key: 'pro_ai_practice_per_cycle', kind: 'int', unit: 'uses' },
    { key: 'pro_ai_lookup_per_cycle', kind: 'int', unit: 'uses' },
    { key: 'trial_ai_practice_per_cycle', kind: 'int', unit: 'uses' },
    { key: 'trial_ai_lookup_per_cycle', kind: 'int', unit: 'uses' },
    { key: 'grace_days', kind: 'int', unit: 'days' },
    { key: 'trial_reminder_days_before', kind: 'int', unit: 'days' },
    { key: 'renewal_notice_days_before', kind: 'int', unit: 'days' },
    { key: 'ai_enabled', kind: 'bool' },
    { key: 'ai_daily_cap', kind: 'int', unit: 'uses' },
    { key: 'ai_cap_alert_percent', kind: 'int', unit: 'percent' },
    { key: 'ads_enabled', kind: 'bool' },
    { key: 'ads_interstitial_per_day', kind: 'int', unit: 'times' },
    { key: 'ads_min_interval_minutes', kind: 'int', unit: 'minutes' },
  ],
  content: [
    { key: 'private_words_per_user', kind: 'int' },
    { key: 'sentences_per_sense', kind: 'int' },
  ],
  ai: [
    { key: 'call_timeout_seconds', kind: 'int', unit: 'seconds' },
    { key: 'max_concurrent_calls', kind: 'int' },
    { key: 'daily_provider_calls_cap', kind: 'int' },
    { key: 'content_retention_days', kind: 'int', unit: 'days' },
    { key: 'usd_vnd_rate', kind: 'int' },
  ],
};

/** A field's DOM id and its name in errors: `<section>.<key>` (the API key without the `values.` prefix). */
export const fieldId = (section: Section, key: string) => `${section}.${key}`;

/** Every field id in page order, for "focus the first invalid field". */
export const FIELD_ORDER: string[] = SECTIONS.flatMap((section) => SETTINGS_LAYOUT[section].map((f) => fieldId(section, f.key)));

/** Maps a violation path (`values.practice.default_questions_per_session`) to its field id, or `null` for a form-level one. */
export function fieldOfPath(path: string): string | null {
  const id = path.startsWith('values.') ? path.slice('values.'.length) : null;
  return id !== null && FIELD_ORDER.includes(id) ? id : null;
}

export const sectionOfField = (id: string) => id.slice(0, id.indexOf('.')) as Section;

/** The keys whose draft differs from the server; a value set back to the server's is not a change. */
export function changedValues(server: Values, draft: Values): Patch {
  const patch: Patch = {};
  for (const section of SECTIONS) {
    for (const { key } of SETTINGS_LAYOUT[section]) {
      const value = draft[section]?.[key];
      if (value === undefined || value === server[section]?.[key]) continue;
      (patch[section] ??= {})[key] = value;
    }
  }
  return patch;
}

export const isEmptyPatch = (patch: Patch) => Object.keys(patch).length === 0;

/**
 * `patch` on top of `values`, keeping only known keys whose value has the field's type (a kept draft may come from an older
 * build or be hand-edited; anything else is dropped).
 */
export function applyPatch(values: Values, patch: unknown): Values {
  const next = structuredClone(values);
  if (typeof patch !== 'object' || patch === null) return next;
  for (const section of SECTIONS) {
    const part = (patch as Record<string, unknown>)[section];
    if (typeof part !== 'object' || part === null) continue;
    for (const { key, kind } of SETTINGS_LAYOUT[section]) {
      const value = (part as Record<string, unknown>)[key];
      const ok =
        (kind === 'bool' && typeof value === 'boolean') ||
        (kind === 'time' && typeof value === 'string') ||
        (kind === 'int' && (value === null || Number.isInteger(value)));
      if (ok) next[section][key] = value as SettingValue;
    }
  }
  return next;
}

/** `send_time` choices from its bound: "06:00", "06:15", … "22:00". */
export function timeOptions(bound: Bound | undefined): string[] {
  if (!bound || typeof bound.min !== 'string' || typeof bound.max !== 'string') return [];
  const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
  const step = bound.step_minutes ?? 15;
  const out: string[] = [];
  for (let m = toMin(bound.min); m <= toMin(bound.max); m += step) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
}

export type SettingChange = {
  key: string;
  old_value: SettingValue;
  new_value: SettingValue;
  changed_by: { id: string; email: string | null };
  changed_at: string;
};

/** `GET /v1/admin/entitlements/ai-usage` (A/70d head): today in Vietnam. */
export type AiUsage = {
  date: string;
  used: number;
  confirmed: number;
  reserved: number;
  cap: number;
  alert_percent: number | null;
  alert_reached: boolean;
  enabled: boolean;
};

export const getSettings = (api: ApiClient) => api.get<SettingsView>('/v1/admin/settings');

export const saveSettings = (api: ApiClient, version: number, values: Patch, idempotencyKey: string) =>
  api.put<{ version: number; values: Values }>('/v1/admin/settings', { version, values }, { idempotencyKey });

export function listSettingsHistory(api: ApiClient, pageToken?: string) {
  const query = new URLSearchParams({ page_size: '20' });
  if (pageToken) query.set('page_token', pageToken);
  return api.get<{ items: SettingChange[]; next_page_token: string | null }>(`/v1/admin/settings/history?${query.toString()}`);
}

export const getAiUsage = (api: ApiClient) => api.get<AiUsage>('/v1/admin/entitlements/ai-usage');
