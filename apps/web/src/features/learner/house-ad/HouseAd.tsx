'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useFormat } from '@/app-shell/format';
import { useAppConfig, useEntitlements } from '@/app-shell/queries';
import { useSession } from '@/app-shell/session/session-context';
import { Dialog } from '@/app-ui/Dialog';
import { localDay, readCounter, shouldShowHouseAd, writeCounter } from './house-ad-counter';

/** Where the dialog may appear: Nhóm and Tra từ, the same two pages the AdSense vignette may use (DB38). */
const SHOWS_ON = /^\/(?:vi|en)\/app\/(?:groups|lookup)$/;

/**
 * The Pro introduction a Free learner aged 16 or more sees instead of an ad (launch prep B design §4.2, `ads.show`): after a soft navigation
 * to Nhóm or Tra từ, at most `interstitial_per_day` times a day and `min_interval_minutes` apart, counted in this browser per learner. A full
 * page load, any other page, a `?q=` change (the pathname stays) and a storage that fails all show nothing. With an AdSense client set, the
 * vignette takes its place and this never shows (Q-B14). It holds no code of Google.
 */
export function HouseAd() {
  const t = useTranslations('App.houseAd');
  const locale = useLocale();
  const format = useFormat();
  const { state } = useSession();
  const entitlements = useEntitlements();
  const config = useAppConfig();
  const pathname = usePathname();
  // The pathname the dialog was opened on: it is open only while the learner is still there (any navigation closes it).
  const [shownAt, setShownAt] = useState<string | null>(null);
  const previous = useRef(pathname);
  const me = state.status === 'signed-in' ? state.me : null;
  const ads = entitlements.data?.ads;

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    // Read at call time: the build inlines the variable, and a test may set it.
    if (process.env.NEXT_PUBLIC_ADSENSE_CLIENT) return;
    if (me === null || ads?.show !== true || !SHOWS_ON.test(pathname)) return;
    const counter = readCounter(me.id);
    if (counter === 'unreadable') return;
    const now = new Date();
    if (!shouldShowHouseAd({ counter, now, zone: me.timezone, perDay: ads.interstitial_per_day, minIntervalMinutes: ads.min_interval_minutes })) return;
    const day = localDay(me.timezone, now);
    const count = counter !== null && counter.date === day ? counter.count + 1 : 1;
    // Counted before it shows: if the browser will not keep the count, nothing shows (it would show again on every navigation).
    if (!writeCounter(me.id, { date: day, count, last_at: now.getTime() })) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opens in reaction to a navigation (the browser's location), and the decision reads localStorage and the clock
    setShownAt(pathname);
  }, [pathname, me, ads]);

  const price = config.data?.plans.pro.prices?.['1'];
  const perDay = config.data?.plans.pro.practice_sessions_per_day;
  return (
    <Dialog
      isOpen={shownAt === pathname && ads?.show === true}
      onOpenChange={(next) => !next && setShownAt(null)}
      title={t('title')}
      closeLabel={t('close')}
    >
      <p className="text-body text-ink">{t('lead')}</p>
      <ul className="flex flex-col gap-1.5 text-ui text-ink">
        {perDay !== undefined && <li>{t('sessions', { count: perDay })}</li>}
        <li>{t('ai')}</li>
        <li>{t('noAds')}</li>
      </ul>
      {price !== undefined && <p className="text-ui font-semibold text-ink">{t('from', { price: format.money(price, 'VND') })}</p>}
      <Link
        href={`/${locale}/app/plans`}
        onClick={() => setShownAt(null)}
        className="inline-flex min-h-control items-center justify-center rounded-inner bg-accent px-4.5 text-ui font-semibold text-on-accent shadow-ledge-accent outline-none hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        {t('cta')}
      </Link>
    </Dialog>
  );
}
