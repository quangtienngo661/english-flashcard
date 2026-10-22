import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { appPageExtensions, LEARNER_APP_ENABLED } from './src/lib/learner-app-flag';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // D21: app route files (page.app.tsx, layout.app.tsx) only exist in builds with the learner app on.
  pageExtensions: appPageExtensions(LEARNER_APP_ENABLED),
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

initOpenNextCloudflareForDev();

export default withNextIntl(nextConfig);
