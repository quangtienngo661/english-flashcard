import { useMemo } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import { ADMIN_ZONE } from '../transactions/transactions-api';
import { lastDay, type AdminGrant } from './entitlements-api';

/** Grant dates in the admin's fixed zone: `22/10/2026`; a grant's "Tới ngày" is its last day (see `lastDay`). */
export function useGrantFormat() {
  const locale = useLocale();
  const t = useTranslations();
  return useMemo(() => {
    const tag = locale === 'en' ? 'en-US' : 'vi-VN';
    const full = new Intl.DateTimeFormat(tag, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: ADMIN_ZONE });
    const date = (at: string | Date) => full.format(new Date(at));
    /** `21/11` when it falls in the year of `anchor`, else the full date (vi-VN has no lone day and month: the year is cut off). */
    const short = (at: Date, anchor: string) => {
      const text = date(at);
      return locale !== 'en' && date(at).slice(-4) === date(anchor).slice(-4) ? text.slice(0, -5) : text;
    };
    return {
      date,
      lastDate: (endsAt: string) => date(new Date(new Date(endsAt).getTime() - 1)),
      /** "Gói Pro · đang hiệu lực từ 22/10/2026" */
      summary: (key: 'revoke.summary' | 'editDates.summary', grant: AdminGrant) =>
        t(`entitlements.${key}`, {
          kind: t(`entitlements.kinds.${grant.kind}`),
          status: t(`entitlements.statuses.${grant.status}`).toLocaleLowerCase(locale),
          date: date(grant.starts_at),
        }),
      /** "từ 22/10 → 25/10 · tới 21/11 → 21/12" for the dates a change moved. */
      change: (c: NonNullable<AdminGrant['last_change']>) => {
        const parts: string[] = [];
        if (c.old_starts_at !== c.new_starts_at) {
          parts.push(t('entitlements.editDates.changeFrom', { old: short(new Date(c.old_starts_at), c.created_at), new: short(new Date(c.new_starts_at), c.created_at) }));
        }
        if (c.old_ends_at !== c.new_ends_at) {
          const end = (iso: string) => short(new Date(`${lastDay(iso)}T12:00:00+07:00`), c.created_at);
          parts.push(t('entitlements.editDates.changeTo', { old: end(c.old_ends_at), new: end(c.new_ends_at) }));
        }
        return parts.join(' · ');
      },
    };
  }, [locale, t]);
}
