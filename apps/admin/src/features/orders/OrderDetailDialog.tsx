import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useTranslations } from 'use-intl';
import { useApi } from '../../auth/session-context';
import { useErrorMessage } from '../../api/use-error-message';
import { userLabel } from '../../api/user-ref';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { CancelOrderDialog, ConfirmPaymentDialog, refreshOrders, ResolveOrderDialog, RevokePeriodDialog } from './OrderActions';
import { useOrderFormat } from './order-format';
import { getOrder, type AdminOrder } from './orders-api';
import { statusTone } from './OrdersPage.parts';

type Sub = { kind: 'confirm' } | { kind: 'cancel' } | { kind: 'resolve' } | { kind: 'revoke'; periodId: string; range: string };

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-2">
    <h3 className="text-ui font-semibold text-ink">{title}</h3>
    {children}
  </section>
);

const Rows = ({ rows }: { rows: Array<[string, ReactNode]> }) => (
  <dl className="flex flex-col divide-y divide-border">
    {rows.map(([label, value]) => (
      <div key={label} className="flex items-start justify-between gap-4 py-2">
        <dt className="text-ui text-muted">{label}</dt>
        <dd className="min-w-0 wrap-anywhere text-right text-ui font-semibold text-ink">{value}</dd>
      </div>
    ))}
  </dl>
);

/**
 * A/91 one order, read from `GET /v1/admin/orders/:id`: the payments it received, the periods it opened, the learner's Pro now, why it needs
 * a look, the refund information kept for a deleted account. The four staff actions hang off it, each offered only where the server's rules
 * can allow it (they answer 409 when the order changed meanwhile).
 */
