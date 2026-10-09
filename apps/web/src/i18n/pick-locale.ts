import { routing, type AppLocale } from './routing';

type LocaleSignals = { cookie?: string | null; country?: string | null; acceptLanguage?: string | null };

function isLocale(value: string | null | undefined): value is AppLocale {
  return routing.locales.includes(value as AppLocale);
}

function acceptsVietnamese(header: string): boolean {
  return header.split(',').some((part) => {
    const [range, ...params] = part.trim().toLowerCase().split(';');
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    const weight = q ? Number(q.slice(2)) : 1;
    return range.split('-')[0] === 'vi' && weight > 0;
  });
}

// Root "/" only (spec §4.1): saved choice → country → Accept-Language → English.
export function pickLocale({ cookie, country, acceptLanguage }: LocaleSignals): AppLocale {
  if (isLocale(cookie)) return cookie;
  if (country === 'VN') return 'vi';
  if (acceptLanguage && acceptsVietnamese(acceptLanguage)) return 'vi';
  return 'en';
}

const UNKNOWN_COUNTRIES = new Set(['', 'XX', 'T1']);

// Hosting is not chosen yet: Vercel sends x-vercel-ip-country, Cloudflare cf-ipcountry (spec LPE3).
export function readCountry(headers: Headers): string | null {
  for (const name of ['x-vercel-ip-country', 'cf-ipcountry']) {
    const value = headers.get(name)?.trim().toUpperCase();
    if (value !== undefined && !UNKNOWN_COUNTRIES.has(value)) return value;
  }
  return null;
}
