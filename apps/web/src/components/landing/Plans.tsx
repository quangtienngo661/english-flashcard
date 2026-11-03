import { Check } from 'lucide-react';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';
import type { AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import type { LandingCopy } from './copy';

function Points({ points, onNavy = false }: { points: string[]; onNavy?: boolean }) {
  return (
    <ul className={cn('flex flex-col gap-2.5 text-body', onNavy ? 'text-on-navy' : 'text-ink')}>
      {points.map((point) => (
        <li key={point} className="flex items-start gap-2.5">
          <Check aria-hidden className={cn('mt-1 size-4 shrink-0', onNavy ? 'text-accent' : 'text-success')} />
          {point}
        </li>
      ))}
    </ul>
  );
}

// Two plans, no prices (design landing-redesign §3). Free has no AI line; Pro carries the trial rule and nothing about when it opens.
// The Pro card is navy with the accent ledge and a yellow ring so that it stands out from the Free one in both themes (owner 03/11/2026).
export function Plans({ copy, locale }: { copy: LandingCopy['plans']; locale: AppLocale }) {
  return (
    <section id="goi" aria-labelledby="plans-title" className="scroll-mt-16 bg-surface py-14 md:py-24">
      <Container className="flex flex-col gap-8">
        <h2 id="plans-title" className="text-h2 font-extrabold text-ink">
          {copy.title}
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-card bg-canvas p-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-title-lg font-extrabold text-ink">{copy.free}</h3>
            </div>
            <Points points={[copy.freeP1, copy.freeP2, copy.freeP3]} />
            <ButtonLink variant="sticker" href={`/${locale}/app/register`} className="mt-1 min-h-control-touch w-fit px-6">
              {copy.signup}
            </ButtonLink>
          </div>
          <div className="flex flex-col gap-4 rounded-card bg-navy p-6 text-on-navy shadow-ledge-accent ring-2 ring-accent">
            <h3 className="text-title-lg font-extrabold text-on-navy">{copy.pro}</h3>
            <Points points={[copy.proP1, copy.proP2, copy.proP3, copy.proP4]} onNavy />
            <p className="max-w-prose text-small text-on-navy-muted">{copy.trial}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
