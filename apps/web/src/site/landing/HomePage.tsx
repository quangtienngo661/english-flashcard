import type { AppLocale } from '@/i18n/routing';
import type { LandingCopy } from './copy';
import { FaqSection } from './FaqSection';
import { FinalCta } from './FinalCta';
import { GroupsSection } from './GroupsSection';
import { Hero } from './Hero';
import type { LandingData } from './landing-data';
import { LearnSection } from './LearnSection';
import { PricingSection } from './PricingSection';
import { WordStrip } from './WordStrip';

/**
 * The home page in Figma's order (`5:13` desktop, `9:108` phone; M8 Figma A §2). The hidden paragraph section (`6:117`) is not built.
 * Copy and data come in as props, so the page stays prerendered and the sections need no request-time reads.
 */
export function HomePage({ copy, data, locale }: { copy: LandingCopy; data: LandingData; locale: AppLocale }) {
  return (
    <>
      <Hero copy={copy.hero} stage={copy.stage} locale={locale} />
      <WordStrip copy={copy.strip} />
      <GroupsSection copy={copy.groups} />
      <LearnSection copy={copy.learn} />
      <PricingSection copy={copy.plans} prices={data.prices} locale={locale} />
      <FaqSection copy={copy.faq} items={data.faq} />
      <FinalCta copy={copy.final} locale={locale} />
    </>
  );
}
