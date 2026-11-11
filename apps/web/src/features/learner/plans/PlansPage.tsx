'use client';

import { ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useFormat } from '@/app-shell/format';
import { useAppConfig, useEntitlements, type Entitlements } from '@/app-shell/queries';
import { site } from '@/lib/site';
import { Button } from '@/ui/Button';
import { ChoiceCard, ChoiceCardGroup } from '@/ui/ChoiceCard';
import { SkeletonBlocks } from '@/ui/Skeleton';
import { ErrorState } from '@/ui/States';
import { Tag } from '@/ui/Tag';
import { CompareTable } from './CompareTable';
import { PlanCard } from './PlanCard';
import { bestPeriod, periodOffer, type Months, type Prices } from './period-offer';
import { SubscriptionRows } from './SubscriptionRows';
import { useBuyOrder } from './use-buy-order';

type Source = Entitlements['sources'][number];
const MONTHS: Months[] = ['1', '3', '12'];
/** "tới hết 31/12/2026": an end at the first instant of 1/1 is the last day before it. */
const lastDay = (endsAt: string) => new Date(Date.parse(endsAt) - 1);
const DAY_MS = 86_400_000;

// raw-ok: Figma's "0 ₫" is Bricolage ExtraBold 40 / -0.84, a size no token has (as the receipt amount of M7.6)
const FREE_PRICE = 'font-wm-display text-[2.5rem] font-extrabold leading-tight tracking-[-0.021em] text-wm-ink';
// raw-ok: the price of a period card is Bricolage Bold 18, a size no token has
const PERIOD_PRICE = 'font-wm-display text-[1.125rem] font-bold leading-snug text-wm-ink';
const LINK = 'font-semibold text-wm-accent underline underline-offset-2 outline-none focus-visible:outline-3 focus-visible:outline-wm-accent';

/**
 * How long the running prepaid period is: 1, 3 or 12 months (launch prep B: a period is bought for one of these and runs from its start
 * to the end of the same day N months later), read back from its dates, since a month is 28 to 31 days and the gaps between the three
 * lengths are wide. Null for any other source (a plan grant has no length) or a length that is none of the three.
 */
export function prepaidMonths(source: { kind: string; starts_at: string | null; ends_at: string | null } | undefined): number | null {
  if (source?.kind !== 'prepaid' || !source.starts_at || !source.ends_at) return null;
  const months = Math.round((Date.parse(source.ends_at) - Date.parse(source.starts_at)) / DAY_MS / 30.44);
  return months === 1 || months === 3 || months === 12 ? months : null;
}

/**
 * Gói học `/app/plans` (Figma 123:4196 / 123:4401, M7 Figma B §1): a centred header, Free and Pro side by side from 1024 px, the
 * subscription rows (fake provider only), and the comparison table. Pro is bought here for 1, 3 or 12 months, paid once through payOS
 * and not renewed (launch prep B design §3.8); a learner who is Pro can buy another period, which follows the one running.
 */
