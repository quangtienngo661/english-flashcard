'use client';

import { ChevronDown, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/app-chrome/Logo';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useFormat } from '@/app-shell/format';
import { useAppConfig, useEntitlements, type Entitlements } from '@/app-shell/queries';
import { Segmented } from '@/app-ui/Segmented';
import { ErrorState, FullScreenSpinner } from '@/app-ui/States';
import { cn } from '@/lib/cn';
import { CompareTable } from './CompareTable';
import { PlanCard } from './PlanCard';
import { SubscriptionRows } from './SubscriptionRows';

type Source = Entitlements['sources'][number];
/** "tới hết 31/12/2026": an end at the first instant of 1/1 is the last day before it. */
const lastDay = (endsAt: string) => new Date(Date.parse(endsAt) - 1);

/** K/52, K/53 `/app/plans`, full screen: Free and Pro, numbers from `plans` (design §8.7); no usage here (copy doc §12). */
export function PlansPage() {
  const t = useTranslations('App.plans');
  const locale = useLocale();
  const format = useFormat();
  const errorText = useErrorMessage();
  const config = useAppConfig();
  const entitlements = useEntitlements();
  const [period, setPeriod] = useState<'year' | 'month'>('year');
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
    const source: Source | undefined = entitlements.data.sources.find((s) => s.kind === 'grant_plan' || s.kind === 'subscription');
    const onPro = plan === 'pro';
    const gift = onPro && source?.kind === 'grant_plan';
    const end = source?.ends_at ? format.date(lastDay(source.ends_at), 'full') : null;
    // Owner 27/10/2026: no line under "Bạn đang dùng gói Pro"; the Pro card already says until when.
    const subtitle = plan === 'trial' && end ? t('trialUntil', { date: end }) : null;

    body = (
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-caption font-semibold text-muted">{t('eyebrow')}</p>
          <h1 className="text-display font-extrabold text-ink">{onPro ? t('titlePro') : plan === 'trial' ? t('titleTrial') : t('title')}</h1>
          {subtitle && <p className="text-caption text-muted">{subtitle}</p>}
          {!onPro && (
            <Segmented
              label={t('period')}
              value={period}
              onChange={setPeriod}
              options={[
                { id: 'year', label: t('year') },
                { id: 'month', label: t('month') },
              ]}
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
              { text: t('freeList.ai'), included: false },
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
            strip={gift ? t('yoursGift') : onPro ? t('yours') : t('notOnSale')}
            perks={[
              { text: t('proList.sessions', { count: plans.pro.practice_sessions_per_day }), included: true },
              { text: t('proList.ai', { count: plans.pro.ai_practice_per_cycle }), included: true },
              { text: t('proList.lookup', { count: plans.pro.ai_lookup_per_cycle }), included: true },
              { text: t('proList.ads'), included: true },
            ]}
            footnote={t('footnote')}
          >
            {onPro ? (
              <>
                {end && <p className="text-ui text-ink">{t('until', { date: end })}</p>}
                <p className="text-caption text-muted">{t('afterEnd')}</p>
              </>
            ) : (
              <>
                <p className="flex items-baseline gap-2">
                  <span className="text-h2 font-extrabold text-ink">{period === 'year' ? t('priceYear') : t('priceMonth')}</span>
                  <span className="text-ui text-muted">{period === 'year' ? t('perYear') : t('perMonth')}</span>
                </p>
                <p className="text-caption text-muted">{t('proLine')}</p>
              </>
            )}
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
