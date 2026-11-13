import { ArrowRight } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { Halo } from '@/site/layout/Halo';
import { SiteFooter } from '@/site/layout/SiteFooter';
import { ButtonLink } from '@/ui/ButtonLink';

// raw-ok: "404" is Bricolage ExtraBold 80 (phone) / 104, line-height 1, −4 % (`24:332`)
const CODE = 'font-wm-display text-[5rem]/[1] font-extrabold tracking-[-0.04em] text-wm-accent md:text-[6.5rem]/[1]';

/** Figma's raw glow under "404", 0 12 36 accent 30 %: no token has it, and the class check of `src/styles/text-classes.test.ts` reads an arbitrary text shadow class as an unknown size. */
const CODE_GLOW = { textShadow: '0 12px 36px rgb(30 58 138 / 0.3)' };

// raw-ok: the title is Bricolage Bold 28 / 1.28, −1.5 % on a phone and 32 / 1.3, −1 % from md (`24:333`, `24:339`)
const TITLE = 'font-wm-display text-[1.75rem]/[1.28] font-bold tracking-[-0.015em] text-wm-ink md:text-[2rem]/[1.3] md:tracking-[-0.01em]';

/**
 * Figma `16:317` / `18:358`: outside the (pages) group, so no header (R195); its own `main` and the footer. One card centred in a 900 px
 * area (700 on a phone) between two halos. Motion (Figma scene 5, `24:427`, R220): the card fades and rises, "404" drops in, then the title,
 * body and button; the halos drift. The site motion CSS runs it on load from `data-wm-404` / `data-wm-halo`; without JS or with reduced
 * motion it is still. "404" is decoration (`aria-hidden`): the h1 says it.
 */
export default async function NotFound() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations('NotFound');
  return (
    <>
      <main id="main" tabIndex={-1} className="relative isolate overflow-x-clip">
        <div className="relative flex min-h-175 items-center justify-center px-4 py-10 md:min-h-225 md:py-16">
          <Halo
            tone="accent"
            drift="404-accent"
            className="top-1/2 left-1/2 -mt-47.5 -ml-58.75 h-65 w-80 md:-mt-70 md:-ml-105 md:h-105 md:w-140"
          />
          <Halo
            tone="mark"
            drift="404-mark"
            className="top-1/2 left-1/2 -mt-12.5 -ml-18.75 h-60 w-75 md:-mt-32.5 md:-ml-20 md:h-95 md:w-130"
          />
          <div
            data-wm-404="card"
            className="flex w-full max-w-89.5 flex-col items-center gap-3.5 rounded-wm-card border border-wm-line bg-wm-surface px-6 py-10 text-center shadow-wm-stage md:max-w-150 md:gap-4 md:px-12 md:py-14"
          >
            <p
              aria-hidden
              data-wm-404="code"
              className={CODE}
              // raw-ok: the glow under "404" (CODE_GLOW)
              style={CODE_GLOW}
            >
              404
            </p>
            <h1 data-wm-404="title" className={TITLE}>
              {t('title')}
            </h1>
            <p data-wm-404="body" className="max-w-77.5 font-wm-sans text-wm-base text-wm-muted md:max-w-none">
              {t('body')}
            </p>
            <div data-wm-404="button" className="mt-1 md:mt-2">
              <ButtonLink href="/">
                {t('home')}
                <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
