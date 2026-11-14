import type { ApiClient } from '../../api/client';

export type Section = 'reminders' | 'learning' | 'practice' | 'entitlements' | 'content' | 'ai' | 'identity' | 'tts';
export const SECTIONS: Section[] = ['reminders', 'learning', 'practice', 'entitlements', 'content', 'ai', 'identity', 'tts'];

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

export type Unit =
  | 'days' | 'hours' | 'minutes' | 'months' | 'years' | 'percent' | 'chars' | 'seconds' | 'sessions' | 'uses' | 'times' | 'vnd' | 'questions';
/**
 * `ratio`: a number between 0 and 1 with up to two decimals, shown as a percent in its hint. `usd`: dollars with up to two decimals; an empty
 * field is `null` where the bound is nullable. `choice` (practice AI count, 09/11/2026): one of `options`, shown as a dropdown.
 * `showWhen`: the field shows only while the choice `key` of the same tab is `is`; it sits in that choice's row.
 */
export type FieldSpec = {
  key: string;
  kind: 'bool' | 'int' | 'time' | 'ratio' | 'usd' | 'choice';
  unit?: Unit;
  options?: readonly string[];
  showWhen?: { key: string; is: string };
};

/**
 * The 61 keys per tab, in the order of the copy doc §8.2 (the three Free AI keys of launch prep A, the three Pro prices of launch prep B and
 * the five practice AI count keys included; those follow the mockup "Số câu AI và cài đặt luyện tập").
 */
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
    { key: 'active_window_days', kind: 'int', unit: 'days' },
  ],
  practice: [
    { key: 'session_max_mode', kind: 'choice', options: ['fixed', 'scope_words'] },
    { key: 'max_questions_per_session', kind: 'int', showWhen: { key: 'session_max_mode', is: 'fixed' } },
    { key: 'default_questions_per_session', kind: 'int' },
    { key: 'ai_max_mode', kind: 'choice', options: ['fixed', 'percent'] },
    { key: 'ai_max_fixed', kind: 'int', unit: 'questions', showWhen: { key: 'ai_max_mode', is: 'fixed' } },
    { key: 'ai_max_percent', kind: 'int', unit: 'percent', showWhen: { key: 'ai_max_mode', is: 'percent' } },
    { key: 'ai_placement', kind: 'choice', options: ['even', 'random', 'learner'] },
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
    { key: 'free_ai_practice_per_cycle', kind: 'int', unit: 'uses' },
    { key: 'free_ai_lookup_per_cycle', kind: 'int', unit: 'uses' },
    { key: 'pro_ai_practice_per_cycle', kind: 'int', unit: 'uses' },
    { key: 'pro_ai_lookup_per_cycle', kind: 'int', unit: 'uses' },
    { key: 'trial_ai_practice_per_cycle', kind: 'int', unit: 'uses' },
    { key: 'trial_ai_lookup_per_cycle', kind: 'int', unit: 'uses' },
    { key: 'grace_days', kind: 'int', unit: 'days' },
    { key: 'trial_reminder_days_before', kind: 'int', unit: 'days' },
    { key: 'renewal_notice_days_before', kind: 'int', unit: 'days' },
    { key: 'ai_enabled', kind: 'bool' },
    { key: 'ai_daily_cap', kind: 'int', unit: 'uses' },
    { key: 'free_ai_daily_cap', kind: 'int', unit: 'uses' },
    { key: 'ai_cap_alert_percent', kind: 'int', unit: 'percent' },
    { key: 'ads_enabled', kind: 'bool' },
    { key: 'ads_interstitial_per_day', kind: 'int', unit: 'times' },
    { key: 'ads_min_interval_minutes', kind: 'int', unit: 'minutes' },
    { key: 'transaction_retention_years', kind: 'int', unit: 'years' },
    { key: 'pro_price_1m_vnd', kind: 'int', unit: 'vnd' },
    { key: 'pro_price_3m_vnd', kind: 'int', unit: 'vnd' },
    { key: 'pro_price_12m_vnd', kind: 'int', unit: 'vnd' },
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
    { key: 'eval_held_out_ratio', kind: 'ratio' },
    { key: 'admin_daily_usd_cap', kind: 'usd' },
    { key: 'judge_label_min', kind: 'int' },
    { key: 'judge_agreement_min', kind: 'ratio' },
    { key: 'real_judge_limit', kind: 'int' },
  ],
  identity: [{ key: 'unverified_cleanup_days', kind: 'int', unit: 'days' }],
  // Đợt C (H14): the Google TTS characters the worker may send a day (UTC); default 120000.
  tts: [{ key: 'daily_char_cap', kind: 'int', unit: 'chars' }],
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

/** The tab's fields without those whose `showWhen` choice is set to another value. A hidden field keeps its draft value. */
export function visibleFields(section: Section, values: Values): FieldSpec[] {
  return SETTINGS_LAYOUT[section].filter((f) => !f.showWhen || values[section]?.[f.showWhen.key] === f.showWhen.is);
}

/** The choice a dependent field hangs on, or `null`. */
export function parentOf(section: Section, key: string): string | null {
  return SETTINGS_LAYOUT[section].find((f) => f.key === key)?.showWhen?.key ?? null;
}

/** The AI maximum of sessions of 7, 10 and 20 questions, by the API's rule (fixed: at most the session; percent: rounded down). */
export function aiCapExamples(mode: string, fixed: number, percent: number): Array<{ questions: number; ai: number }> | null {
  const n = mode === 'fixed' ? fixed : percent;
  if (!Number.isInteger(n)) return null;
  return [7, 10, 20].map((questions) => ({
    questions,
    ai: mode === 'fixed' ? Math.min(fixed, questions) : Math.floor((questions * percent) / 100),
  }));
}

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
    for (const { key, kind, options } of SETTINGS_LAYOUT[section]) {
      const value = (part as Record<string, unknown>)[key];
      const ok =
        (kind === 'choice' && typeof value === 'string' && (options ?? []).includes(value)) ||
        (kind === 'bool' && typeof value === 'boolean') ||
        (kind === 'time' && typeof value === 'string') ||
        (kind === 'int' && (value === null || Number.isInteger(value))) ||
        (kind === 'ratio' && typeof value === 'number' && Number.isFinite(value)) ||
        (kind === 'usd' && (value === null || (typeof value === 'number' && Number.isFinite(value))));
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
  /** `null` = no daily cap (Q10). */
  cap: number | null;
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