export function OrderDetailDialog({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
  const t = useTranslations();
  const api = useApi();
  const client = useQueryClient();
  const format = useOrderFormat();
  const errorText = useErrorMessage();
  const [sub, setSub] = useState<Sub | null>(null);
  const detail = useQuery({ queryKey: ['orders', 'detail', order.id], queryFn: () => getOrder(api, order.id) });
  const d = detail.data;

  const done = () => {
    setSub(null);
    refreshOrders(client);
  };

  const canConfirm = d !== undefined && d.paid_via === null && d.status !== 'closed' && d.review_reason !== 'account-deleted';
  const canCancel = d !== undefined && d.status === 'pending';
  const canResolve = d !== undefined && (d.status === 'needs_review' || (d.status === 'paid' && d.review_reason !== null));

  return (
    <Dialog
      isOpen
      onOpenChange={(isOpen) => !isOpen && sub === null && onClose()}
      title={t('orders.detail.title')}
      size="lg"
      actions={
        <>
          {canConfirm && <Button onPress={() => setSub({ kind: 'confirm' })}>{t('orders.actions.confirm')}</Button>}
          {canCancel && <Button variant="secondary" onPress={() => setSub({ kind: 'cancel' })}>{t('orders.actions.cancel')}</Button>}
          {canResolve && <Button variant="secondary" onPress={() => setSub({ kind: 'resolve' })}>{t('orders.actions.resolve')}</Button>}
          <Button variant="secondary" onPress={onClose}>
            {t('orders.detail.close')}
          </Button>
        </>
      }
    >
      {detail.isPending && <p className="text-ui text-muted">{t('common.loading')}</p>}
      {detail.isError && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-ui text-danger">{errorText(detail.error)}</p>
          <Button variant="secondary" onPress={() => void detail.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      )}
      {d && (
        <div className="flex flex-col gap-5">
          <Rows
            rows={[
              [t('orders.detail.user'), userLabel(d.user, t)],
              [t('orders.detail.userId'), d.user.id],
              [t('orders.detail.description'), d.description],
              [t('orders.detail.code'), String(d.order_code)],
              [t('orders.detail.plan'), `${t('orders.months', { count: d.period_months })} · ${format.money(d.amount)}`],
              [t('orders.detail.status'), <Badge key="s" tone={statusTone(d.status)}>{t(`orders.statuses.${d.status}`)}</Badge>],
              ...(d.review_reason ? [[t('orders.detail.reason'), t(`orders.reasons.${d.review_reason}`)] as [string, ReactNode]] : []),
              ...(d.paid_via ? [[t('orders.detail.via'), t(`orders.sources.${d.paid_via}`)] as [string, ReactNode]] : []),
              [t('orders.detail.createdAt'), `${format.date(d.created_at)}, ${format.time(d.created_at)}`],
              [t('orders.detail.expiresAt'), `${format.date(d.expires_at)}, ${format.time(d.expires_at)}`],
            ]}
          />

          <Section title={t('orders.detail.paymentsTitle')}>
            {d.payments.length === 0 ? (
              <p className="text-ui text-muted">{t('orders.detail.noPayments')}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {d.payments.map((p) => (
                  <li key={p.id} className="flex flex-col gap-0.5 py-2 text-ui">
                    <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                      {format.money(p.amount)}
                      <Badge tone="primary">{t(`orders.sources.${p.source}`)}</Badge>
                      <Badge tone={p.outcome === 'opened-period' ? 'success' : p.outcome === 'attached' || p.outcome === 'counted' ? 'neutral' : 'warning'}>
                        {t(`orders.outcomes.${p.outcome}`)}
                      </Badge>
                    </span>
                    <span className="break-all text-ink">{p.reference}</span>
                    <span className="text-xs text-muted">
                      {format.date(p.received_at)}, {format.time(p.received_at)}
                      {p.provider_time ? ` · ${t('orders.detail.providerTime', { time: p.provider_time })}` : ''}
                    </span>
                    {p.reason && <span className="break-words text-xs text-muted">{p.reason}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t('orders.detail.periodsTitle')}>
            {d.periods.length === 0 ? (
              <p className="text-ui text-muted">{t('orders.detail.noPeriods')}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {d.periods.map((period) => {
                  const range = format.period(period.starts_at, period.ends_at);
                  return (
                    <li key={period.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-ui">
                      <span className="flex flex-col">
                        <span className="font-semibold text-ink">{range}</span>
                        {period.revoked_at && (
                          <span className="text-xs text-muted">
                            {t('orders.periods.revoked', { date: format.date(period.revoked_at) })}
                            {period.revoke_reason ? ` · ${period.revoke_reason}` : ''}
                          </span>
                        )}
                      </span>
                      {!period.revoked_at && (
                        <Button variant="secondary" onPress={() => setSub({ kind: 'revoke', periodId: period.id, range })}>
                          {t('orders.actions.revoke')}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          {d.pro && (
            <Section title={t('orders.detail.proTitle')}>
              <p className="text-ui font-semibold text-ink">
                {d.pro.until ? t('orders.detail.proUntil', { date: format.lastDay(d.pro.until) }) : t('orders.detail.proNone')}
              </p>
              <ul className="flex flex-col gap-1 text-xs text-muted">
                {d.pro.sources.map((source) => (
                  <li key={source.id}>
                    {t(`orders.proSources.${source.kind}`)} · {format.period(source.starts_at, source.ends_at)}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {d.refund && (
            <Section title={t('orders.detail.refundTitle')}>
              <Rows
                rows={[
                  [t('orders.detail.refundName'), d.refund.payer_name ?? '—'],
                  [t('orders.detail.refundAccount'), d.refund.payer_account ?? '—'],
                  [t('orders.detail.refundBank'), d.refund.payer_bank ?? '—'],
                ]}
              />
              <p className="text-xs text-muted">{t('orders.detail.refundNote')}</p>
            </Section>
          )}

          {d.resolution && (
            <Section title={t('orders.detail.resolutionTitle')}>
              <p className="break-words text-ui text-ink">{d.resolution.note ?? '—'}</p>
              <p className="text-xs text-muted">{format.date(d.resolution.resolved_at)}</p>
            </Section>
          )}
        </div>
      )}

      {d && sub?.kind === 'confirm' && <ConfirmPaymentDialog order={d} onClose={() => setSub(null)} onDone={done} />}
      {d && sub?.kind === 'cancel' && <CancelOrderDialog order={d} onClose={() => setSub(null)} onDone={done} />}
      {d && sub?.kind === 'resolve' && <ResolveOrderDialog order={d} onClose={() => setSub(null)} onDone={done} />}
      {sub?.kind === 'revoke' && <RevokePeriodDialog periodId={sub.periodId} range={sub.range} onClose={() => setSub(null)} onDone={done} />}
    </Dialog>
  );
}
