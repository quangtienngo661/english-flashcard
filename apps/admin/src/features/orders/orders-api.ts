import type { ApiClient } from '../../api/client';
import type { UserRef } from '../../api/user-ref';
import { ADMIN_ZONE } from '../transactions/transactions-api';

export { ADMIN_ZONE };

export type OrderStatus = 'pending' | 'paid' | 'expired' | 'cancelled' | 'failed' | 'needs_review' | 'closed';
export const ORDER_STATUSES: OrderStatus[] = ['pending', 'paid', 'expired', 'cancelled', 'failed', 'needs_review', 'closed'];
export type ReviewReason =
  | 'amount-short' | 'amount-over' | 'late-payment' | 'account-deleted' | 'extra-payment' | 'reconcile-mismatch' | 'provider-mismatch';
export type PaymentSource = 'webhook' | 'reconcile' | 'manual';
export type PaymentOutcome = 'opened-period' | 'attached' | 'counted' | 'flagged' | 'refund-needed';

/** One row of `GET /v1/admin/orders` (`AdminOrderListItem`, `apps/api/src/entitlements/orders/admin-orders.service.ts`). */
export type AdminOrder = {
  id: string;
  status: OrderStatus;
  review_reason: ReviewReason | null;
  /** `needs_review`, or a paid order that carries a flag staff have not looked at. */
  needs_attention: boolean;
  period_months: number;
  /** In dong. */
  amount: number;
  /** The text the payer types into the transfer: `WM…`. */
  description: string;
  paid_via: PaymentSource | null;
  created_at: string;
  expires_at: string;
  user: UserRef;
};

export type AdminOrderPayment = {
  id: string;
  source: PaymentSource;
  reference: string;
  amount: number;
  /** payOS's own time, `YYYY-MM-DD HH:mm:ss` in Vietnam time; null for a staff confirmation. */
  provider_time: string | null;
  outcome: PaymentOutcome;
  period_id: string | null;
  confirmed_by: string | null;
  reason: string | null;
  received_at: string;
};

export type AdminOrderPeriod = { id: string; starts_at: string; ends_at: string; revoked_at: string | null; revoke_reason: string | null };

/** `GET /v1/admin/orders/:id` (`AdminOrderDetail`). */
export type AdminOrderDetail = AdminOrder & {
  order_code: number;
  payments: AdminOrderPayment[];
  periods: AdminOrderPeriod[];
  refund: { payer_name: string | null; payer_account: string | null; payer_bank: string | null; saved_at: string | null } | null;
  resolution: { resolved_at: string; note: string | null } | null;
  /** The learner's Pro now: where the unbroken run ends and every source that makes it. */
  pro: { until: string | null; sources: Array<{ kind: 'grant' | 'prepaid'; id: string; starts_at: string; ends_at: string }> } | null;
};

/** What the filter form holds: dates as typed (`YYYY-MM-DD`, Vietnam days, both inclusive). */
export type OrderFilters = { status: OrderStatus | ''; needsAttention: boolean; email: string; from: string; to: string; code: string };
export const NO_FILTERS: OrderFilters = { status: '', needsAttention: false, email: '', from: '', to: '', code: '' };
const PAGE_SIZE = 50;

/** The next calendar day of `YYYY-MM-DD`, for the exclusive end of "Tới ngày". */
function nextDay(day: string): string {
  const at = new Date(`${day}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + 1);
  return at.toISOString().slice(0, 10);
}

/** The API takes instants: a Vietnam day starts at 00:00 +07:00 (Vietnam has no daylight saving). */
export function ordersQuery(filters: OrderFilters, pageToken?: string): string {
  const query = new URLSearchParams();
  if (filters.status) query.set('status', filters.status);
  if (filters.needsAttention) query.set('needs_attention', 'true');
  if (filters.email.trim()) query.set('email', filters.email.trim());
  if (filters.from) query.set('from', `${filters.from}T00:00:00+07:00`);
  if (filters.to) query.set('to', `${nextDay(filters.to)}T00:00:00+07:00`);
  if (filters.code.trim()) query.set('q', filters.code.trim().toUpperCase());
  query.set('page_size', String(PAGE_SIZE));
  if (pageToken) query.set('page_token', pageToken);
  return query.toString();
}

export function listOrders(api: ApiClient, filters: OrderFilters, pageToken?: string) {
  return api.get<{ items: AdminOrder[]; next_page_token: string | null }>(`/v1/admin/orders?${ordersQuery(filters, pageToken)}`);
}

export function getOrder(api: ApiClient, id: string) {
  return api.get<AdminOrderDetail>(`/v1/admin/orders/${id}`);
}

export const MAX_TEXT = 300;
export const MAX_REFERENCE = 100;
export const MAX_AMOUNT = 1_000_000_000;

/** "Đã nhận tiền": staff saw the money in the bank app (T11–T14). 409 when the order has a period, is closed or the account is gone. */
export function confirmPayment(api: ApiClient, id: string, body: { reference: string; amount: number; reason: string }, key: string) {
  return api.post<AdminOrderDetail>(`/v1/admin/orders/${id}/confirm-payment`, body, { idempotencyKey: key });
}

/** "Hủy đơn": a pending order only; payOS is asked first (503 `provider-unavailable` leaves the order as it was). */
export function cancelOrder(api: ApiClient, id: string, key: string) {
  return api.post<AdminOrderDetail>(`/v1/admin/orders/${id}/cancel`, undefined, { idempotencyKey: key });
}

/** "Đã xử lý": closes a `needs_review` order, or clears the flag of a paid one; the note is kept. */
export function resolveOrder(api: ApiClient, id: string, note: string, key: string) {
  return api.post<AdminOrderDetail>(`/v1/admin/orders/${id}/resolve`, { note }, { idempotencyKey: key });
}

/** "Thu hồi kỳ": the period stops counting; later periods do not move. */
export function revokePeriod(api: ApiClient, periodId: string, reason: string, key: string) {
  return api.post<{ id: string; revoked_at: string }>(`/v1/admin/prepaid-periods/${periodId}/revoke`, { reason }, { idempotencyKey: key });
}
