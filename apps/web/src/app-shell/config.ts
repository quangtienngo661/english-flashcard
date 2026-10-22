// API origin of the learner app, baked at build time (design §4.2).
export function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
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
