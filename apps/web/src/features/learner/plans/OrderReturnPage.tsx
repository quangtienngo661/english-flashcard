'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Clock, LoaderCircle, X, type LucideIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useFormat } from '@/app-shell/format';
import { ENTITLEMENTS_KEY } from '@/app-shell/queries';
import { useApi } from '@/app-shell/session/session-context';
import { ErrorState } from '@/app-ui/States';
import { cn } from '@/lib/cn';
import { site } from '@/lib/site';

/** `GET /v1/me/orders/:id` (launch prep B design §3.1). */
type OrderView = {
  id: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'failed' | 'needs_review' | 'closed';
  period_months: 1 | 3 | 12;
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

  const tPlans = useTranslations('App.plans');
  const contact = (
    <p className="text-caption text-muted">
      {t.rich('contact', {
        email: site.supportEmail,
        mail: (chunks) => (
          <a href={`mailto:${site.supportEmail}`} className="font-semibold text-primary underline underline-offset-2">
            {chunks}
          </a>
        ),
      })}
    </p>
  );
  const toPlans = (
    <Link href={`/${locale}/app/plans`} className={STICKER}>
      {t('toPlans')}
    </Link>
  );

  let body: ReactNode;
  if (orderId === null || (order.error instanceof ApiError && order.error.problem.status === 404)) {
    body = <Message tone="neutral" title={t('notFound')} text={t('newOrder')}>{toPlans}</Message>;
  } else if (order.isError) {
    body = <ErrorState message={errorText(order.error)} onRetry={() => void order.refetch()} />;
  } else if (order.data === undefined) {
    body = <Message tone="waiting" title={t('checking')} />;
  } else if (order.data.status === 'paid') {
    const paid = order.data;
    const until = paid.period ? format.date(lastDay(paid.period.ends_at), 'full') : null;
    body = (
      <Message
        tone="success"
        title={t('paidTitle')}
        text={until ? t.rich('paid', { date: until, b: (chunks) => <strong className="font-semibold text-ink">{chunks}</strong> }) : t('paidNoDate')}
      >
        <dl className="flex flex-col border-y border-border text-ui">
          <Row label={t('rowPlan')} value={t('planValue', { period: tPlans(`periods.${String(paid.period_months) as '1' | '3' | '12'}`) })} />
          <Row label={t('rowAmount')} value={format.money(paid.amount, 'VND')} numeric />
          <Row label={t('rowCode')} value={paid.description} numeric />
        </dl>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
          <Link href={`/${locale}/app`} className={STICKER}>
            {t('start')}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
          <Link href={`/${locale}/app/plans`} className="text-ui font-semibold text-primary underline underline-offset-2">
            {t('seePlan')}
          </Link>
        </div>
      </Message>
    );
  } else if (order.data.status === 'needs_review' || order.data.status === 'closed') {
    body = <Message tone="review" title={t('needsReviewTitle')} text={t('needsReview')}>{contact}</Message>;
  } else if (order.data.status === 'pending') {
    body = <Message tone="waiting" title={t('pendingTitle')} text={t('pending')}>{contact}</Message>;
  } else {
    body = <Message tone="neutral" title={t('ended')} text={t('newOrder')}>{toPlans}</Message>;
  }

  return (
    // The (chrome) layout draws the frame and the main landmark (giao diện mới M1.10).
    <div className="mx-auto flex w-full max-w-xl flex-col">{body}</div>
  );
}

const STICKER =
  'inline-flex min-h-control-touch w-fit items-center gap-2 rounded-inner bg-accent px-6 text-body font-semibold text-on-accent shadow-ledge-accent outline-none transition duration-instant ease-standard hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-safe:active:translate-y-px';

type Tone = 'success' | 'waiting' | 'review' | 'neutral';
const TONE: Record<Tone, { box: string; icon: LucideIcon; spin?: boolean }> = {
  success: { box: 'bg-success-soft text-success', icon: Check },
  waiting: { box: 'bg-primary-soft text-primary', icon: LoaderCircle, spin: true },
  review: { box: 'bg-accent-soft text-warning', icon: Clock },
  neutral: { box: 'bg-neutral-soft text-muted', icon: X },
};

/** One state of the page (owner 05/11/2026): an icon, a short title, one sentence, then what to do next. */
function Message({ tone, title, text, children }: { tone: Tone; title: string; text?: ReactNode; children?: ReactNode }) {
  const { box, icon: Icon, spin } = TONE[tone];
  return (
    <section className="mt-10 flex flex-col gap-4 rounded-feature border border-border bg-surface p-6 shadow-soft-card md:mt-16 md:p-8">
      <span className={cn('flex size-12 items-center justify-center rounded-inner', box)}>
        <Icon aria-hidden className={cn('size-6', spin && 'motion-safe:animate-spin')} />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-h2 font-extrabold text-balance text-ink">{title}</h1>
        {text && <p className="text-body text-muted">{text}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, numeric }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border py-2.5 first:border-t-0">
      <dt className="text-muted">{label}</dt>
      <dd className={cn('font-semibold text-ink', numeric && 'tabular-nums')}>{value}</dd>
    </div>
  );
}
