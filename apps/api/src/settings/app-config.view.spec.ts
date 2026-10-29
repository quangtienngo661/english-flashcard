import { describe, expect, it } from 'vitest';
import { appConfigView } from './app-config.view.js';
import { SETTINGS_DEFAULTS } from './settings.definitions.js';

describe('appConfigView (design §8.7)', () => {
  it('maps the defaults to the numbers the learner screens show', () => {
    expect(appConfigView(SETTINGS_DEFAULTS)).toEqual({
      practice: { max_questions_per_session: 20, default_questions_per_session: 10 },
      reminders: { send_time: '20:00' },
      learning: { backlog_after_days: 60, groups_per_user: 100 },
      account: { transaction_retention_years: 10 },
      plans: {
        free: { practice_sessions_per_day: 3 },
        trial: { ai_practice_per_cycle: 300, ai_lookup_per_cycle: 100 },
        pro: { practice_sessions_per_day: 30, ai_practice_per_cycle: 300, ai_lookup_per_cycle: 100 },
      },
    });
  });

  it('returns no other setting (design §14.20)', () => {
    const json = JSON.stringify(appConfigView(SETTINGS_DEFAULTS));
    for (const hidden of ['ai_daily_cap', 'aiDailyCap', 'usd', 'grace', 'ads', 'call_timeout']) expect(json).not.toContain(hidden);
  });
});
