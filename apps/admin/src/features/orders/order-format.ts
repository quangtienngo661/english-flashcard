import { useMemo } from 'react';
import { useLocale } from 'use-intl';
import { ADMIN_ZONE } from './orders-api';

/** Dates and money of the orders screen, in the admin's fixed zone: "05/11/2026", "10:02", "199.000 ₫", "05/11/2026 – 04/02/2027". */
export function useOrderFormat() {
  const locale = useLocale();
  return useMemo(() => {
    const tag = locale === 'en' ? 'en-US' : 'vi-VN';
    const date = new Intl.DateTimeFormat(tag, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: ADMIN_ZONE });
    const time = new Intl.DateTimeFormat(tag, { hour: 'numeric', minute: '2-digit', timeZone: ADMIN_ZONE, hour12: locale === 'en' });
    const money = new Intl.NumberFormat(tag, { style: 'currency', currency: 'VND' });
    /** A period ends at the first instant of the day after its last day ("tới hết"): the day shown is the day before its end. */
    const lastDay = (endsAt: string) => date.format(new Date(Date.parse(endsAt) - 1));
    return {
      date: (at: string) => date.format(new Date(at)),
      time: (at: string) => time.format(new Date(at)),
      /** Dong are whole numbers: the amount as stored. */
      money: (amount: number) => money.format(amount),
      lastDay,
      period: (startsAt: string, endsAt: string) => `${date.format(new Date(startsAt))} – ${lastDay(endsAt)}`,
    };
  }, [locale]);
}
