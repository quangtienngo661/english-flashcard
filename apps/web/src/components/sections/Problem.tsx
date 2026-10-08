import { getTranslations } from 'next-intl/server';
import { Flashcard } from '@/components/interactive/Flashcard';
import { Reveal } from '@/components/interactive/Reveal';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { cn } from '@/lib/cn';
import { richBreaks } from '@/lib/rich-breaks';

const SENTENCES = [
  { key: 's1', filled: true },
  { key: 's2', filled: true },
  { key: 's3', filled: false },
] as const;

export async function Problem() {
  const t = await getTranslations('Problem');

  return (
    <Section labelledBy="problem-title" tone="surface">
      <Reveal>
        <SectionHeading
          id="problem-title"
          eyebrow={t('eyebrow')}
          title={t.rich('title', richBreaks)}
          description={t.rich('description', richBreaks)}
          align="center"
        />
      </Reveal>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Reveal className="flex flex-col gap-4 rounded-card border border-border bg-bg p-7">
          <p className="text-small font-bold text-muted">{t('before.label')}</p>
          <Flashcard word={t('before.word')} meaning={t('before.meaning')} hint={t('before.hint')} />
          <p className="text-label text-muted">{t('before.caption')}</p>
        </Reveal>
        <Reveal step={1} className="flex flex-col gap-4 rounded-card border-2 border-primary bg-surface p-7">
          <p className="text-small font-bold text-primary">{t('after.label')}</p>
          {SENTENCES.map(({ key, filled }) => (
            <p key={key} lang="en" className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-body-lg font-medium text-ink">
              <span>{t(`after.${key}.before`)}</span>
              <span
                className={cn(
                  'rounded-sm px-3 py-0.5 font-bold',
                  filled ? 'border-2 border-success bg-success-soft text-success-strong' : 'bg-marker text-ink',
                )}
              >
                {t(`after.${key}.word`)}
              </span>
              <span>{t(`after.${key}.after`)}</span>
            </p>
          ))}
          <p className="text-label text-muted">{t('after.caption')}</p>
        </Reveal>
      </div>
    </Section>
  );
}
