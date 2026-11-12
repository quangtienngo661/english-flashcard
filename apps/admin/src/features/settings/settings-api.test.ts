import { describe, expect, it } from 'vitest';
import {
  aiCapExamples, applyPatch, changedValues, FIELD_ORDER, fieldOfPath, parentOf, SETTINGS_LAYOUT, SECTIONS, timeOptions, visibleFields, type Values,
} from './settings-api';

const values = (): Values => ({
  reminders: { enabled: true, send_time: '20:00' },
  learning: { reviews_per_group_per_day: 100 },
  practice: { max_questions_per_session: 20, default_questions_per_session: 10 },
  entitlements: { ai_cap_alert_percent: 75 },
  content: {},
  ai: {},
  identity: {},
  tts: {},
});

describe('settings-api', () => {
  it('the layout has the 61 keys (41 of the copy doc, two of Bước 8, six of nhóm B, three of launch prep A, three Pro prices of launch prep B, one TTS cap of đợt C, five of the practice AI count), each once', () => {
    expect(FIELD_ORDER).toHaveLength(61);
    expect(new Set(FIELD_ORDER).size).toBe(61);
    expect(SECTIONS.map((s) => SETTINGS_LAYOUT[s].length)).toEqual([5, 6, 14, 22, 2, 10, 1, 1]);
    // Practice AI count (09/11/2026): mockup order, each number field under the choice it depends on.
    expect(SETTINGS_LAYOUT.practice.slice(0, 7)).toEqual([
      { key: 'session_max_mode', kind: 'choice', options: ['fixed', 'scope_words'] },
      { key: 'max_questions_per_session', kind: 'int', showWhen: { key: 'session_max_mode', is: 'fixed' } },
      { key: 'default_questions_per_session', kind: 'int' },
      { key: 'ai_max_mode', kind: 'choice', options: ['fixed', 'percent'] },
      { key: 'ai_max_fixed', kind: 'int', unit: 'questions', showWhen: { key: 'ai_max_mode', is: 'fixed' } },
      { key: 'ai_max_percent', kind: 'int', unit: 'percent', showWhen: { key: 'ai_max_mode', is: 'percent' } },
      { key: 'ai_placement', kind: 'choice', options: ['even', 'random', 'learner'] },
    ]);
    expect(SETTINGS_LAYOUT.practice[7].key).toBe('history_months');
    // The three prices close the entitlements tab, in dong.
    expect(SETTINGS_LAYOUT.entitlements.slice(-3)).toEqual([
      { key: 'pro_price_1m_vnd', kind: 'int', unit: 'vnd' },
      { key: 'pro_price_3m_vnd', kind: 'int', unit: 'vnd' },
      { key: 'pro_price_12m_vnd', kind: 'int', unit: 'vnd' },
    ]);
    // The window of "đang học" (D39) is the last field of the learning tab, in days.
    expect(SETTINGS_LAYOUT.learning.at(-1)).toEqual({ key: 'active_window_days', kind: 'int', unit: 'days' });
    expect(SETTINGS_LAYOUT.ai.slice(-5)).toEqual([
      { key: 'eval_held_out_ratio', kind: 'ratio' },
      { key: 'admin_daily_usd_cap', kind: 'usd' },
      { key: 'judge_label_min', kind: 'int' },
      { key: 'judge_agreement_min', kind: 'ratio' },
      { key: 'real_judge_limit', kind: 'int' },
    ]);
  });

  it('LA3#14: the two Free monthly AI keys come before the Pro ones; the Free daily cap sits right after the system-wide one', () => {
    const keys = SETTINGS_LAYOUT.entitlements.map((f) => f.key);
    expect(SETTINGS_LAYOUT.entitlements.find((f) => f.key === 'free_ai_practice_per_cycle')).toEqual({ key: 'free_ai_practice_per_cycle', kind: 'int', unit: 'uses' });
    expect(SETTINGS_LAYOUT.entitlements.find((f) => f.key === 'free_ai_lookup_per_cycle')).toEqual({ key: 'free_ai_lookup_per_cycle', kind: 'int', unit: 'uses' });
    expect(SETTINGS_LAYOUT.entitlements.find((f) => f.key === 'free_ai_daily_cap')).toEqual({ key: 'free_ai_daily_cap', kind: 'int', unit: 'uses' });
    expect(keys.indexOf('free_ai_practice_per_cycle')).toBeLessThan(keys.indexOf('pro_ai_practice_per_cycle'));
    expect(keys.indexOf('free_ai_lookup_per_cycle')).toBe(keys.indexOf('free_ai_practice_per_cycle') + 1);
    expect(keys.indexOf('free_ai_daily_cap')).toBe(keys.indexOf('ai_daily_cap') + 1);
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

  describe('practice AI count (09/11/2026)', () => {
    it('applyPatch keeps a choice value only when it is one of the options', () => {
      const next = applyPatch(values(), { practice: { session_max_mode: 'scope_words', ai_placement: 'bogus' } });
      expect(next.practice.session_max_mode).toBe('scope_words');
      expect(next.practice.ai_placement).toBeUndefined();
    });

    it('visibleFields hides the number field of the mode not chosen', () => {
      const v = values();
      v.practice = { ...v.practice, session_max_mode: 'scope_words', ai_max_mode: 'percent' };
      const keys = visibleFields('practice', v).map((f) => f.key);
      expect(keys).not.toContain('max_questions_per_session');
      expect(keys).not.toContain('ai_max_fixed');
      expect(keys).toContain('ai_max_percent');
      expect(keys).toHaveLength(12);
    });

    it('parentOf names the choice a dependent field hangs on', () => {
      expect(parentOf('practice', 'ai_max_percent')).toBe('ai_max_mode');
      expect(parentOf('practice', 'max_questions_per_session')).toBe('session_max_mode');
      expect(parentOf('practice', 'history_months')).toBeNull();
    });

    it('aiCapExamples follows the API rule for sessions of 7, 10 and 20 questions', () => {
      expect(aiCapExamples('percent', 5, 50)).toEqual([{ questions: 7, ai: 3 }, { questions: 10, ai: 5 }, { questions: 20, ai: 10 }]);
      expect(aiCapExamples('fixed', 5, 50)?.map((e) => e.ai)).toEqual([5, 5, 5]);
      expect(aiCapExamples('percent', 5, 30)?.map((e) => e.ai)).toEqual([2, 3, 6]);
      expect(aiCapExamples('fixed', 15, 50)?.map((e) => e.ai)).toEqual([7, 10, 15]);
      expect(aiCapExamples('percent', 5, null as unknown as number)).toBeNull();
      expect(aiCapExamples('fixed', null as unknown as number, 50)).toBeNull();
    });
  });
});
