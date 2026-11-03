import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';
import type { AppLocale } from '@/i18n/routing';
import type { LandingCopy } from './copy';

export function FinalCta({ copy, locale }: { copy: LandingCopy['final']; locale: AppLocale }) {
  return (
    <section aria-labelledby="final-title" className="bg-navy py-14 text-on-navy md:py-22">
      <Container className="flex flex-col items-start gap-6">
        <h2 id="final-title" className="text-cta font-extrabold text-balance text-on-navy">
          {copy.title}
        </h2>
        <ButtonLink variant="sticker" href={`/${locale}/app/register`} className="min-h-control-touch px-6">
          {copy.signup}
        </ButtonLink>
        <p className="text-small text-on-navy-muted">{copy.note}</p>
      </Container>
    </section>
  );
}
