import { getTranslations } from 'next-intl/server';
import { Reveal } from '@/components/interactive/Reveal';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { richBreaks } from '@/lib/rich-breaks';

export async function AiPractice() {
  const t = await getTranslations('Ai');
  const benefits = ['b1', 'b2', 'b3'] as const;

  return (
    <Section labelledBy="ai-title" tone="surface" className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
      <Reveal className="flex flex-col items-start gap-5">
        <SectionHeading
          id="ai-title"
          eyebrow={t('eyebrow')}
          title={t.rich('title', richBreaks)}
          description={t('description')}
          align="start"
        />
        <ul className="flex flex-col gap-2.5">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-body font-medium text-ink">
              <Icon name="check" className="mt-0.5 text-success-strong" />
              {t(`benefits.${b}`)}
            </li>
          ))}
        </ul>
        <Chip>{t('chip')}</Chip>
      </Reveal>
      <Reveal step={1} className="w-full lg:flex lg:justify-end">
        <figure className="flex w-full max-w-aside flex-col gap-4 rounded-feature border border-border bg-surface p-7 shadow-card md:px-8">
          <figcaption className="text-caption font-semibold text-muted">{t('card.label')}</figcaption>
          <p lang="en" className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-title font-medium text-ink">
            <span>{t('card.before')}</span>
            <span className="rounded-sm border-2 border-success bg-success-soft px-3 py-0.5 text-body-lg font-bold text-success-strong">
              {t('card.word')}
            </span>
            <span>{t('card.after')}</span>
          </p>
          <div className="flex flex-col gap-2 rounded-inner bg-bg p-4">
            <p className="text-label text-ink">{t('card.explanation')}</p>
            <p className="text-label font-medium text-muted">{t('card.translation')}</p>
          </div>
          <p className="flex items-center gap-2 text-small font-medium text-muted">
            <Icon name="flag" className="size-4" />
            {t('card.report')}
          </p>
        </figure>
      </Reveal>
    </Section>
  );
}
