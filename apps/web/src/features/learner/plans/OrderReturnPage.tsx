'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useFormat } from '@/app-shell/format';
import { ENTITLEMENTS_KEY } from '@/app-shell/queries';
import { useApi } from '@/app-shell/session/session-context';
import { cn } from '@/lib/cn';
import { site } from '@/lib/site';
import { ButtonLink } from '@/ui/ButtonLink';
import { Card } from '@/ui/Card';
import { ErrorState } from '@/ui/States';
import { TEXT_BUTTON_BASE, TEXT_BUTTON_TONE } from '@/ui/TextButton';

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

/** "tới hết 05/12/2026": an end at the first instant of the next day is the last day before it. */
const lastDay = (endsAt: string) => new Date(Date.parse(endsAt) - 1);

/**
 * `/app/plans/order?order=<id>`, where payOS sends the payer back (DB32, design §3.8). It trusts the order's own state, never what payOS
 * added to the address (`code`, `id`, `cancel`, `status`, `orderCode`): asks payOS once through `check`, then reads the order every 3 s for
 * up to 2 minutes. Money that has not arrived by then is not an error: the plan opens by itself when it does.
 *
 * Giao diện mới M7.10 (Figma 123:4598 / 123:4690, 123:4774; M7 Figma B §2–§3): one card, 560 px from 768 px, inside one `role="status"`
 * element that stays mounted, so the change from waiting to paid is announced. Waiting states blink a navy dot (motion doc §6); ended and
 * not-found ones have a still red dot.
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
    <p className="font-wm-sans text-wm-small text-wm-muted">
      {t.rich('contact', {
        email: site.supportEmail,
        mail: (chunks) => (
          <a href={`mailto:${site.supportEmail}`} className={LINK}>
            {chunks}
          </a>
        ),
      })}
    </p>
  );
  const toPlans = (
    <ButtonLink href={`/${locale}/app/plans`}>
      {t('toPlans')}
      <ArrowRight aria-hidden className="size-4" />
    </ButtonLink>
  );

  let card: ReactNode = null;
  let error: ReactNode = null;
  if (orderId === null || (order.error instanceof ApiError && order.error.problem.status === 404)) {
    card = <StateCard dot="stopped" title={t('notFound')} text={t('newOrder')}>{toPlans}</StateCard>;
  } else if (order.isError) {
    error = <ErrorState message={errorText(order.error)} onRetry={() => void order.refetch()} />;
  } else if (order.data === undefined) {
    card = <StateCard dot="waiting" title={t('checking')} />;
  } else if (order.data.status === 'paid') {
    const paid = order.data;
    const until = paid.period ? format.date(lastDay(paid.period.ends_at), 'numeric') : null;
    card = (
      <Card className="flex flex-col gap-4 border border-wm-line p-4 md:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-wm-pass-soft text-wm-pass">
            <Check aria-hidden className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="font-wm-display text-wm-card-title text-wm-ink">{t('paidTitle')}</h1>
            <p className="font-wm-sans text-wm-small text-wm-muted">
              {until
                ? t.rich('paid', { date: until, b: (chunks) => <strong className="font-semibold text-wm-ink">{chunks}</strong> })
                : t('paidNoDate')}
            </p>
          </div>
        </div>
        <dl className="flex flex-col rounded-wm-lg bg-wm-bg px-4 py-1">
          <Row label={t('rowPlan')} value={t('planValue', { period: tPlans(`periods.${String(paid.period_months) as '1' | '3' | '12'}`) })} />
          <Row label={t('rowAmount')} value={format.money(paid.amount, 'VND')} />
          <Row label={t('rowCode')} value={paid.description} />
        </dl>
        <div className="flex flex-wrap items-center gap-4">
          <ButtonLink href={`/${locale}/app`}>
            {t('start')}
            <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
          <Link href={`/${locale}/app/plans`} className={cn(TEXT_BUTTON_BASE, TEXT_BUTTON_TONE.normal)}>
            {t('seePlan')}
          </Link>
        </div>
      </Card>
    );
  } else if (order.data.status === 'needs_review' || order.data.status === 'closed') {
    card = <StateCard dot="waiting" title={t('needsReviewTitle')} text={t('needsReview')}>{contact}</StateCard>;
  } else if (order.data.status === 'pending') {
    // The dot keeps blinking after the 2-minute stop: the order is still pending, and the motion doc ends the blink at a status change.
    card = <StateCard dot="waiting" title={t('pendingTitle')} text={t('pending')}>{contact}</StateCard>;
  } else {
    card = <StateCard dot="stopped" title={t('ended')} text={t('newOrder')}>{toPlans}</StateCard>;
  }

  return (
    // The (chrome) layout draws the frame and the main landmark (giao diện mới M1.10). No page title besides the card's h1, no back link.
    <div className="mx-auto flex w-full flex-col md:w-140 md:pt-2">
      <div role="status">{card}</div>
      {error}
    </div>
  );
}

const LINK = 'font-semibold text-wm-accent underline underline-offset-2 outline-none focus-visible:outline-3 focus-visible:outline-wm-accent';
// raw-ok: Figma 123:4774 state titles are Bricolage Bold 22, a size no token has (as the comparison heading of Gói học)
const STATE_TITLE = 'font-wm-display text-[1.375rem] font-bold leading-tight text-wm-ink';

/**
 * A state other than paid (M7 Figma B §3): a 10 px dot, the title, one sentence, then what to do next. Waiting: a navy dot that blinks
 * (opacity 1 → .3 → 1 in 1.4 s, `animate-wm-pulse`); the reduced-motion rule of globals.css stops it. Stopped: a still red dot.
 */
function StateCard({ dot, title, text, children }: { dot: 'waiting' | 'stopped'; title: string; text?: string; children?: ReactNode }) {
  return (
    <Card className="flex flex-col items-start gap-3 border border-wm-line p-4 md:p-6">
      <span aria-hidden className={cn('size-2.5 rounded-full', dot === 'waiting' ? 'animate-wm-pulse bg-wm-accent' : 'bg-wm-fail')} />
      <h1 className={STATE_TITLE}>{title}</h1>
      {text && <p className="font-wm-sans text-wm-small text-wm-muted">{text}</p>}
      {children}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <dt className="shrink-0 font-wm-sans text-wm-small text-wm-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right font-wm-sans text-wm-small-strong tabular-nums text-wm-ink">{value}</dd>
    </div>
  );
}
