import { getLocale } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { getLandingCopy } from '@/site/landing/copy';
import { HomePage } from '@/site/landing/HomePage';
import { landingData } from '@/site/landing/landing-data';

// Giao diện mới M8.5: the home page from Figma 5:13 / 9:108. Prices and FAQ were read when the site was built (M8.3), never per request.
export default async function Page() {
  const locale = (await getLocale()) as AppLocale;
  const copy = await getLandingCopy();
  return <HomePage copy={copy} data={landingData()} locale={locale} />;
}
