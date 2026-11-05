'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/app-chrome/Logo';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useFormat } from '@/app-shell/format';
import { APP_CONFIG_KEY, useAppConfig, useEntitlements, type Entitlements } from '@/app-shell/queries';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { Segmented } from '@/app-ui/Segmented';
import { ErrorState, FullScreenSpinner } from '@/app-ui/States';
import { cn } from '@/lib/cn';
import { site } from '@/lib/site';
import { CompareTable } from './CompareTable';
import { PlanCard } from './PlanCard';
import { SubscriptionRows } from './SubscriptionRows';

type Source = Entitlements['sources'][number];
type Months = '1' | '3' | '12';
const MONTHS: Months[] = ['1', '3', '12'];
/** "tới hết 31/12/2026": an end at the first instant of 1/1 is the last day before it. */
const lastDay = (endsAt: string) => new Date(Date.parse(endsAt) - 1);
const DAY_MS = 86_400_000;

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
 * K/52, K/53 `/app/plans`, full screen: Free and Pro, numbers from `plans` (design §8.7); no usage here (copy doc §12). Pro is bought here
 * for 1, 3 or 12 months, paid once through payOS and not renewed (launch prep B design §3.8); a learner who is Pro can buy another period,
 * which follows the one running.
 */
export function PlansPage() {
  const t = useTranslations('App.plans');
  const locale = useLocale();
  const format = useFormat();
  const errorText = useErrorMessage();
  const config = useAppConfig();
  const entitlements = useEntitlements();
  const [months, setMonths] = useState<Months>('12');
  const [compare, setCompare] = useState(false);

  let body;
  if (config.isPending || entitlements.isPending) body = <FullScreenSpinner />;
  else if (config.isError || entitlements.isError) {
    const failed = config.isError ? config : entitlements;
    body = <ErrorState message={errorText(failed.error)} onRetry={() => void failed.refetch()} />;
  } else {
    const plans = config.data.plans;
    const groups = config.data.learning.groups_per_user;
    const plan = entitlements.data.plan;
    const source: Source | undefined = entitlements.data.sources.find((s) => s.kind === 'grant_plan' || s.kind === 'subscription' || s.kind === 'prepaid');
    const onPro = plan === 'pro';
    const gift = onPro && source?.kind === 'grant_plan';
    // Where the unbroken Pro ends (a plan grant or the last prepaid period of a chain); a subscription or a trial still shows its own end.
    const endsAt = entitlements.data.pro_until ?? source?.ends_at ?? null;
    const end = endsAt ? format.date(lastDay(endsAt), 'full') : null;
    const upcoming = entitlements.data.upcoming_periods ?? [];
    const prices = plans.pro.prices;
    // Owner 27/10/2026: no line under "Bạn đang dùng gói Pro"; the Pro card already says until when.
    const subtitle = plan === 'trial' && end ? t('trialUntil', { date: end }) : null;

    body = (
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-caption font-semibold text-muted">{t('eyebrow')}</p>
          <h1 className="text-display font-extrabold text-ink">{onPro ? t('titlePro') : plan === 'trial' ? t('titleTrial') : t('title')}</h1>
          {subtitle && <p className="text-caption text-muted">{subtitle}</p>}
          {prices && (
            <Segmented
              label={t('period')}
              value={months}
              onChange={setMonths}
              options={MONTHS.map((id) => ({ id, label: t(`periods.${id}`) }))}
            />
          )}
        </div>
        <div className="grid w-full max-w-4xl items-start gap-5 md:grid-cols-2">
          <PlanCard
            name={t('free')}
            chip={plan === 'free' ? t('yours') : undefined}
            perks={[
              { text: t('freeList.review'), included: true },
              { text: t('freeList.lookup', { groups }), included: true },
              { text: t('freeList.sessions', { count: plans.free.practice_sessions_per_day }), included: true },
              // The monthly allowance, from the config; both numbers 0 means the admin switched Free AI off (LA3#11).
              plans.free.ai_practice_per_cycle + plans.free.ai_lookup_per_cycle > 0
                ? { text: t('freeList.ai', { practice: plans.free.ai_practice_per_cycle, lookup: plans.free.ai_lookup_per_cycle }), included: true }
                : { text: t('freeList.aiOff'), included: false },
            ]}
          >
            {plan === 'free' ? (
              <p className="rounded-inner bg-success-soft px-4 py-2.5 text-center text-ui font-semibold text-success">{t('usingThis')}</p>
            ) : (
              <p className="rounded-inner bg-neutral-soft px-4 py-2.5 text-center text-ui text-ink">{t('backToFree')}</p>
            )}
          </PlanCard>
          <PlanCard
            name={t('pro')}
            crown
            highlight
            badge={gift ? t('yoursGift') : onPro ? t('yours') : undefined}
            perks={[
              { text: t('proList.sessions', { count: plans.pro.practice_sessions_per_day }), included: true },
              { text: t('proList.ai', { count: plans.pro.ai_practice_per_cycle }), included: true },
              { text: t('proList.lookup', { count: plans.pro.ai_lookup_per_cycle }), included: true },
              { text: t('proList.ads'), included: true },
            ]}
            footnote={t('footnote')}
          >
            {onPro && (
              <>
                {end && <p className="text-ui text-ink">{t('until', { date: end })}</p>}
                {upcoming.length > 0 && (
                  <ul className="flex flex-col gap-0.5 text-caption text-muted">
                    {upcoming.map((period, index) => (
                      <li key={period.id}>
                        {t(index === 0 ? 'nextPeriod' : 'thenPeriod', {
                          from: format.date(period.starts_at, 'full'), to: format.date(lastDay(period.ends_at), 'full'),
                        })}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-caption text-muted">{t('afterEnd')}</p>
              </>
            )}
            {prices ? <BuyBlock months={months} price={prices[months]} startsAt={onPro ? endsAt : null} runningMonths={onPro ? prepaidMonths(source) : null} /> : <p className="text-caption text-muted">{t('proLine')}</p>}
          </PlanCard>
        </div>
        <SubscriptionRows sources={entitlements.data.sources} />
        <button
          type="button"
          aria-expanded={compare}
          onClick={() => setCompare((v) => !v)}
          className="flex items-center gap-1 rounded-sm text-ui font-semibold text-primary underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {t('compare')}
          <ChevronDown aria-hidden className={cn('size-4 transition-transform', compare && 'rotate-180')} />
        </button>
        {compare && (
          <div className="w-full max-w-4xl">
            <CompareTable plans={plans} groups={groups} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
        <Link href={`/${locale}/app`} className="rounded-control outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <Logo tone="surface" />
        </Link>
        <Link
          href={`/${locale}/app`}
          aria-label={t('close')}
          className="flex size-10 items-center justify-center rounded-full border border-border-strong text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X aria-hidden className="size-5" />
        </Link>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 pb-12 md:px-8">
        {body}
      </main>
    </div>
  );
}

/**
 * The price of the chosen period, the sentence that says what is bought, and [Mua] (design §3.8). A press creates the order with the price
 * the learner saw: if it changed meanwhile the server answers 409 `price-changed`, the prices are read again and nothing is charged. A
 * created order sends the browser to the payOS page (a full page load: the next stop is another site).
 */
function BuyBlock({ months, price, startsAt, runningMonths }: {
  months: Months;
  price: number;
  /** When a learner on Pro buys, the new period starts where the unbroken Pro ends (`pro_until`); null on Free. */
  startsAt: string | null;
  /** The length of the running prepaid period: the same length is locked, a longer one is an upgrade (owner 05/11/2026). */
  runningMonths: number | null;
}) {
  const t = useTranslations('App.plans');
  const locale = useLocale();
  const format = useFormat();
  const api = useApi();
  const queryClient = useQueryClient();
  const errorText = useErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const chosen = Number(months);
  const locked = runningMonths !== null && chosen === runningMonths;
  const upgrade = runningMonths !== null && chosen > runningMonths;

  // One Idempotency-Key per press (useSubmitOnce): a retry after a network error is the same order, a press with other content a new one.
  const create = useSubmitOnce((key) =>
    api.post<{ order_id: string; checkout_url: string }>(
      '/v1/me/orders', { period_months: Number(months), expected_amount: price, locale }, { idempotencyKey: key },
    ));

  async function buy() {
    setError(null);
    try {
      const created = await create.submit(`${months}:${price}`);
      if (created === undefined) return;
      setLeaving(true);
      window.location.assign(created.checkout_url);
    } catch (failure) {
      if (failure instanceof ApiError && failure.problem.slug === 'price-changed') {
        void queryClient.invalidateQueries({ queryKey: APP_CONFIG_KEY });
        setError(t('priceChanged'));
      } else if (failure instanceof ApiError && (failure.problem.status === 503 || failure.problem.slug === 'provider-unavailable')) {
        setError(t('buyUnavailable'));
      } else {
        setError(errorText(failure));
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-h2 font-extrabold text-ink">{format.money(price, 'VND')}</span>
        <span className="text-ui text-muted">{t('oneTime', { period: t(`periods.${months}`) })}</span>
      </p>
      {startsAt && !locked && <p className="text-caption text-muted">{t('startsOn', { date: format.date(startsAt, 'full') })}</p>}
      <p className="text-caption text-muted">
        {t.rich('noRefund', {
          email: site.contactEmail,
          mail: (chunks) => (
            <a href={`mailto:${site.contactEmail}`} className="font-semibold text-primary underline underline-offset-2">
              {chunks}
            </a>
          ),
        })}
      </p>
      <Link href={`/${locale}/terms`} className="w-fit text-caption font-semibold text-primary underline underline-offset-2">
        {t('termsLink')}
      </Link>
      <Button variant={locked ? 'quiet' : 'sticker'} size="lg" isDisabled={locked} onPress={() => void buy()} isPending={create.busy || leaving}>
        {locked ? t('currentPeriod') : upgrade ? t('upgrade', { period: t(`periods.${months}`) }) : t('buy')}
      </Button>
      {error && (
        <p role="alert" className="text-ui text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
