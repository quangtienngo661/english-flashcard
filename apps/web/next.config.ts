import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import createNextIntlPlugin from 'next-intl/plugin';
import { buildCsp, CSP_INLINE_FALLBACK } from './src/lib/csp';
import { assertApiBaseUrl, assertTurnstileSiteKey, turnstileSiteKey } from './src/app-shell/config';
import { THEME_SCRIPT_HASH } from './src/app-shell/theme/theme-script';
import { SITE_HEAD_SCRIPT_HASH } from './src/site/layout/site-head-script';
import { appPageExtensions, LEARNER_APP_ENABLED } from './src/lib/learner-app-flag';
import { securityHeaders } from './src/lib/security-headers';
import { readLandingDataOnce } from './scripts/read-landing-data.mjs';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
// Design §4.2: with the app on, the build fails unless the API URL is absolute (and an api. host on wordmet.com).
const apiOrigin = LEARNER_APP_ENABLED ? new URL(assertApiBaseUrl(siteUrl, process.env.NEXT_PUBLIC_API_BASE_URL)).origin : null;

// Launch prep A, design 4.3: the same kind of check for the Turnstile site key.
assertTurnstileSiteKey({ learnerApp: LEARNER_APP_ENABLED, siteUrl, siteKey: turnstileSiteKey() });

const csp = buildCsp({
  apiOrigin,
  // A production build served over plain http (local e2e on :3100) must not upgrade its own requests to https.
  dev: !siteUrl.startsWith('https://'),
  inline: CSP_INLINE_FALLBACK,
  // The public pages run SITE_HEAD_SCRIPT (the theme script plus the motion's `js` class); THEME_SCRIPT alone stays listed.
  scriptHashes: [THEME_SCRIPT_HASH, SITE_HEAD_SCRIPT_HASH],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // D21: app route files (page.app.tsx, layout.app.tsx) only exist in builds with the learner app on.
  pageExtensions: appPageExtensions(LEARNER_APP_ENABLED),
  // D9: hash-based CSP; Next adds integrity attributes to its script files.
  experimental: { sri: { algorithm: 'sha256' } },
  async headers() {
    if (process.env.NODE_ENV !== 'production') return [];
    return [
      { source: '/:path*', headers: securityHeaders() },
      // Not /vi/app or /en/app: the proxy gives those a policy of their own with a nonce (launch prep B design §5.4); a second one here would be
      // applied beside it (the browser takes the intersection) and refuse what the nonce policy allows (spike M0, mode `control`).
      { source: '/((?!vi/app|en/app).*)', headers: [{ key: 'Content-Security-Policy', value: csp }] },
    ];
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

initOpenNextCloudflareForDev();

/**
 * Giao diện mới M8.3 (design §10.6, §10.7): at `next build` only, the landing's prices and FAQ are read from the API once and inlined as
 * process.env.WORDMET_LANDING_DATA, so /vi and /en stay prerendered. No API → one warning and the fallback (S/landing/landing-data.fallback.ts);
 * LANDING_DATA_REQUIRED=1 makes that a build error, LANDING_DATA_SOURCE=fallback skips the read (the e2e build).
 */
export default async function config(phase: string): Promise<NextConfig> {
  const data =
    phase === PHASE_PRODUCTION_BUILD
      ? await readLandingDataOnce(process.env, {
          baseUrl: process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
          required: process.env.LANDING_DATA_REQUIRED === '1',
          offline: process.env.LANDING_DATA_SOURCE === 'fallback',
        })
      : undefined;
  return withNextIntl({ ...nextConfig, env: { WORDMET_LANDING_DATA: data ?? '' } });
}
