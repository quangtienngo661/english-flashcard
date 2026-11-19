import type { AppLocale } from '@/i18n/routing';
import type { LandingCopy } from './copy';
import { FinalCta } from './FinalCta';
import { GroupsSection } from './GroupsSection';
import { Hero } from './Hero';
import type { LandingData } from './landing-data';
import { LandingLive } from './LandingLive';
import { LearnSection } from './LearnSection';

/**
 * The home page in Figma's order (`5:13` desktop, `9:108` phone; M8 Figma A §2). The hidden paragraph section (`6:117`) is not built.
 * Copy and data come in as props, so the page stays prerendered; Giá and Hỏi đáp then read the API again in the browser (LandingLive).
 */
export function HomePage({ copy, data, locale }: { copy: LandingCopy; data: LandingData; locale: AppLocale }) {
  return (
    <>
      <Hero copy={copy.hero} stage={copy.stage} locale={locale} />
      <GroupsSection copy={copy.groups} />
      <LearnSection copy={copy.learn} />
      <LandingLive copy={copy} data={data} locale={locale} />
      <FinalCta copy={copy.final} locale={locale} />
    </>
  );
}
