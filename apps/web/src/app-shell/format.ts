'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import type { AppLocale } from '@/i18n/routing';
import { useSession } from './session/session-context';

export type DateStyle = 'weekdayDayMonth' | 'dayMonth' | 'full';

const INTL_LOCALE: Record<AppLocale, string> = { vi: 'vi-VN', en: 'en-US' };

// D13, copy doc §1.8: "Chủ Nhật, 18/10" / "Sunday, Oct 18"; "18/10" / "Oct 18"; "31/12/2026" / "Dec 31, 2026".
const DATE_OPTIONS: Record<AppLocale, Record<DateStyle, Intl.DateTimeFormatOptions>> = {
  vi: {
    weekdayDayMonth: { weekday: 'long', day: 'numeric', month: 'numeric' },
    dayMonth: { day: 'numeric', month: 'numeric' },
    full: { day: 'numeric', month: 'numeric', year: 'numeric' },
  },
  en: {
    weekdayDayMonth: { weekday: 'long', day: 'numeric', month: 'short' },
    dayMonth: { day: 'numeric', month: 'short' },
    full: { day: 'numeric', month: 'short', year: 'numeric' },
  },
};

// vi "20:00", "0:00"; en "8:00 PM", "12:00 AM".
const TIME_OPTIONS: Record<AppLocale, Intl.DateTimeFormatOptions> = {
  vi: { hour: 'numeric', minute: '2-digit', hourCycle: 'h23' },
  en: { hour: 'numeric', minute: '2-digit', hour12: true },
};

export type Format = {
  date(at: string | Date, style: DateStyle): string;
  time(at: string | Date): string;
  /** When a pool refills (D15): the clock time of `resets_at`. */
  resetAt(at: string): string;
  number(n: number): string;
  money(amountMinor: number, currency: string): string;
};

/** Dates and times always in the learner's zone, never the device's or the build server's (Review Focus 3). */
export function createFormat(locale: AppLocale, timeZone: string): Format {
  const tag = INTL_LOCALE[locale];
  const time = new Intl.DateTimeFormat(tag, { ...TIME_OPTIONS[locale], timeZone });
  const dates = Object.fromEntries(
    Object.entries(DATE_OPTIONS[locale]).map(([style, options]) => [style, new Intl.DateTimeFormat(tag, { ...options, timeZone })]),
  ) as Record<DateStyle, Intl.DateTimeFormat>;
  const numbers = new Intl.NumberFormat(tag);
  return {
    date: (at, style) => dates[style].format(new Date(at)),
    time: (at) => time.format(new Date(at)),
    resetAt: (at) => time.format(new Date(at)),
    number: (n) => numbers.format(n),
    money: (amountMinor, currency) => {
      const money = new Intl.NumberFormat(tag, { style: 'currency', currency });
      const digits = money.resolvedOptions().maximumFractionDigits ?? 0;
      return money.format(amountMinor / 10 ** digits);
    },
  };
}

/** The app's formats: the page locale and the signed-in learner's zone (`UTC` before sign-in). */
export function useFormat(): Format {
  const locale = useLocale() as AppLocale;
  const { state } = useSession();
  const timeZone = state.status === 'signed-in' || state.status === 'change-password' ? state.me.timezone : 'UTC';
  return useMemo(() => createFormat(locale, timeZone), [locale, timeZone]);
}