export function PlansPage() {
  const t = useTranslations('App.plans');
  const format = useFormat();
  const errorText = useErrorMessage();
  const config = useAppConfig();
  const entitlements = useEntitlements();
  const [months, setMonths] = useState<Months>('12');

  let body;
  if (config.isPending || entitlements.isPending) body = <SkeletonBlocks />;
  else if (config.isError || entitlements.isError) {
    const failed = config.isError ? config : entitlements;
    body = <ErrorState message={errorText(failed.error)} onRetry={() => void failed.refetch()} />;
  } else {
    const plans = config.data.plans;
    const groups = config.data.learning.groups_per_user;
    const plan = entitlements.data.plan;
    const source: Source | undefined = entitlements.data.sources.find((s) => s.kind === 'grant_plan' || s.kind === 'subscription' || s.kind === 'prepaid');
    const onPro = plan === 'pro';
    // Where the unbroken Pro ends (a plan grant or the last prepaid period of a chain); a subscription or a trial still shows its own end.
    const endsAt = entitlements.data.pro_until ?? source?.ends_at ?? null;
    const end = endsAt ? format.date(lastDay(endsAt), 'numeric') : null;
    const upcoming = entitlements.data.upcoming_periods ?? [];
    const prices = plans.pro.prices;
    const freeAi = plans.free.ai_practice_per_cycle + plans.free.ai_lookup_per_cycle > 0;

    body = (
      <>
        {/* Owner 27/10/2026: no line about the end under "Bạn đang dùng gói Pro"; the Pro card already says until when. */}
        <header className="mx-auto flex max-w-225 flex-col items-center gap-2 text-center">
          <h1 className="font-wm-display text-wm-app-title-mobile text-wm-ink md:text-wm-app-title">
            {onPro ? t('titlePro') : plan === 'trial' ? t('titleTrial') : t('title')}
          </h1>
          <p className="max-w-175 font-wm-sans text-wm-base text-wm-muted">{t('lead')}</p>
          {plan === 'trial' && end && <p className="font-wm-sans text-wm-small text-wm-muted">{t('trialUntil', { date: end })}</p>}
        </header>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <PlanCard
            className="lg:w-117.5 lg:shrink-0"
            name={t('free')}
            tags={plan === 'free' && <Tag mono>{t('yours')}</Tag>}
            intro={
              <p className="flex flex-wrap items-baseline gap-2">
                <span className={FREE_PRICE}>{format.money(0, 'VND')}</span>
                <span className="font-wm-sans text-wm-small text-wm-muted">{t('freePriceNote')}</span>
              </p>
            }
            perks={[
              { text: t('freeList.review'), included: true },
              { text: t('freeList.lookup', { groups }), included: true },
              { text: t('freeList.sessions', { count: plans.free.practice_sessions_per_day }), included: true },
              // The monthly allowance, from the config; both numbers 0 means the admin switched Free AI off (LA3#11).
              freeAi
                ? { text: t('freeList.ai', { practice: plans.free.ai_practice_per_cycle, lookup: plans.free.ai_lookup_per_cycle }), included: true }
                : { text: t('freeList.aiOff'), included: false },
            ]}
            footer={
              <>
                <p className="font-wm-sans text-wm-small text-wm-muted">{t('freeAds')}</p>
                {plan === 'free' && <p className="font-wm-mono text-wm-mono font-medium text-wm-muted">{t('usingThis')}</p>}
              </>
            }
          />
          <PlanCard
            className="lg:flex-1"
            highlight
            name={t('pro')}
            tags={
              <>
                <Tag tone="accent" mono>{t('proBadge')}</Tag>
                {onPro && <Tag mono>{t('yours')}</Tag>}
              </>
            }
            intro={
              <>
                <p className="font-wm-sans text-wm-small text-wm-muted">{t('proLine')}</p>
                {onPro && (end || upcoming.length > 0) && (
                  <div className="flex flex-col gap-0.5">
                    {end && <p className="font-wm-sans text-wm-small-strong text-wm-ink">{t('until', { date: end })}</p>}
                    {upcoming.length > 0 && (
                      <ul className="flex flex-col gap-0.5 font-wm-sans text-wm-caption text-wm-muted">
                        {upcoming.map((period, index) => (
                          <li key={period.id}>
                            {t(index === 0 ? 'nextPeriod' : 'thenPeriod', {
                              from: format.date(period.starts_at, 'numeric'), to: format.date(lastDay(period.ends_at), 'numeric'),
                            })}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {prices && <PeriodChoice prices={prices} months={months} onChange={setMonths} />}
              </>
            }
            perks={[
              { text: t('proList.aiWrite'), included: true },
              { text: t('proList.aiLookup'), included: true },
              { text: t('proList.ai', { practice: plans.pro.ai_practice_per_cycle, lookup: plans.pro.ai_lookup_per_cycle }), included: true },
              { text: t('proList.sessions', { count: plans.pro.practice_sessions_per_day }), included: true },
              { text: t('proList.ads'), included: true },
              { text: t('proList.allFree'), included: true },
            ]}
            footer={
              prices && (
                <BuyBlock
                  months={months}
                  price={prices[months]}
                  runningMonths={onPro ? prepaidMonths(source) : null}
                  // The new period starts where the running Pro ends: the raw end, not the last day.
                  startsAt={onPro ? endsAt : null}
                />
              )
            }
          />
        </div>
        <SubscriptionRows sources={entitlements.data.sources} />
        <CompareTable plans={plans} groups={groups} />
      </>
    );
  }

  return (
    // The (chrome) layout draws the frame and the main landmark (giao diện mới M1.10).
    <div className="mx-auto flex w-full max-w-290 flex-col gap-5 md:gap-6">{body}</div>
  );
}

/** The three period cards (M7 Figma B §1.3): saving note, struck price (not read: the note says the saving), price, price a month. */
function PeriodChoice({ prices, months, onChange }: { prices: Prices; months: Months; onChange: (months: Months) => void }) {
  const t = useTranslations('App.plans');
  const format = useFormat();
  const best = bestPeriod(prices);
  return (
    <ChoiceCardGroup label={t('period')} hideLabel value={months} onChange={onChange}>
      {MONTHS.map((id) => {
        const offer = periodOffer(prices, id);
        const saving = offer.saving !== null && offer.saving >= 1 ? offer.saving : null;
        return (
          <ChoiceCard
            key={id}
            value={id}
            title={t(`periods.${id}`)}
            note={saving === null ? undefined : t(id === best ? 'savingBest' : 'saving', { percent: saving })}
            trailing={
              <span className="flex flex-col items-end">
                {offer.struck !== null && (
                  <span aria-hidden className="font-wm-sans text-wm-mono text-wm-muted line-through">{format.money(offer.struck, 'VND')}</span>
                )}
                <span className={PERIOD_PRICE}>{format.money(offer.price, 'VND')}</span>
                <span className="font-wm-sans text-wm-mono text-wm-muted">
                  {id === '1' ? t('perMonth') : t('perMonthApprox', { price: format.money(offer.perMonth, 'VND') })}
                </span>
              </span>
            }
          />
        );
      })}
    </ChoiceCardGroup>
  );
}

/** The chosen length against the running prepaid period: the same is locked, a longer one is an upgrade (owner 05/11/2026). */
function periodState(months: Months, runningMonths: number | null): 'buy' | 'locked' | 'upgrade' {
  if (runningMonths === null) return 'buy';
  const chosen = Number(months);
  return chosen === runningMonths ? 'locked' : chosen > runningMonths ? 'upgrade' : 'buy';
}

/**
 * The full-width buy button and what follows it (owner 05/11/2026, Part 7 constraints): the error line, when the new period starts (on
 * Pro, unless the button is locked), one payment with no renewal and no automatic refund with the support email, then the Terms.
 */
function BuyBlock({ months, price, runningMonths, startsAt }: {
  months: Months;
  price: number;
  /** The length of the running prepaid period: the same length is locked, a longer one is an upgrade (owner 05/11/2026). */
  runningMonths: number | null;
  startsAt: string | null;
}) {
  const t = useTranslations('App.plans');
  const locale = useLocale();
  const format = useFormat();
  const order = useBuyOrder();
  const state = periodState(months, runningMonths);
  const period = t(`periods.${months}`);
  const locked = state === 'locked';

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant={locked ? 'secondary' : 'primary'}
        className="w-full"
        isDisabled={locked}
        onPress={() => order.buy(months, price)}
        isPending={order.isPending}
      >
        {locked ? t('currentPeriod') : state === 'upgrade' ? t('upgrade', { period }) : t('buy', { period })}
        {!locked && <ArrowRight aria-hidden className="size-4" />}
      </Button>
      {order.error && (
        <p role="alert" className="font-wm-sans text-wm-small text-wm-fail">
          {order.error}
        </p>
      )}
      {startsAt && !locked && <p className="font-wm-sans text-wm-caption text-wm-muted">{t('startsOn', { date: format.date(startsAt, 'numeric') })}</p>}
      <p className="font-wm-sans text-wm-caption text-wm-muted">
        {t('oneTime', { period })}{' '}
        {t.rich('noRefund', {
          email: site.supportEmail,
          mail: (chunks) => (
            <a href={`mailto:${site.supportEmail}`} className={LINK}>
              {chunks}
            </a>
          ),
        })}
      </p>
      <Link href={`/${locale}/terms`} className={`w-fit font-wm-sans text-wm-caption ${LINK}`}>
        {t('termsLink')}
      </Link>
    </div>
  );
}
