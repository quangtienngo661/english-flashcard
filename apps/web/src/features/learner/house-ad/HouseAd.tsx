'use client';

import { ArrowRight, Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useFormat } from '@/app-shell/format';
import { useAppConfig, useEntitlements } from '@/app-shell/queries';
import { useSession } from '@/app-shell/session/session-context';
import { ButtonLink } from '@/ui/ButtonLink';
import { Dialog } from '@/ui/Dialog';
import { Tag } from '@/ui/Tag';
import { TextButton } from '@/ui/TextButton';
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
  const entitlementsLoaded = entitlements.data !== undefined;

  useEffect(() => {
    if (previous.current === pathname) return;
    // The account or the plan still loading: the navigation is noted, and counted, once both have arrived (this effect runs again then).
    if (me === null || !entitlementsLoaded) return;
    previous.current = pathname;
    // Read at call time: the build inlines the variable, and a test may set it.
    if (process.env.NEXT_PUBLIC_ADSENSE_CLIENT) return;
    if (ads?.show !== true || !SHOWS_ON.test(pathname)) return;
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
  }, [pathname, me, ads, entitlementsLoaded]);

  const price = config.data?.plans.pro.prices?.['1'];
  const perDay = config.data?.plans.pro.practice_sessions_per_day;
  const close = () => setShownAt(null);
  return (
    // Giao diện mới M7.11 (Figma 75:2094 / 75:2373, M7 Figma B §5): the kit's dialog with the Pro border, centred from 768 px.
    <Dialog
      isOpen={shownAt === pathname && ads?.show === true}
      onOpenChange={(next) => !next && close()}
      title={t('title')}
      closeLabel={t('close')}
      tone="pro"
      footer={
        <>
          <TextButton tone="muted" onPress={close} className="justify-center">
            {t('later')}
          </TextButton>
          <ButtonLink href={`/${locale}/app/plans`} onClick={close}>
            {t('cta')}
            <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
        </>
      }
    >
      {/* Drawn above the title: first in the column by CSS order, read after the title. */}
      <div className="-order-1 flex gap-1.5">
        <Tag tone="accent">{t('badgePro')}</Tag>
        <Tag tone="accent">{t('badgeAi')}</Tag>
      </div>
      <p className="font-wm-sans text-wm-small text-wm-muted">{t('lead')}</p>
      <ul className="flex flex-col gap-2 font-wm-sans text-wm-small text-wm-ink">
        {perDay !== undefined && <Perk>{t('sessions', { count: perDay })}</Perk>}
        <Perk>{t('ai')}</Perk>
      </ul>
      {price !== undefined && (
        <p className="font-wm-sans text-wm-base text-wm-muted">
          {t.rich('from', { price: format.money(price, 'VND'), b: (chunks) => <span className={PRICE}>{chunks}</span> })}
        </p>
      )}
    </Dialog>
  );
}

// raw-ok: Figma's price is Bricolage ExtraBold 40 / -0.84, a size no token has (as "0 ₫" on Gói học)
const PRICE = 'font-wm-display text-[2.5rem] font-extrabold leading-tight tracking-[-0.021em] text-wm-ink';

function Perk({ children }: { children: string }) {
  return (
    <li className="flex items-start gap-2">
      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-wm-pass" />
      {children}
    </li>
  );
}
