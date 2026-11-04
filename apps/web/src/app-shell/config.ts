// API origin of the learner app, baked at build time (design §4.2).
export function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}

/**
 * Public Turnstile site key, baked at build time (launch prep A, design 4.3). Blank: the forms use the fake widget, which only
 * an API in `fake` mode accepts. `next.config.ts` refuses a production build of the live site without it.
 */
export function turnstileSiteKey(): string {
  return (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '').trim();
}

/**
 * The API origin for requests the web server itself makes. Read at run time (no NEXT_PUBLIC_ prefix, so it is not baked into
 * the bundle). Set it when the server reaches the API at another address than the browser does: in the Docker stack the browser
 * uses `localhost:3000` while the web container must use `http://api:3000`. Unset or blank: the public origin.
 */
export function serverApiBaseUrl(): string {
  const internal = process.env.API_INTERNAL_BASE_URL?.trim();
  return internal ? internal.replace(/\/+$/, '') : apiBaseUrl();
}

/**
 * Build-time check (next.config.ts, app on): an absolute http(s) URL, and on the production site an `api.` host, so the
 * learner's host-only refresh cookie never mixes with admin's (`admin-api.`).
 */
export function assertApiBaseUrl(siteUrl: string, raw: string | undefined): string {
  let url: URL;
  try {
    url = new URL(raw ?? '');
  } catch {
    throw new Error(`NEXT_PUBLIC_API_BASE_URL must be an absolute http(s) URL, got ${JSON.stringify(raw)}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`NEXT_PUBLIC_API_BASE_URL must be an absolute http(s) URL, got ${JSON.stringify(raw)}`);
  }
  if (siteUrl.startsWith('https://wordmet.com') && !url.hostname.startsWith('api.')) {
    throw new Error(`NEXT_PUBLIC_API_BASE_URL on ${siteUrl} must use an api. host, got ${url.hostname}`);
  }
  return url.toString().replace(/\/+$/, '');
}
