import { describe, expect, it } from 'vitest';
import {
  applyPatch, changedFields, crossFieldViolations, SETTINGS_DEFAULTS, settingsValuesPatchSchema, toApiValues, withDefaults,
} from './settings.definitions.js';

const issues = (input: unknown) => {
  const result = settingsValuesPatchSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('settings definitions', () => {
  it('design §9: defaults are true, 20:00, 3, 7, 60, 20, 100, 60', () => {
    expect(toApiValues(SETTINGS_DEFAULTS)).toEqual({
      reminders: { enabled: true, send_time: '20:00', weekly_max: 3, inactive_after_days: 7, stop_after_days: 60 },
      learning: { new_per_group_per_day: 20, reviews_per_group_per_day: 100, backlog_after_days: 60 },
    });
  });

  it('B3E30: each bound accepts its edges and refuses one step outside, naming the key', () => {
    const edges: Array<[string, string, unknown, unknown, unknown]> = [
      ['reminders', 'send_time', '06:00', '22:00', '05:45'], ['reminders', 'send_time', '06:00', '22:00', '22:15'],
      ['reminders', 'weekly_max', 0, 7, 8], ['reminders', 'weekly_max', 0, 7, -1],
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
    expect(issues({ reminders: { weekly_max: 2.5 } })).toEqual(['reminders.weekly_max']);
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
    const next = applyPatch(SETTINGS_DEFAULTS, { reminders: { send_time: '21:00', weekly_max: 3 }, learning: { backlog_after_days: 90 } });
    expect(next).toEqual({ ...SETTINGS_DEFAULTS,
      reminders: { ...SETTINGS_DEFAULTS.reminders, sendTime: '21:00' },
      learning: { ...SETTINGS_DEFAULTS.learning, backlogAfterDays: 90 } });
    expect(SETTINGS_DEFAULTS.reminders.sendTime).toBe('20:00');
    expect(changedFields(SETTINGS_DEFAULTS, next)).toEqual([
      { key: 'reminders.send_time', oldValue: '20:00', newValue: '21:00' },
      { key: 'learning.backlog_after_days', oldValue: 60, newValue: 90 },
    ]);
  });

  it('stored values missing a key fall back to its default', () => {
    expect(withDefaults(null)).toEqual(SETTINGS_DEFAULTS);
    expect(withDefaults({ reminders: { weeklyMax: 5 } }).reminders).toEqual({ ...SETTINGS_DEFAULTS.reminders, weeklyMax: 5 });
  });
});
