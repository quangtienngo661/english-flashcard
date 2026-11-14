import type { ApiClient } from '../../api/client';

export type TransactionKind = 'purchase' | 'renewal' | 'plan_change' | 'refund' | 'trial' | 'grant';
export type TransactionStatus = 'succeeded' | 'refunded' | 'pending' | 'reversed';

/** `GET /v1/admin/transactions` (learner UI design §8.9): money in the currency's smallest unit; grants have none. */
export type AdminTransaction = {
  id: string;
  kind: TransactionKind;
  plan: string;
  interval: 'month' | 'year' | null;
  amount_minor: number | null;
  currency: string | null;
  occurred_at: string;
  period_start: string;
  period_end: string | null;
  status: TransactionStatus;
  provider: string | null;
  provider_transaction_id: string | null;
  user: { id: string; email: string | null };
};

/** What the filter form holds: dates as typed (`YYYY-MM-DD`, Vietnam days, both inclusive). */
export type TransactionFilters = { email: string; kind: TransactionKind | ''; from: string; to: string };

export const NO_FILTERS: TransactionFilters = { email: '', kind: '', from: '', to: '' };
export const ADMIN_ZONE = 'Asia/Ho_Chi_Minh';
const PAGE_SIZE = 50;

/** The next calendar day of `YYYY-MM-DD`, for the exclusive end of "Tới ngày". */
function nextDay(day: string): string {
  const at = new Date(`${day}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + 1);
  return at.toISOString().slice(0, 10);
}

/** The API takes instants: a Vietnam day starts at 00:00 +07:00 (Vietnam has no daylight saving). */
export function transactionsQuery(filters: TransactionFilters, pageToken?: string): string {
  const query = new URLSearchParams();
  if (filters.email.trim()) query.set('email', filters.email.trim());
  if (filters.kind) query.set('kind', filters.kind);
  if (filters.from) query.set('from', `${filters.from}T00:00:00+07:00`);
  if (filters.to) query.set('to', `${nextDay(filters.to)}T00:00:00+07:00`);
  query.set('page_size', String(PAGE_SIZE));
  if (pageToken) query.set('page_token', pageToken);
  return query.toString();
}

export function listTransactions(api: ApiClient, filters: TransactionFilters, pageToken?: string) {
  return api.get<{ items: AdminTransaction[]; next_page_token: string | null }>(`/v1/admin/transactions?${transactionsQuery(filters, pageToken)}`);
}
