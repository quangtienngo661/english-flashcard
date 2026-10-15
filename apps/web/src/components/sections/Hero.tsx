import { getLocale, getTranslations } from 'next-intl/server';
import { ClozePractice, type ClozeItem } from '@/components/interactive/cloze/ClozePractice';
import { WaitlistForm } from '@/components/interactive/WaitlistForm';
import { Chip } from '@/components/ui/Chip';
import { Container } from '@/components/ui/Container';
import { getWaitlistLabels } from '@/features/waitlist/labels';
import type { AppLocale } from '@/i18n/routing';
import { richBreaks } from '@/lib/rich-breaks';

const ITEM_IDS = ['deploy', 'assume', 'borrow'] as const;

export async function Hero() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations('Hero');
  const c = await getTranslations('Cloze');

  const items: ClozeItem[] = ITEM_IDS.map((id) => ({
    id,
    before: c(`items.${id}.before`),
    answer: c(`items.${id}.answer`),
    after: c(`items.${id}.after`),
    options: [c(`items.${id}.options.o1`), c(`items.${id}.options.o2`), c(`items.${id}.options.o3`), c(`items.${id}.options.o4`)],
    hint: c(`items.${id}.hint`),
    explanation: c(`items.${id}.explanation`),
    translation: c(`items.${id}.translation`),
  }));

  const labels = {
    headers: ITEM_IDS.map((_, i) => c('header', { current: i + 1, total: ITEM_IDS.length })),
    sourceChip: c('sourceChip'),
    instruction: c('instruction'),
    correctTitle: c('correctTitle'),
    wrongTitle: c('wrongTitle'),
    nextSentence: c('nextSentence'),
    doneTitle: c('doneTitle'),
    doneBody: c('doneBody'),
    doneCta: c('doneCta'),
    replay: c('replay'),
    region: c('region'),
  };

  return (
    <section aria-labelledby="hero-title" className="bg-primary pt-10 pb-14 text-on-primary md:pt-12 md:pb-24">
      {/* DOM order puts the form before the practice card so phones see it in the first screen (design §5.1). */}
      <Container className="grid grid-cols-1 items-center gap-7 lg:grid-cols-2 lg:gap-x-12 lg:gap-y-6">
        <div className="lg:col-start-1">
          <Chip>{t('chip')}</Chip>
        </div>
        <h1 id="hero-title" className="text-display font-extrabold text-on-primary lg:col-start-1">
          {t.rich('title', richBreaks)}
        </h1>
        <p className="max-w-copy text-body-lg text-on-primary-muted md:text-lead lg:col-start-1">{t('description')}</p>
        <div className="max-w-copy lg:col-start-1">
          <WaitlistForm idPrefix="hero" tone="onPrimary" layout="inline" locale={locale} labels={await getWaitlistLabels()} />
        </div>
        <p className="text-small text-on-primary-muted lg:col-start-1">{t('note')}</p>
        <div className="flex justify-center lg:col-start-2 lg:row-span-5 lg:row-start-1 lg:justify-end">
          <ClozePractice items={items} labels={labels} ctaHref="#waitlist-hero" />
        </div>
      </Container>
    </section>
  );
}
