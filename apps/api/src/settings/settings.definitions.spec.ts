import { describe, expect, it } from 'vitest';
import {
  applyPatch, changedFields, crossFieldViolations, SETTINGS_DEFAULTS, settingsValuesPatchSchema, toApiValues, withDefaults,
} from './settings.definitions.js';

const issues = (input: unknown) => {
  const result = settingsValuesPatchSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('settings definitions', () => {
  it('design §9: defaults are true, 20:00, 2, 7, 60, 20, 100, 60', () => {
    expect(toApiValues(SETTINGS_DEFAULTS)).toEqual({
      reminders: { enabled: true, send_time: '20:00', min_gap_days: 2, inactive_after_days: 7, stop_after_days: 60 },
      learning: { new_per_group_per_day: 20, reviews_per_group_per_day: 100, backlog_after_days: 60 },
      practice: {
        max_questions_per_session: 20, default_questions_per_session: 10, history_months: 6, true_false_true_percent: 50,
        idle_session_close_hours: 24, reports_per_hour: 20, hint_definition_max_chars: 200, type_word_max_retries: null,
      },
    });
  });

  it('design 5.4: each practice bound accepts its edges and refuses one step outside; type_word_max_retries also takes null', () => {
    const edges: Array<[string, number, number]> = [
      ['max_questions_per_session', 5, 100], ['default_questions_per_session', 1, 100], ['history_months', 3, 24],
      ['true_false_true_percent', 20, 80], ['idle_session_close_hours', 1, 168], ['reports_per_hour', 5, 100],
      ['hint_definition_max_chars', 80, 500], ['type_word_max_retries', 1, 10],
    ];
    for (const [key, min, max] of edges) {
      expect(issues({ practice: { [key]: min } }), `${key}=${min}`).toEqual([]);
      expect(issues({ practice: { [key]: max } }), `${key}=${max}`).toEqual([]);
      expect(issues({ practice: { [key]: min - 1 } }), `${key}=${min - 1}`).toEqual([`practice.${key}`]);
      expect(issues({ practice: { [key]: max + 1 } }), `${key}=${max + 1}`).toEqual([`practice.${key}`]);
    }
    expect(issues({ practice: { type_word_max_retries: null } })).toEqual([]);
    expect(issues({ practice: { max_questions_per_session: null } })).toEqual(['practice.max_questions_per_session']);
    expect(issues({ practice: { type_word_max_retries: 2.5 } })).toEqual(['practice.type_word_max_retries']);
  });

  it('B4E38: default_questions_per_session must not exceed max_questions_per_session on the merged values', () => {
    const equal = applyPatch(SETTINGS_DEFAULTS, { practice: { default_questions_per_session: 20 } });
    expect(crossFieldViolations(equal)).toEqual([]);
    expect(crossFieldViolations(applyPatch(SETTINGS_DEFAULTS, { practice: { default_questions_per_session: 30 } })))
      .toEqual(['values.practice.default_questions_per_session: Expected at most max_questions_per_session']);
    expect(crossFieldViolations(applyPatch(SETTINGS_DEFAULTS, { practice: { max_questions_per_session: 5 } })))
      .toEqual(['values.practice.default_questions_per_session: Expected at most max_questions_per_session']);
  });

  it('B3E30: each bound accepts its edges and refuses one step outside, naming the key', () => {
    const edges: Array<[string, string, unknown, unknown, unknown]> = [
      ['reminders', 'send_time', '06:00', '22:00', '05:45'], ['reminders', 'send_time', '06:00', '22:00', '22:15'],
      ['reminders', 'min_gap_days', 1, 7, 8], ['reminders', 'min_gap_days', 1, 7, 0],
      ['reminders', 'inactive_after_days', 3, 30, 2], ['reminders', 'inactive_after_days', 3, 30, 31],
      ['reminders', 'stop_after_days', 30, 180, 29], ['reminders', 'stop_after_days', 30, 180, 181],
      ['learning', 'new_per_group_per_day', 1, 100, 0], ['learning', 'new_per_group_per_day', 1, 100, 101],
      ['learning', 'reviews_per_group_per_day', 10, 500, 9], ['learning', 'reviews_per_group_per_day', 10, 500, 501],
      ['learning', 'backlog_after_days', 30, 365, 29], ['learning', 'backlog_after_days', 30, 365, 366],
    ];
    for (const [section, key, min, max, outside] of edges) {
      expect(issues({ [section]: { [key]: min } }), `${key}=${String(min)}`).toEqual([]);
      expect(issues({ [section]: { [key]: max } }), `${key}=${String(max)}`).toEqual([]);
      expect(issues({ [section]: { [key]: outside } }), `${key}=${String(outside)}`).toEqual([`${section}.${key}`]);
    }
  });

  it('B3E30: send_time must be HH:MM on a 15-minute step; counts must be integers; unknown keys are refused', () => {
    for (const bad of ['20:10', '8:00', '20:00:00', '24:00', 2000]) {
      expect(issues({ reminders: { send_time: bad } }), String(bad)).toEqual(['reminders.send_time']);
    }
    expect(issues({ reminders: { send_time: '07:45' } })).toEqual([]);
    expect(issues({ reminders: { min_gap_days: 2.5 } })).toEqual(['reminders.min_gap_days']);
    expect(issues({ reminders: { enabled: 'yes' } })).toEqual(['reminders.enabled']);
    expect(issues({ reminders: { tick: 1 } })).toEqual(['reminders']);
    expect(issues({ other: {} })).toEqual(['']);
  });

  it('B3E30: stop_after_days must stay above inactive_after_days on the merged values', () => {
    expect(crossFieldViolations(SETTINGS_DEFAULTS)).toEqual([]);
    const equal = applyPatch(SETTINGS_DEFAULTS, { reminders: { inactive_after_days: 30, stop_after_days: 30 } });
    expect(crossFieldViolations(equal)).toEqual(['values.reminders.stop_after_days: Expected greater than inactive_after_days']);
    expect(crossFieldViolations(applyPatch(equal, { reminders: { stop_after_days: 31 } }))).toEqual([]);
  });

  it('a patch changes only the named keys and the diff lists exactly those that changed', () => {
    const next = applyPatch(SETTINGS_DEFAULTS, { reminders: { send_time: '21:00', min_gap_days: 2 }, learning: { backlog_after_days: 90 } });
    expect(next).toEqual({ ...SETTINGS_DEFAULTS,
      reminders: { ...SETTINGS_DEFAULTS.reminders, sendTime: '21:00' },
      learning: { ...SETTINGS_DEFAULTS.learning, backlogAfterDays: 90 } });
    expect(SETTINGS_DEFAULTS.reminders.sendTime).toBe('20:00');
    expect(changedFields(SETTINGS_DEFAULTS, next)).toEqual([
      { key: 'reminders.send_time', oldValue: '20:00', newValue: '21:00' },
      { key: 'learning.backlog_after_days', oldValue: 60, newValue: 90 },
    ]);
  });

  it('withDefaults fills the practice group; a stored null for type_word_max_retries stays null', () => {
    expect(withDefaults({ reminders: {}, learning: {} }).practice).toEqual(SETTINGS_DEFAULTS.practice);
    const stored = withDefaults({ practice: { typeWordMaxRetries: 3, historyMonths: 12 } }).practice;
    expect(stored).toEqual({ ...SETTINGS_DEFAULTS.practice, typeWordMaxRetries: 3, historyMonths: 12 });
    expect(withDefaults({ practice: { typeWordMaxRetries: null } }).practice.typeWordMaxRetries).toBeNull();
  });

  it('changedFields reports 3 → null and a patch with null sets null', () => {
    const three = applyPatch(SETTINGS_DEFAULTS, { practice: { type_word_max_retries: 3 } });
    expect(three.practice.typeWordMaxRetries).toBe(3);
    const cleared = applyPatch(three, { practice: { type_word_max_retries: null } });
    expect(cleared.practice.typeWordMaxRetries).toBeNull();
    expect(changedFields(three, cleared)).toEqual([{ key: 'practice.type_word_max_retries', oldValue: 3, newValue: null }]);
    expect(changedFields(cleared, cleared)).toEqual([]);
  });

  it('stored values missing a key fall back to its default', () => {
    expect(withDefaults(null)).toEqual(SETTINGS_DEFAULTS);
    expect(withDefaults({ reminders: { minGapDays: 5 } }).reminders).toEqual({ ...SETTINGS_DEFAULTS.reminders, minGapDays: 5 });
  });

  it('D44: a value stored under the retired weeklyMax key is dropped and min_gap_days takes its default', () => {
    const values = withDefaults({ reminders: { weeklyMax: 5, sendTime: '21:00' } });
    expect(values.reminders).toEqual({ ...SETTINGS_DEFAULTS.reminders, sendTime: '21:00' });
    expect(values.reminders.minGapDays).toBe(2);
    expect(toApiValues(values).reminders).not.toHaveProperty('weekly_max');
  });
});
