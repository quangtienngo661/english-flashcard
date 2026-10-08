import { getTranslations } from 'next-intl/server';
import { Reveal } from '@/components/interactive/Reveal';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { cn } from '@/lib/cn';
import { richBreaks } from '@/lib/rich-breaks';

const ITEMS = ['i1', 'i2', 'i3', 'i4'] as const;

export async function Plans() {
  const t = await getTranslations('Plans');

  return (
    <Section labelledBy="plans-title" tone="bg">
      <Reveal>
        <SectionHeading
          id="plans-title"
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t.rich('description', richBreaks)}
          align="center"
        />
      </Reveal>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {(['free', 'trial'] as const).map((plan, i) => (
          <Reveal
            key={plan}
            step={i === 0 ? 0 : 1}
            className={cn(
              'flex flex-col gap-4 rounded-card bg-surface p-7',
              plan === 'trial' ? 'border-2 border-primary' : 'border border-border',
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-title font-bold text-ink md:text-title-lg">{t(`${plan}.name`)}</h3>
              <Chip>{t(`${plan}.chip`)}</Chip>
            </div>
            <ul className="flex flex-col gap-2.5">
              {ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-body text-ink">
                  <Icon name="check" className="mt-0.5 text-success-strong" />
                  {t(`${plan}.items.${item}`)}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
