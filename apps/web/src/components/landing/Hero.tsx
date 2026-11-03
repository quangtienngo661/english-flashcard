import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';
import type { AppLocale } from '@/i18n/routing';
import type { LandingCopy } from './copy';

// First screen (design landing-redesign §3): the heading, one promise, and the sign-up action on the left. The app window sits below it.
export function Hero({ copy, locale }: { copy: LandingCopy['hero']; locale: AppLocale }) {
  return (
    <section aria-labelledby="hero-title" className="pt-10 pb-4 md:pt-16">
      <Container className="flex flex-col gap-6 md:gap-8">
        {/* Each line is balanced on its own: with a <br /> the browser balances nothing and 320 px left "dụng" alone on a line. */}
        <h1 id="hero-title" className="text-landing-h1 font-extrabold text-ink">
          <span className="block text-balance">{copy.line1}</span> <span className="block text-balance">{copy.line2}</span>
        </h1>
        <div className="flex max-w-landing-hero flex-col gap-5">
          <p className="text-lead text-ink">{copy.lead}</p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <ButtonLink variant="sticker" href={`/${locale}/app/register`} className="min-h-control-touch px-6">
                {copy.signup}
              </ButtonLink>
              <p className="text-small text-muted">
                {copy.haveAccount}{' '}
                <a href={`/${locale}/app/login`} className="font-semibold text-primary underline underline-offset-4">
                  {copy.login}
                </a>
              </p>
            </div>
            <p className="text-caption text-muted">{copy.note}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
