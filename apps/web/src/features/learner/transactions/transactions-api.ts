'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useApi } from '@/app-shell/session/session-context';
import type { Format } from '@/app-shell/format';

export type TransactionKind = 'purchase' | 'renewal' | 'plan_change' | 'refund' | 'trial' | 'grant';
export type TransactionStatus = 'succeeded' | 'refunded' | 'pending' | 'reversed';

/** `GET /v1/me/transactions` (design §8.9). Money is in the currency's smallest unit; a grant or a trial has none. */
export type Transaction = {
  id: string;
  kind: TransactionKind;
  plan: string;
  interval: 'month' | 'quarter' | 'year' | null;
  amount_minor: number | null;
  currency: string | null;
  occurred_at: string;
  period_start: string;
  period_end: string | null;
  status: TransactionStatus;
  provider: string | null;
  provider_transaction_id: string | null;
};

const PAGE = 20;

export function useTransactions() {
  const api = useApi();
  return useInfiniteQuery({
    queryKey: ['me', 'transactions'],
    queryFn: ({ pageParam }) => {
      const query = new URLSearchParams({ page_size: String(PAGE) });
      if (pageParam) query.set('page_token', pageParam);
      return api.get<{ items: Transaction[]; next_page_token: string | null }>(`/v1/me/transactions?${query}`);
    },
    initialPageParam: '',
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
}

const DAY_MS = 86_400_000;
// The year at the end of a date: vi "08/08/2026", en "Aug 8, 2026".
const TRAILING_YEAR = /[,/]\s?\d{4}$/;

/**
 * "08/08 – 07/11/2026" ("Aug 8 – Nov 7, 2026"), or two full dates when the years differ (M7 Figma A §6.1). A paid period runs to the
 * same time a month or a year later, so the last day shown is the day before its end; a grant ends at midnight or when it was revoked
 * (GI7), so its last moment is 1 ms before.
 */
export function periodText(format: Format, item: Transaction): string {
  const first = format.date(item.period_start, 'numeric');
  if (item.period_end === null) return first;
  const end = new Date(item.period_end).getTime() - (item.kind === 'grant' ? 1 : DAY_MS);
  const last = format.date(new Date(end), 'numeric');
  const sameYear = first.slice(-4) === last.slice(-4);
  return `${sameYear ? first.replace(TRAILING_YEAR, '') : first} – ${last}`;
}

/** "199.000 ₫"; a refund "−79.000 ₫" (U+2212); a grant or a trial, which carry no money, "0 ₫" (M7 decision). */
export function moneyText(format: Format, item: Transaction): string {
  const amount = item.amount_minor === null || item.currency === null ? format.money(0, 'VND') : format.money(item.amount_minor, item.currency);
  return item.kind === 'refund' ? `−${amount}` : amount;
}
