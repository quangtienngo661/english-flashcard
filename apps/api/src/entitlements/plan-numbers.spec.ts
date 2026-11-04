import { describe, expect, it } from 'vitest';
import { SETTINGS_DEFAULTS } from '../settings/index.js';
import { planNumbers } from './plan-numbers.js';

describe('planNumbers (launch prep A, design 6.6): the numbers of the plans from Settings', () => {
  it('the defaults: Free has 3 practice sessions a day, 15 AI questions and 5 AI lookups a month', () => {
    expect(planNumbers(SETTINGS_DEFAULTS.entitlements).free).toEqual({ practice_sessions: 3, ai_practice: 15, ai_lookup: 5 });
  });

  it('Pro and trial are unchanged', () => {
    const numbers = planNumbers(SETTINGS_DEFAULTS.entitlements);
    expect(numbers.pro).toEqual({ practice_sessions: 30, ai_practice: 300, ai_lookup: 100 });
    expect(numbers.trial).toEqual({ ai_practice: 300, ai_lookup: 100 });
  });

  it('LA3#11: an admin who sets both Free AI numbers to 0 gets Free without AI, as before launch prep A', () => {
    const settings = { ...SETTINGS_DEFAULTS.entitlements, freeAiPracticePerCycle: 0, freeAiLookupPerCycle: 0 };
    expect(planNumbers(settings).free).toEqual({ practice_sessions: 3, ai_practice: 0, ai_lookup: 0 });
  });

  it('each Free pool follows its own setting', () => {
    const settings = { ...SETTINGS_DEFAULTS.entitlements, freeAiPracticePerCycle: 40, freeAiLookupPerCycle: 0 };
    expect(planNumbers(settings).free).toEqual({ practice_sessions: 3, ai_practice: 40, ai_lookup: 0 });
  });
});
