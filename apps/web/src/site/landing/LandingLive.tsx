'use client';

import type { AppLocale } from '@/i18n/routing';
import type { LandingCopy } from './copy';
import { FaqSection } from './FaqSection';
import type { LandingData } from './landing-data';
import { LANDING_FAQ_EN } from './landing-faq.en';
import { PricingSection } from './PricingSection';
import { useLiveLandingData } from './use-live-landing-data';

/** Giá and Hỏi đáp with the build's numbers first, then the API's (owner 19/11/2026). */
export function LandingLive({ copy, data, locale }: { copy: LandingCopy; data: LandingData; locale: AppLocale }) {
  const live = useLiveLandingData(data, locale);
  return (
    <>
      <PricingSection copy={copy.plans} prices={live.prices} sessions={live.sessions} locale={locale} />
      <FaqSection copy={copy.faq} items={locale === 'en' ? LANDING_FAQ_EN : live.faq} />
    </>
  );
}
