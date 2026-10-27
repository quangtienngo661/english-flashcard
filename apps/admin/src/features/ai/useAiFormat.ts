import { useLocale } from 'use-intl';
import { ADMIN_ZONE } from '../transactions/transactions-api';

/** Dates, numbers and money in the admin's fixed zone and the page's language: "15/10/2026 09:12", "1.240", "2,31 US$", "60.291 ₫". */
export function useAiFormat() {
  const locale = useLocale();
  const tag = locale === 'en' ? 'en-US' : 'vi-VN';
  const date = new Intl.DateTimeFormat(tag, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: ADMIN_ZONE });
  const time = new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit', timeZone: ADMIN_ZONE, hour12: locale === 'en' });
  const number = new Intl.NumberFormat(tag);
  const usd = new Intl.NumberFormat(tag, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const vnd = new Intl.NumberFormat(tag, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
  const price = new Intl.NumberFormat(tag, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return {
    date: (at: string) => date.format(new Date(at)),
    dateTime: (at: string) => `${date.format(new Date(at))} ${time.format(new Date(at))}`,
    /** "15:00" (vi), "3:00 PM" (en). */
    time: (at: Date) => time.format(at),
    number: (n: number) => number.format(n),
    usd: (amount: string) => usd.format(Number(amount)),
    vnd: (amount: number) => vnd.format(amount),
    /** A per-million-token price as the API sends it ("2.5000"): "2,50". */
    price: (amount: string) => price.format(Number(amount)),
  };
}
