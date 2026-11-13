import { ArrowRight, Bot, Pen, Search, Zap } from 'lucide-react';
import type { AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { bestPeriod, periodOffer, type Months, type Prices } from '@/lib/period-offer';
import { ButtonLink } from '@/ui/ButtonLink';
import { Reveal } from '../interactive/Reveal';
import { Container } from '../layout/Container';
import { fill, formatVnd, type LandingCopy } from './copy';
import { CheckList, Glow, SectionHead } from './parts';
import { FREE_PRICE, PERIOD_PRICE } from './styles';

const MONTHS: Months[] = ['1', '3', '12'];
const AI_ICONS = [Bot, Pen, Search, Zap];

/**
 * "Giá" `33:306` (phone `33:416`), owner QM8-2 (c): the three Pro prices read at build, each with its saving, and no purchase here. Free
 * and Pro cards side by side from xl (360 + 620 = 1004 px, more than the 944 px of content at 1024; R248). Every number comes from `periodOffer`, like Gói học's, so the two never disagree.
 * M8.6: the cards come in (Free, then Pro 120 ms later and without blur, Figma scene 6); while the Pro card is on screen a light runs
 * on its border (`data-pro-ring`, owner 13/11/2026: the blurred light around it bulged out) and its four AI badges pulse (CSS, `data-wm-on`). F.19: one glow layer (`.wm-price-drift`) drifts behind both cards.
 */
export function PricingSection({ copy, prices, locale }: { copy: LandingCopy['plans']; prices: Prices; locale: AppLocale }) {
  const register = `/${locale}/app/register`;
  return (
    <section id="gia" aria-labelledby="gia-title" className="relative isolate scroll-mt-15 overflow-x-clip md:scroll-mt-17">
      <div aria-hidden className="wm-price-drift" />
      <Container className="flex flex-col gap-8 pt-12 pb-10 md:items-center md:gap-11 md:pt-18 md:pb-12">
        <SectionHead id="gia-title" title={copy.title} lead={copy.lead} align="phone-left" />
        <div className="flex w-full flex-col gap-6 xl:w-auto xl:flex-row xl:items-stretch">
          <FreeCard copy={copy} register={register} />
          <ProCard copy={copy} prices={prices} register={register} />
        </div>
      </Container>
    </section>
  );
}

function FreeCard({ copy, register }: { copy: LandingCopy['plans']; register: string }) {
  return (
    <Reveal as="article" className="flex flex-col gap-4.5 rounded-wm-card border border-wm-line bg-wm-surface p-6 shadow-wm-soft md:p-8 xl:w-90">
      <h3 className="font-wm-display text-wm-card-title text-wm-ink">{copy.free}</h3>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className={cn(FREE_PRICE, 'text-wm-ink')}>{formatVnd(0)}</span>
        <span className="font-wm-sans text-wm-small text-wm-muted">{copy.freeNote}</span>
      </p>
      <CheckList items={copy.freeList} />
      <p className="font-wm-sans text-wm-small text-wm-muted">{copy.freeAds}</p>
      <ButtonLink reload variant="secondary" href={register} className="w-full xl:mt-auto">
        {copy.freeSignup}
      </ButtonLink>
    </Reveal>
  );
}

function ProCard({ copy, prices, register }: { copy: LandingCopy['plans']; prices: Prices; register: string }) {
  const best = bestPeriod(prices);
  const [aiTitle, ...aiRows] = copy.aiList;
  return (
    <Reveal loop delay={120} blur={0} data-pro-ring="" className="relative isolate flex flex-col rounded-wm-card xl:w-155">
      <article
        data-pro-card=""
        className="relative isolate flex flex-1 flex-col gap-5 overflow-hidden rounded-wm-card border-2 border-wm-accent bg-wm-surface p-6 shadow-wm-pro-glow md:p-8"
      >
        <Glow tone="accent" className="-top-30.5 left-29.5 h-65 w-140" />
        <div className="flex items-center gap-2.5">
          <h3 className="font-wm-display text-wm-card-title text-wm-accent">{copy.pro}</h3>
          {/* Light: Figma's #3d78ff end under white text is 3.94:1, so the gradient is stretched to 125 % in sRGB; the chip's lightest
              pixel is then 4.72:1 (dark: 5.20:1). R205. */}
          <span className="inline-flex items-center gap-1 rounded-wm-pill bg-linear-to-r/srgb from-wm-ai-from to-wm-ai-to to-125% py-0.75 pr-2.5 pl-2 font-wm-sans text-wm-label text-wm-on-accent shadow-wm-btn">
            <Bot aria-hidden className="size-3.5" />
            {copy.proBadge}
          </span>
        </div>
        <p className="font-wm-sans text-wm-base text-wm-muted">{copy.proLine}</p>

        <ul className="grid gap-2.5 md:grid-cols-3">
          {MONTHS.map((months) => (
            <Period key={months} copy={copy} prices={prices} months={months} best={best === months} />
          ))}
        </ul>

        <ul data-ai-block="" className="flex flex-col gap-3 rounded-wm-row border border-wm-accent bg-linear-to-r from-wm-accent/9 to-wm-mark/20 px-4.5 py-4">
          {[aiTitle, ...aiRows].map((row, i) => {
            const Icon = AI_ICONS[i];
            return (
              <li key={row} className={cn('flex items-center gap-2.5 font-wm-sans', i === 0 ? 'text-wm-base-strong text-wm-accent' : 'text-wm-base text-wm-ink')}>
                <span data-ai-badge="" className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-wm-surface text-wm-accent shadow-wm-soft">
                  <Icon aria-hidden className="size-4" />
                </span>
                {row}
              </li>
            );
          })}
        </ul>

        <CheckList items={copy.proList} />

        <div className="flex flex-col gap-3">
          <ButtonLink reload variant="primary" href={register} className="w-full">
            {copy.proSignup}
            <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
          <p className="text-center font-wm-sans text-wm-small text-wm-muted">{copy.noRefund}</p>
        </div>
      </article>
    </Reveal>
  );
}

/** One period (`33:351`…`33:367`): a row on a phone, a cell from md. The best saving is drawn like Figma's 12-month cell. */
function Period({ copy, prices, months, best }: { copy: LandingCopy['plans']; prices: Prices; months: Months; best: boolean }) {
  const offer = periodOffer(prices, months);
  const saving = offer.saving !== null && offer.saving >= 1 ? offer.saving : null;
  return (
    <li
      className={cn(
        'relative flex items-center justify-between gap-3 rounded-wm-row p-4 md:flex-col md:items-start md:justify-start md:gap-1.5',
        best ? 'border-2 border-wm-accent bg-wm-accent-soft shadow-wm-btn' : 'border border-wm-line bg-wm-bg',
      )}
    >
      {best && (
        <span className="absolute -top-3.5 left-3.5 rounded-wm-pill bg-wm-accent px-2.5 py-0.5 font-wm-sans text-wm-label text-wm-on-accent shadow-wm-btn">
          {copy.best}
        </span>
      )}
      <span className="flex items-center gap-2">
        <span className="font-wm-sans text-wm-small-strong text-wm-ink">{copy.periods[months]}</span>
        {saving !== null && (
          <span
            className={cn(
              'rounded-wm-pill px-2 py-0.5 font-wm-sans text-wm-label',
              best ? 'bg-wm-accent text-wm-on-accent' : 'bg-wm-accent-soft text-wm-accent',
            )}
          >
            {fill(copy.saving, { percent: saving })}
          </span>
        )}
      </span>
      <span className="flex flex-col items-end md:items-start">
        <span className={cn(PERIOD_PRICE, best ? 'text-wm-accent' : 'text-wm-ink')}>{formatVnd(offer.price)}</span>
        <span className={cn('font-wm-sans text-wm-caption', best ? 'text-wm-accent' : 'text-wm-muted')}>
          {months === '1' ? copy.perMonth : fill(copy.perMonthApprox, { price: formatVnd(offer.perMonth) })}
        </span>
      </span>
    </li>
  );
}
