import { getLocale } from 'next-intl/server';
import { Logo } from '@/app-chrome/Logo';
import { Reveal } from '@/components/interactive/Reveal';
import { getAppCopy, getLandingCopy } from '@/components/landing/copy';
import { ExercisesSection } from '@/components/landing/ExercisesSection';
import { Faq } from '@/components/landing/Faq';
import { FinalCta } from '@/components/landing/FinalCta';
import { Hero } from '@/components/landing/Hero';
import { MetOutside } from '@/components/landing/MetOutside';
import { Plans } from '@/components/landing/Plans';
import { ReviewTiming } from '@/components/landing/ReviewTiming';
import { AppShowcase } from '@/components/landing/showcase/AppShowcase';
import { WhyForget } from '@/components/landing/WhyForget';
import type { AppLocale } from '@/i18n/routing';

// Design landing-redesign §3. The hero and the app window are present at once; every section below fades in once as it is reached.
export default async function HomePage() {
  const locale = (await getLocale()) as AppLocale;
  const [copy, app] = await Promise.all([getLandingCopy(), getAppCopy()]);

  return (
    <>
      <Hero copy={copy.hero} locale={locale} visual={<AppShowcase copy={copy.showcase} app={app} logo={<Logo />} />} />
      <Reveal>
        <WhyForget copy={copy.why} />
      </Reveal>
      <Reveal>
        <ExercisesSection copy={copy.exercises} kinds={app.kinds} />
      </Reveal>
      <Reveal>
        <ReviewTiming copy={copy.review} />
      </Reveal>
      <Reveal>
        <MetOutside copy={copy.metOutside} app={app} />
      </Reveal>
      <Reveal>
        <Plans copy={copy.plans} locale={locale} />
      </Reveal>
      <Reveal>
        <Faq copy={copy.faq} />
      </Reveal>
      <Reveal>
        <FinalCta copy={copy.final} locale={locale} />
      </Reveal>
    </>
  );
}
