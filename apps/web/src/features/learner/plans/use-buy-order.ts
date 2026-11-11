'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { APP_CONFIG_KEY } from '@/app-shell/queries';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import type { Months } from './period-offer';

/**
 * Buying a Pro period (launch prep B design §3.8). A press creates the order with the price the learner saw: if it changed meanwhile the
 * server answers 409 `price-changed`, the prices are read again and nothing is charged. A created order sends the browser to the payOS
 * page (a full page load: the next stop is another site), and `isPending` stays on until it leaves.
 */
export function useBuyOrder(): { buy(months: Months, price: number): void; isPending: boolean; error: string | null } {
  const t = useTranslations('App.plans');
  const locale = useLocale();
  const api = useApi();
  const queryClient = useQueryClient();
  const errorText = useErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const chosen = useRef<{ months: Months; price: number }>({ months: '12', price: 0 });
  const pressing = useRef(false);

  // One Idempotency-Key per press (useSubmitOnce): a retry after a network error is the same order, a press with other content a new one.
  const create = useSubmitOnce((key) =>
    api.post<{ order_id: string; checkout_url: string }>(
      '/v1/me/orders',
      { period_months: Number(chosen.current.months), expected_amount: chosen.current.price, locale },
      { idempotencyKey: key },
    ));

  async function run(months: Months, price: number) {
    // The body is read when the request goes out (also on a retry of the same key), so it may not change while a press is in flight.
    if (pressing.current) return;
    pressing.current = true;
    chosen.current = { months, price };
    setError(null);
    try {
      const created = await create.submit(`${months}:${price}`);
      if (created === undefined) {
        pressing.current = false;
        return;
      }
      setLeaving(true);
      window.location.assign(created.checkout_url);
    } catch (failure) {
      pressing.current = false;
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

  return { buy: (months, price) => void run(months, price), isPending: create.busy || leaving, error };
}
