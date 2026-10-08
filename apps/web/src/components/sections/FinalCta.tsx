import { getLocale, getTranslations } from 'next-intl/server';
import { Reveal } from '@/components/interactive/Reveal';
import { WaitlistForm } from '@/components/interactive/WaitlistForm';
import { Container } from '@/components/ui/Container';
import { getWaitlistLabels } from '@/features/waitlist/labels';
import type { AppLocale } from '@/i18n/routing';

export async function FinalCta() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations('FinalCta');

  return (
    <section aria-labelledby="final-cta-title" className="bg-primary py-14 md:py-22">
      <Container>
        <Reveal className="mx-auto flex max-w-cta flex-col items-center gap-7 text-center">
          <h2 id="final-cta-title" className="text-cta font-extrabold text-on-primary">
            {t('title')}
          </h2>
          <div className="w-full max-w-prose text-left">
            <WaitlistForm idPrefix="cta" tone="inverse" layout="inline" locale={locale} labels={await getWaitlistLabels()} />
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
