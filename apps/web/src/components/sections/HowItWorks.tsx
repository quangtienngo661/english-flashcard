import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Reveal } from '@/components/interactive/Reveal';
import { Chip } from '@/components/ui/Chip';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { cn } from '@/lib/cn';
import { richBreaks } from '@/lib/rich-breaks';

function StepCard({ number, title, body, visual, step }: { number: number; title: string; body: string; visual: ReactNode; step: 0 | 1 | 2 }) {
  return (
    <Reveal
      as="li"
      step={step}
      className="flex w-4/5 shrink-0 snap-start flex-col gap-5 rounded-card border border-border bg-surface p-7 lg:row-span-4 lg:grid lg:w-auto lg:grid-rows-subgrid"
    >
      <div aria-hidden="true" className="flex flex-1 flex-col gap-2.5 rounded-panel bg-bg p-4">
        {visual}
      </div>
      <span className="inline-flex self-start justify-self-start rounded-full bg-ink px-2.5 py-1 text-caption font-bold text-on-primary">{number}</span>
      <h3 className="text-h3 font-bold text-ink">{title}</h3>
      <p className="text-body text-muted">{body}</p>
    </Reveal>
  );
}

const field = 'flex flex-col gap-1 rounded-control border border-border bg-surface px-3 py-2';

export async function HowItWorks() {
  const t = await getTranslations('Steps');
  const rows = ['r1', 'r2', 'r3'] as const;

  return (
    <Section id="how-it-works" labelledBy="steps-title" tone="bg">
      <Reveal>
        <SectionHeading id="steps-title" eyebrow={t('eyebrow')} title={t.rich('title', richBreaks)} align="center" />
      </Reveal>
      {/* Focusable so keyboard users can scroll the mobile swipe row (axe scrollable-region-focusable). */}
      <ol tabIndex={0} aria-labelledby="steps-title" className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 md:-mx-10 md:scroll-px-10 md:px-10 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-x-6 lg:gap-y-5 lg:overflow-visible lg:px-0">
        <StepCard
          number={1}
          step={0}
          title={t('step1.title')}
          body={t('step1.body')}
          visual={
            <>
              <div className={field}>
                <span className="text-caption font-semibold text-muted">{t('step1.wordLabel')}</span>
                <span lang="en" className="text-small font-medium text-ink">{t('step1.wordValue')}</span>
              </div>
              <div className={field}>
                <span className="text-caption font-semibold text-muted">{t('step1.sentenceLabel')}</span>
                <span lang="en" className="text-small font-medium text-ink">{t('step1.sentenceValue')}</span>
              </div>
              <span className="inline-flex min-h-11 self-start items-center rounded-control bg-primary px-6 text-body font-semibold text-on-primary">
                {t('step1.save')}
              </span>
            </>
          }
        />
        <StepCard
          number={2}
          step={1}
          title={t('step2.title')}
          body={t('step2.body')}
          visual={
            <>
              <p lang="en" className="flex flex-wrap items-center gap-1.5 text-label font-medium text-ink">
                <span>{t('step2.sentenceBefore')}</span>
                <span className="rounded-sm bg-marker px-3 py-0.5 font-bold">_____</span>
                <span>{t('step2.sentenceAfter')}</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Chip>{t('step2.chips.c1')}</Chip>
                <Chip>{t('step2.chips.c2')}</Chip>
                <Chip>{t('step2.chips.c3')}</Chip>
              </div>
            </>
          }
        />
        <StepCard
          number={3}
          step={2}
          title={t('step3.title')}
          body={t('step3.body')}
          visual={rows.map((row, i) => (
            <div key={row} className="flex flex-col gap-0.5 rounded-control bg-surface px-3 py-2.5 xl:flex-row xl:items-center xl:justify-between">
              <span lang="en" className="text-label font-semibold text-ink">{t(`step3.rows.${row}.word`)}</span>
              <span className={cn('text-caption font-medium', i === 0 ? 'text-danger-strong' : 'text-muted')}>{t(`step3.rows.${row}.status`)}</span>
            </div>
          ))}
        />
      </ol>
    </Section>
  );
}
