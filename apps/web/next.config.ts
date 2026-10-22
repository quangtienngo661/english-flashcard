import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { buildCsp, CSP_INLINE_FALLBACK } from './src/lib/csp';
import { assertApiBaseUrl } from './src/app-shell/config';
import { THEME_SCRIPT_HASH } from './src/app-shell/theme/theme-script';
import { appPageExtensions, LEARNER_APP_ENABLED } from './src/lib/learner-app-flag';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
// Design §4.2: with the app on, the build fails unless the API URL is absolute (and an api. host on wordmet.com).
const apiOrigin = LEARNER_APP_ENABLED ? new URL(assertApiBaseUrl(siteUrl, process.env.NEXT_PUBLIC_API_BASE_URL)).origin : null;

const csp = buildCsp({
  apiOrigin,
  // A production build served over plain http (local e2e on :3100) must not upgrade its own requests to https.
  dev: !siteUrl.startsWith('https://'),
  inline: CSP_INLINE_FALLBACK,
  scriptHashes: [THEME_SCRIPT_HASH],
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
    return [{ source: '/:path*', headers: [{ key: 'Content-Security-Policy', value: csp }] }];
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

initOpenNextCloudflareForDev();

export default withNextIntl(nextConfig);
