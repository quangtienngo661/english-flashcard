import { describe, expect, it } from 'vitest';
import { applyPatch, changedValues, FIELD_ORDER, fieldOfPath, SETTINGS_LAYOUT, SECTIONS, timeOptions, type Values } from './settings-api';

const values = (): Values => ({
  reminders: { enabled: true, send_time: '20:00' },
  learning: { reviews_per_group_per_day: 100 },
  practice: { max_questions_per_session: 20, default_questions_per_session: 10 },
  entitlements: { ai_cap_alert_percent: 75 },
  content: {},
  ai: {},
  identity: {},
});

describe('settings-api', () => {
  it('the layout has the 47 keys (41 of the copy doc, two of Bước 8, four of nhóm B), each once', () => {
    expect(FIELD_ORDER).toHaveLength(47);
    expect(new Set(FIELD_ORDER).size).toBe(47);
    expect(SECTIONS.map((s) => SETTINGS_LAYOUT[s].length)).toEqual([5, 5, 9, 16, 2, 9, 1]);
    expect(SETTINGS_LAYOUT.ai.slice(-4)).toEqual([
      { key: 'eval_held_out_ratio', kind: 'ratio' },
      { key: 'admin_daily_usd_cap', kind: 'usd' },
      { key: 'judge_label_min', kind: 'int' },
      { key: 'judge_agreement_min', kind: 'ratio' },
    ]);
  });

  it('changedValues keeps only changed keys; a value set back to the server value is not a change', () => {
    const draft = values();
    draft.reminders.send_time = '21:00';
    draft.practice.max_questions_per_session = 20; // unchanged
    draft.entitlements.ai_cap_alert_percent = null;
    expect(changedValues(values(), draft)).toEqual({ reminders: { send_time: '21:00' }, entitlements: { ai_cap_alert_percent: null } });
    draft.reminders.send_time = '20:00';
    draft.entitlements.ai_cap_alert_percent = 75;
    expect(changedValues(values(), draft)).toEqual({});
  });

  it('fieldOfPath maps a values path to its field id; anything else is form-level', () => {
    expect(fieldOfPath('values.practice.default_questions_per_session')).toBe('practice.default_questions_per_session');
    expect(fieldOfPath('values.practice.nope')).toBeNull();
    expect(fieldOfPath('version')).toBeNull();
  });

  it('applyPatch keeps known keys of the right type only', () => {
    const next = applyPatch(values(), {
      reminders: { send_time: '21:15', enabled: 'yes', bogus: 1 },
      learning: { reviews_per_group_per_day: null },
      practice: { max_questions_per_session: 2.5 },
      nope: { x: 1 },
    });
    expect(next.reminders).toEqual({ enabled: true, send_time: '21:15' });
    expect(next.learning.reviews_per_group_per_day).toBeNull();
    expect(next.practice.max_questions_per_session).toBe(20);
    expect(applyPatch(values(), 'garbage')).toEqual(values());
  });

  it('applyPatch keeps a kept draft of the held-out share only when it is a number', () => {
    expect(applyPatch(values(), { ai: { eval_held_out_ratio: 0.25 } }).ai.eval_held_out_ratio).toBe(0.25);
    expect(applyPatch(values(), { ai: { eval_held_out_ratio: '0.25' } }).ai.eval_held_out_ratio).toBeUndefined();
    expect(applyPatch(values(), { ai: { eval_held_out_ratio: Number.NaN } }).ai.eval_held_out_ratio).toBeUndefined();
    expect(applyPatch(values(), { ai: { eval_held_out_ratio: null } }).ai.eval_held_out_ratio).toBeUndefined();
  });

  it('applyPatch keeps a kept draft of the admin USD cap as a number or null, and drops text', () => {
    expect(applyPatch(values(), { ai: { admin_daily_usd_cap: 1.5 } }).ai.admin_daily_usd_cap).toBe(1.5);
    expect(applyPatch(values(), { ai: { admin_daily_usd_cap: null } }).ai.admin_daily_usd_cap).toBeNull();
    expect(applyPatch(values(), { ai: { admin_daily_usd_cap: '1.5' } }).ai.admin_daily_usd_cap).toBeUndefined();
    expect(applyPatch(values(), { ai: { admin_daily_usd_cap: Number.NaN } }).ai.admin_daily_usd_cap).toBeUndefined();
  });

  it('timeOptions steps the send_time bound by 15 minutes', () => {
    const options = timeOptions({ min: '06:00', max: '22:00', step_minutes: 15 });
    expect(options[0]).toBe('06:00');
    expect(options[1]).toBe('06:15');
    expect(options.at(-1)).toBe('22:00');
    expect(options).toHaveLength(65);
  });
});
