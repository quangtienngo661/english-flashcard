export type Locale = 'vi' | 'en';

export function parseLocale(raw: unknown): Locale {
  return raw === 'en' ? 'en' : 'vi';
}

/**
 * An absolute URL on the learner web (`LEARNER_APP_URL` + `path`), with `params` set through `searchParams`, never by string
 * concatenation (plan review P7, P8): the API and the web are two origins, and a path alone would stay on the API host.
 */
export function toLearnerApp(base: string, path: string, params: Record<string, string> = {}): string {
  const url = new URL(path, base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

/**
 * The page to return to after sign-in. Only an address on the learner web under `/{vi|en}/app` is kept (path and query and fragment);
 * anything else, including `//evil.example`, `/fr/app`, `/vi/apps`, `/vi/app/../x` and `/vi/app/%2e%2e/x`, becomes `/{locale}/app`
 * (design §5.3, review R11). The URL parser has already resolved dot segments, so the check looks at the real path.
 */
export function safeNext(raw: unknown, locale: Locale, base: string): string {
  const fallback = `/${locale}/app`;
  if (typeof raw !== 'string' || raw === '' || raw.length > 2000) return fallback;
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    return fallback;
  }
  if (url.origin !== new URL(base).origin) return fallback;
  if (!/^\/(vi|en)\/app(\/|$)/.test(url.pathname)) return fallback;
  return url.pathname + url.search + url.hash;
}
