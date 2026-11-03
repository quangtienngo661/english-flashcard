import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';
import type { AppLocale } from '@/i18n/routing';
import type { LandingCopy } from './copy';

// First screen (design landing-redesign §3, owner 03/11/2026): the heading, one promise and the sign-up action on the left from lg, the app window
// (`visual`) on the right; below lg the window sits under the words. Everything moves in once when the page opens (CSS only, so it also works without JS).
export function Hero({ copy, locale, visual }: { copy: LandingCopy['hero']; locale: AppLocale; visual?: ReactNode }) {
  return (
    <section aria-labelledby="hero-title" className="pt-10 md:pt-16 lg:pt-8 lg:pb-12">
      <Container className="grid items-center gap-8 md:gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col gap-6 md:gap-8 lg:col-span-5">
          {/* Each line is balanced on its own: with a <br /> the browser balances nothing and 320 px left "dụng" alone on a line. */}
          <h1 id="hero-title" className="text-landing-h1 font-extrabold text-ink">
            <span className="block text-balance motion-safe:animate-hero-in">{copy.line1}</span>{' '}
            <span className="block text-balance motion-safe:animate-hero-in motion-safe:[animation-delay:70ms]">{copy.line2}</span>
          </h1>
          <div className="flex max-w-landing-hero flex-col gap-5">
            <p className="text-lead text-ink motion-safe:animate-hero-in motion-safe:[animation-delay:140ms]">{copy.lead}</p>
            <div className="flex flex-col gap-3 motion-safe:animate-hero-in motion-safe:[animation-delay:210ms]">
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
        </div>
        {visual && <div className="min-w-0 motion-safe:animate-hero-window-in motion-safe:[animation-delay:120ms] lg:col-span-7">{visual}</div>}
      </Container>
    </section>
  );
}
