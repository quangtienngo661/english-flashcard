'use client';

import { useEffect, useState } from 'react';
import type { AppLocale } from '@/i18n/routing';
import { isFaq, isPrices, sessionsOf, type LandingData } from './landing-data';

/** GET as JSON; any failure (network, status, body) is null, so the caller keeps what it has. */
async function readJson(url: string, signal: AbortSignal): Promise<unknown> {
  try {
    const response = await fetch(url, { signal, headers: { accept: 'application/json' } });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

/**
 * Owner 19/11/2026 (Q1 B): the landing is prerendered with the numbers `next build` read; once it is in the browser this reads the Pro
 * prices, each plan's sessions per day and (Vietnamese only, the English FAQ is fixed text) the FAQ again, so an admin change shows
 * without a deploy. Each part keeps the build value when its answer fails or has a bad shape. No API address in the build: no request.
 */
export function useLiveLandingData(
  initial: LandingData,
  locale: AppLocale,
  apiBase: string | undefined = process.env.NEXT_PUBLIC_API_BASE_URL,
): LandingData {
  const [data, setData] = useState(initial);
  useEffect(() => {
    if (!apiBase) return;
    const base = apiBase.replace(/\/+$/, '');
    const controller = new AbortController();
    void Promise.all([
      readJson(`${base}/v1/public/prices`, controller.signal),
      locale === 'vi' ? readJson(`${base}/v1/public/faq`, controller.signal) : Promise.resolve(null),
    ]).then(([priceAnswer, faqAnswer]) => {
      if (controller.signal.aborted) return;
      const answer = (priceAnswer ?? {}) as { prices?: unknown; practice_sessions_per_day?: unknown };
      const items = (faqAnswer as { items?: unknown } | null)?.items;
      const prices = answer.prices;
      setData((current) => ({
        ...current,
        prices: isPrices(prices) ? { '1': prices['1'], '3': prices['3'], '12': prices['12'] } : current.prices,
        sessions: sessionsOf(answer.practice_sessions_per_day) ?? current.sessions,
        faq: isFaq(items) ? items.map((item) => ({ question: item.question, answer: item.answer })) : current.faq,
      }));
    });
    return () => controller.abort();
  }, [apiBase, locale]);
  return data;
}
