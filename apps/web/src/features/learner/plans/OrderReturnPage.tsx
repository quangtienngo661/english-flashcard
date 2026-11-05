'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Logo } from '@/app-chrome/Logo';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useFormat } from '@/app-shell/format';
import { ENTITLEMENTS_KEY } from '@/app-shell/queries';
import { useApi } from '@/app-shell/session/session-context';
import { ErrorState } from '@/app-ui/States';
import { site } from '@/lib/site';

/** `GET /v1/me/orders/:id` (launch prep B design §3.1). */
type OrderView = {
  id: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'failed' | 'needs_review' | 'closed';
  period_months: number;
  amount: number;
  description: string;
  expires_at: string;
  period: { starts_at: string; ends_at: string } | null;
};

// raw-ok: a regular expression for an id, not a Tailwind class
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POLL_MS = 3_000;
const GIVE_UP_MS = 2 * 60_000;

/** "tới hết 5/12/2026": an end at the first instant of the next day is the last day before it. */
const lastDay = (endsAt: string) => new Date(Date.parse(endsAt) - 1);

/**
 * `/app/plans/order?order=<id>`, where payOS sends the payer back (DB32, design §3.8). It trusts the order's own state, never what payOS
 * added to the address (`code`, `id`, `cancel`, `status`, `orderCode`): asks payOS once through `check`, then reads the order every 3 s for
 * up to 2 minutes. Money that has not arrived by then is not an error: the plan opens by itself when it does.
 */
export function OrderReturnPage() {
  const t = useTranslations('App.plans.order');
  const locale = useLocale();
  const format = useFormat();
  const api = useApi();
  const queryClient = useQueryClient();
  const errorText = useErrorMessage();
  const raw = useSearchParams().get('order');
  const orderId = raw !== null && UUID.test(raw) ? raw : null;
  const [checked, setChecked] = useState(false);
  const [startedAt] = useState(() => Date.now());

  // payOS is asked once; whatever it answers (a 429 for asking twice, a 404), the order is read next.
  useEffect(() => {
    if (orderId === null) return;
    let live = true;
    api.post(`/v1/me/orders/${orderId}/check`).catch(() => undefined).finally(() => {
      if (live) setChecked(true);
    });
    return () => {
      live = false;
    };
  }, [api, orderId]);

  const order = useQuery({
    queryKey: ['me', 'orders', orderId],
    enabled: orderId !== null && checked,
    retry: false,
    queryFn: () => api.get<OrderView>(`/v1/me/orders/${orderId}`),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status !== undefined && status !== 'pending') return false;
      return Date.now() - startedAt >= GIVE_UP_MS ? false : POLL_MS;
    },
  });

  const status = order.data?.status;
  useEffect(() => {
    if (status !== 'paid') return;
    void queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
    void queryClient.invalidateQueries({ queryKey: ['me', 'transactions'] });
  }, [status, queryClient]);

  const toPlans = (
    <Link href={`/${locale}/app/plans`} className="w-fit text-ui font-semibold text-primary underline underline-offset-2">
      {t('toPlans')}
    </Link>
  );
  const contact = (
    <p className="text-caption text-muted">
      {t.rich('contact', {
        email: site.contactEmail,
        mail: (chunks) => (
          <a href={`mailto:${site.contactEmail}`} className="font-semibold text-primary underline underline-offset-2">
            {chunks}
          </a>
        ),
      })}
    </p>
  );

  let body: ReactNode;
  if (orderId === null || (order.error instanceof ApiError && order.error.problem.status === 404)) {
    body = <Message title={t('notFound')}>{toPlans}</Message>;
  } else if (order.isError) {
    body = <ErrorState message={errorText(order.error)} onRetry={() => void order.refetch()} />;
  } else if (order.data === undefined) {
    body = <Message title={t('checking')} busy />;
  } else if (order.data.status === 'paid') {
    const until = order.data.period ? format.date(lastDay(order.data.period.ends_at), 'full') : null;
    body = (
      <Message title={until ? t('paid', { date: until }) : t('paidNoDate')}>
        <Link href={`/${locale}/app`} className="w-fit text-ui font-semibold text-primary underline underline-offset-2">
          {t('start')}
        </Link>
      </Message>
    );
  } else if (order.data.status === 'needs_review' || order.data.status === 'closed') {
    body = <Message title={t('needsReview')}>{contact}</Message>;
  } else if (order.data.status === 'pending') {
    body = (
      <Message title={t('pending')} busy>
        {contact}
      </Message>
    );
  } else {
    body = <Message title={t('ended')}>{toPlans}</Message>;
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="mx-auto flex max-w-6xl items-center px-4 py-4 md:px-8">
        <Link href={`/${locale}/app`} className="rounded-control outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <Logo tone="surface" />
        </Link>
      </header>
      <main id="main" className="mx-auto flex max-w-xl flex-col px-4 pb-12 md:px-8">
        {body}
      </main>
    </div>
  );
}

function Message({ title, busy, children }: { title: string; busy?: boolean; children?: ReactNode }) {
  return (
    <section className="mt-6 flex flex-col gap-4 rounded-feature border border-border bg-surface p-6 shadow-ledge-card">
      <h1 className="flex items-start gap-3 text-h2 font-extrabold text-ink">
        {busy && <LoaderCircle aria-hidden className="mt-1 size-5 shrink-0 text-muted motion-safe:animate-spin" />}
        {title}
      </h1>
      {children}
    </section>
  );
}
