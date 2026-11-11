import { ArrowRight } from 'lucide-react';
import type { AppLocale } from '@/i18n/routing';
import { ButtonLink } from '@/ui/ButtonLink';
import { Container } from '../layout/Container';
import type { LandingCopy } from './copy';
import { Glow } from './parts';
import { BORDER_15, FINAL_TITLE } from './styles';

/**
 * "Phần cuối" `7:200` (phone `9:353`): one white card with the closing line and the sign-up button. Its 1.5 px border is transparent:
 * the track of the light M8.6 runs around it. The halo is desktop only, as drawn.
 */
export function FinalCta({ copy, locale }: { copy: LandingCopy['final']; locale: AppLocale }) {
  return (
    <section aria-labelledby="cuoi-title" className="relative isolate overflow-x-clip">
      <Glow tone="accent" className="top-50 left-1/2 -ml-95 hidden h-75 w-190 md:block" />
      <Container className="pt-8 pb-12 md:pt-12 md:pb-18">
        <div
          data-final-card=""
          className={`mx-auto flex max-w-230 flex-col items-center gap-4 rounded-wm-2xl border-transparent bg-wm-surface px-6 py-9 text-center shadow-wm-lift md:gap-5 md:p-18 ${BORDER_15}`}
        >
          <h2 id="cuoi-title" className={`max-w-190 ${FINAL_TITLE}`}>
            {copy.title}
          </h2>
          <p className="font-wm-sans text-wm-base text-wm-muted">{copy.note}</p>
          <ButtonLink reload variant="primary" href={`/${locale}/app/register`}>
            {copy.signup}
            <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
