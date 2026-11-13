// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import en from '../../messages/en.json';
import vi from '../../messages/vi.json';
import { LEVEL_FILL, LEVEL_INTERVAL_DAYS, LEVEL_TEXT, STATE_TEXT, useLevelInterval, useLevelName } from './levels';

// Part 10 P.1: SRS level 0–5 is named "Mới, Bậc 1–5" / "New, Level 1–5" and coloured by level (mockup L80, L93, L375).
function hook<T>(use: () => T, locale: 'vi' | 'en') {
  const messages = { App: (locale === 'vi' ? vi : en).App };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
  return renderHook(use, { wrapper }).result.current;
}

describe('level names and intervals', () => {
  it('names level 0 "Mới" / "New" and the others "Bậc n" / "Level n"', () => {
    const viName = hook(useLevelName, 'vi');
    const enName = hook(useLevelName, 'en');
    expect([0, 1, 2, 3, 4, 5].map((l) => viName(l as 0))).toEqual(['Mới', 'Bậc 1', 'Bậc 2', 'Bậc 3', 'Bậc 4', 'Bậc 5']);
    expect([0, 1, 2, 3, 4, 5].map((l) => enName(l as 0))).toEqual(['New', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']);
  });

  it('says when a level is reviewed again, singular for one day, and nothing for level 0', () => {
    const viInterval = hook(useLevelInterval, 'vi');
    const enInterval = hook(useLevelInterval, 'en');
    expect(viInterval(4)).toBe('ôn lại sau 14 ngày');
    expect(viInterval(1)).toBe('ôn lại sau 1 ngày');
    expect(enInterval(4)).toBe('review in 14 days');
    expect(enInterval(1)).toBe('review in 1 day');
    expect(enInterval(5)).toBe('review in 30 days');
    expect(viInterval(0)).toBeNull();
    expect(enInterval(0)).toBeNull();
  });

  it('maps every level to its interval in days', () => {
    expect(LEVEL_INTERVAL_DAYS).toEqual({ 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 });
  });

  it('maps every level to its fill and text class, and each row state to its text colour', () => {
    expect(LEVEL_FILL).toEqual({ 0: 'bg-wm-level-0', 1: 'bg-wm-level-1', 2: 'bg-wm-level-2', 3: 'bg-wm-level-3', 4: 'bg-wm-level-4', 5: 'bg-wm-level-5' });
    expect(LEVEL_FILL[5]).toBe('bg-wm-level-5');
    expect(LEVEL_TEXT[3]).toBe('text-wm-level-3');
    expect(STATE_TEXT).toEqual({ priority: 'text-wm-level-priority', due: 'text-wm-warn', new: 'text-wm-muted', ok: 'text-wm-pass' });
  });
});
