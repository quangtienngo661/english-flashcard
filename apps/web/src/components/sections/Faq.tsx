import { getTranslations } from 'next-intl/server';
import { Reveal } from '@/components/interactive/Reveal';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';

const QUESTIONS = ['q1', 'q2', 'q3', 'q4'] as const;

// Native <details name> accordion: works without JS and keeps one item open where supported (spec W11).
export async function Faq() {
  const t = await getTranslations('Faq');

  return (
    <Section id="faq" labelledBy="faq-title" tone="surface">
      <Reveal>
        <SectionHeading id="faq-title" eyebrow={t('eyebrow')} title={t('title')} align="center" />
      </Reveal>
      <Reveal className="mx-auto flex w-full max-w-faq flex-col gap-3">
        {QUESTIONS.map((q, i) => (
          <details key={q} name="faq" open={i === 0} className="faq-item group rounded-panel border border-border bg-bg transition-colors duration-faq ease-out open:border-primary">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-panel px-6 py-5 text-body-lg font-semibold text-ink">
              {t(`items.${q}.question`)}
              <span aria-hidden="true" className="relative inline-flex size-5 shrink-0 items-center justify-center text-muted">
                <span className="absolute h-0.5 w-3 rounded-full bg-current" />
                <span className="absolute h-3 w-0.5 rounded-full bg-current transition-transform duration-faq ease-out group-open:rotate-90" />
              </span>
            </summary>
            <p className="px-6 pb-5 text-body text-muted">{t(`items.${q}.answer`)}</p>
          </details>
        ))}
      </Reveal>
    </Section>
  );
}
