import { describe, expect, it } from 'vitest';
import { appConfigView } from './app-config.view.js';
import { SETTINGS_DEFAULTS } from './settings.definitions.js';

describe('appConfigView (design §8.7)', () => {
  it('maps the defaults to the numbers the learner screens show', () => {
    expect(appConfigView(SETTINGS_DEFAULTS)).toEqual({
      practice: {
        max_questions_per_session: 20, default_questions_per_session: 10, session_max_mode: 'fixed', ai_max_mode: 'percent',
        ai_max_fixed: 5, ai_max_percent: 50, ai_placement: 'even', scope_questions_max: 100,
      },
      reminders: { send_time: '20:00' },
      learning: { backlog_after_days: 60, groups_per_user: 100 },
      account: { transaction_retention_years: 10 },
      plans: {
        free: { practice_sessions_per_day: 3, ai_practice_per_cycle: 15, ai_lookup_per_cycle: 5 },
        trial: { ai_practice_per_cycle: 300, ai_lookup_per_cycle: 100 },
        pro: {
          practice_sessions_per_day: 30, ai_practice_per_cycle: 300, ai_lookup_per_cycle: 100,
          prices: { '1': 79000, '3': 199000, '12': 599000 },
        },
      },
    });
  });

  it('launch prep B §3.5: the prices follow the settings, one number per 1, 3 and 12 months', () => {
    const settings = { ...SETTINGS_DEFAULTS, entitlements: { ...SETTINGS_DEFAULTS.entitlements, proPrice1mVnd: 89000, proPrice3mVnd: 229000, proPrice12mVnd: 699000 } };
    expect(appConfigView(settings).plans.pro.prices).toEqual({ '1': 89000, '3': 229000, '12': 699000 });
  });

  it('returns no other setting (design §14.20)', () => {
    const json = JSON.stringify(appConfigView(SETTINGS_DEFAULTS));
    for (const hidden of ['ai_daily_cap', 'aiDailyCap', 'usd', 'grace', 'ads', 'call_timeout']) expect(json).not.toContain(hidden);
  });

  it('LA3#16: the Free numbers follow the setting, so the landing (which pins 15 and 5) and the setting cannot drift unseen', () => {
    const settings = structuredClone(SETTINGS_DEFAULTS);
    settings.entitlements.freeAiPracticePerCycle = 0;
    settings.entitlements.freeAiLookupPerCycle = 8;
    expect(appConfigView(settings).plans.free).toEqual({ practice_sessions_per_day: 3, ai_practice_per_cycle: 0, ai_lookup_per_cycle: 8 });
  });
});
