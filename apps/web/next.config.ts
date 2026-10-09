import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

initOpenNextCloudflareForDev();

export default withNextIntl(nextConfig);
