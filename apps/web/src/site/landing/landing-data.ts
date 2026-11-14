import type { Prices } from '@/lib/period-offer';
import { FALLBACK_LANDING_DATA } from './landing-data.fallback';

export type FaqItem = { question: string; answer: string };
export type LandingData = { prices: Prices; faq: FaqItem[]; source: 'api' | 'fallback' };

const MONTHS = ['1', '3', '12'] as const;

function isPrices(value: unknown): value is Prices {
  if (!value || typeof value !== 'object') return false;
  return MONTHS.every((m) => {
    const price = (value as Record<string, unknown>)[m];
    return typeof price === 'number' && Number.isFinite(price) && price > 0;
  });
}

function isFaq(value: unknown): value is FaqItem[] {
  return (
    Array.isArray(value) &&
    value.every((item) => !!item && typeof item === 'object' && typeof item.question === 'string' && typeof item.answer === 'string')
  );
}

/** The JSON `scripts/read-landing-data.mjs` wrote at build; empty, bad JSON or a bad shape gives the fallback. */
export function parseLandingData(raw: string | undefined): LandingData {
  if (!raw) return FALLBACK_LANDING_DATA;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return FALLBACK_LANDING_DATA;
  }
  if (!parsed || typeof parsed !== 'object') return FALLBACK_LANDING_DATA;
  const { prices, faq } = parsed as { prices?: unknown; faq?: unknown };
  if (!isPrices(prices) || !isFaq(faq)) return FALLBACK_LANDING_DATA;
  return {
    prices: { '1': prices['1'], '3': prices['3'], '12': prices['12'] },
    faq: faq.map(({ question, answer }) => ({ question, answer })),
    source: 'api',
  };
}

/**
 * The landing's prices and FAQ. `process.env.WORDMET_LANDING_DATA` is replaced by its value at `next build` (`env` in next.config.ts),
 * so a prerendered page never reads the API per request (M8.3).
 */
export function landingData(): LandingData {
  return parseLandingData(process.env.WORDMET_LANDING_DATA);
}
