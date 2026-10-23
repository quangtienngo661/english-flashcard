'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { AppShell } from '@/app-chrome/AppShell';
import { PageTitle } from '@/app-chrome/PageTitle';
import { useFormat } from '@/app-shell/format';
import { useEntitlements } from '@/app-shell/queries';
import { useSession } from '@/app-shell/session/session-context';
import { Button } from '@/app-ui/Button';
import { EmptyState, FullScreenSpinner } from '@/app-ui/States';
import { BackLink } from '../practice/BackLink';
import { TransactionDetail } from './TransactionDetail';
import { TransactionRow } from './TransactionRow';
import { useTransactions, type Transaction } from './transactions-api';

/** K/95–K/95d, M/95–M/95c `/app/settings/transactions` (D18): payments, refunds, trials and staff grants, newest first. */
export function TransactionsPage() {
  const t = useTranslations('App.transactions');
  const locale = useLocale();
  const { state } = useSession();
  const list = useTransactions();
  const [open, setOpen] = useState<Transaction | null>(null);
  if (state.status !== 'signed-in') return null;
  const back = { href: `/${locale}/app/settings`, label: t('back') };
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  let content;
  if (list.isPending) content = <FullScreenSpinner />;
  else if (list.isError)
    content = (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-6">
        <h2 className="text-title font-bold text-ink">{t('errorTitle')}</h2>
        <p className="text-body text-muted">{t('errorBody')}</p>
        <Button variant="quiet" onPress={() => void list.refetch()}>
          {t('retry')}
        </Button>
      </div>
    );
  else if (items.length === 0) content = <EmptyState title={t('emptyTitle')} body={t('emptyBody')} />;
  else
    content = (
      <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 md:p-5">
        <div aria-hidden className="hidden grid-cols-7 gap-3 border-b border-border px-2 pb-2 text-caption text-muted md:grid">
          {(['date', 'kind', 'plan', 'amount', 'period', 'status'] as const).map((col) => (
            <span key={col}>{t(`cols.${col}`)}</span>
          ))}
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <TransactionRow key={item.id} item={item} onOpen={() => setOpen(item)} />
          ))}
        </ul>
        {list.hasNextPage && (
          <Button variant="quiet" className="w-fit" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>
            {t('more')}
          </Button>
        )}
        <p className="hidden text-caption text-muted md:block">{t('footWeb')}</p>
        <p className="text-caption text-muted md:hidden">{t('footPhone')}</p>
      </section>
    );

  return (
    <AppShell variant="sub" back={back} aside={<TransactionsAside />}>
      <BackLink {...back} />
      <PageTitle>{t('title')}</PageTitle>
      {content}
      {open && <TransactionDetail item={open} onClose={() => setOpen(null)} />}
    </AppShell>
  );
}

/** The current plan and how long it lasts, then what each kind means (web only). */
function TransactionsAside() {
  const t = useTranslations('App');
  const format = useFormat();
  const { data } = useEntitlements();
  if (!data) return null;
  const plan = t(`chrome.plan.${data.plan}`);
  const grant = data.sources.find((s) => s.kind === 'grant_plan' && s.ends_at);
  const paid = data.sources.find((s) => s.kind === 'subscription' && (s.renews_at ?? s.ends_at));
  // A grant's end is an exclusive midnight: the last day is the day before (as the rows).
  const lastDay = (at: string) => format.date(new Date(new Date(at).getTime() - 1), 'full');
  const line = grant
    ? t('transactions.planGrant', { plan, date: lastDay(grant.ends_at!) })
    : paid
      ? t('transactions.planUntil', { plan, date: lastDay((paid.renews_at ?? paid.ends_at)!) })
      : t('transactions.planOnly', { plan });
  return (
    <>
      <section className="rounded-card bg-accent-soft p-5 shadow-ledge-accent">
        <h2 className="text-body font-semibold text-ink">{t('transactions.planCard')}</h2>
        <p className="text-caption text-muted">{line}</p>
      </section>
      <section className="hidden flex-col gap-2 rounded-card border border-border bg-surface p-5 md:flex">
        <h2 className="text-body font-semibold text-ink">{t('transactions.aboutTitle')}</h2>
        {(['about1', 'about2', 'about3'] as const).map((key) => (
          <p key={key} className="text-caption text-ink">
            {t(`transactions.${key}`)}
          </p>
        ))}
      </section>
    </>
  );
}
