import { Check, X } from 'lucide-react';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';
import type { AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import type { LandingCopy } from './copy';

// A tick or a cross in a disc; the words Có / Không are there for a screen reader, which cannot see the symbol.
function Mark({ on, yes, no }: { on: boolean; yes: string; no: string }) {
  const Icon = on ? Check : X;
  return (
    <span className={cn('inline-grid size-6 place-items-center rounded-full', on ? 'bg-success text-surface' : 'bg-canvas-deep text-muted')}>
      <Icon aria-hidden strokeWidth={3} className="size-3.5" />
      <span className="sr-only">{on ? yes : no}</span>
    </span>
  );
}

// The Pro column is one tall card drawn in the app's own sticker style (cream ground, ink edge, a ledge under it), the way the add-word box and the
// review card are, so it stands out from the plain Free column in both themes without a dark block in a light page (owner 03/11/2026, redesign pass).
// The cells carry the cream, and a frame laid over the column (no ground of its own) draws the edge and the ledge, so the corners come out round.
const VALUE_COLUMN = 'w-14 md:w-24';
const PRO_FRAME = 'pointer-events-none absolute inset-y-0 right-0 rounded-card border-2 border-ink shadow-ledge'; // taste-skill-ignore: the app's sticker edge

// Two plans, no prices (design landing-redesign §3), as a comparison table (owner 03/11/2026, after a pricing-table reference): the plans are columns, the
// seven lines the app already names are rows. The first three are Free's (Pro has them as well), the last four are Pro's. Beside the table (under it on a
// phone) go the way in, Đăng ký, and the trial rule, with nothing about when it opens. Rows are told apart by alternate bands, not by lines.
export function Plans({ copy, locale }: { copy: LandingCopy['plans']; locale: AppLocale }) {
  const lines: Array<{ label: string; free: boolean }> = [
    { label: copy.freeP1, free: true },
    { label: copy.freeP2, free: true },
    { label: copy.freeP3, free: true },
    { label: copy.proP1, free: false },
    { label: copy.proP2, free: false },
    { label: copy.proP3, free: false },
    { label: copy.proP4, free: false },
  ];
  const name = 'px-1 pt-4 pb-3 text-center text-ui font-extrabold text-ink md:text-title-lg';
  return (
    <section id="goi" aria-labelledby="plans-title" className="scroll-mt-16 bg-surface py-14 md:py-24">
      <Container className="grid items-start gap-8 md:grid-cols-12 md:gap-x-12 md:gap-y-6">
        <h2 id="plans-title" className="text-h2 font-extrabold text-ink md:col-span-4 md:row-start-1">
          {copy.title}
        </h2>
        <div className="md:col-span-8 md:col-start-5 md:row-span-2 md:row-start-1">
          <div className="relative">
          <table aria-labelledby="plans-title" className="w-full table-fixed border-separate border-spacing-0 text-left">
            <colgroup>
              <col />
              <col className={VALUE_COLUMN} />
              <col className={VALUE_COLUMN} />
            </colgroup>
            <thead>
              <tr>
                <td />
                <th scope="col" className={name}>
                  {copy.free}
                </th>
                <th scope="col" className={cn(name, 'rounded-t-card bg-accent-soft')}>
                  {copy.pro}
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const banded = index % 2 === 0;
                const last = index === lines.length - 1;
                return (
                  <tr key={line.label}>
                    <th scope="row" className={cn('py-3 pr-3 pl-3 text-left text-ui font-medium text-ink md:text-body', banded && 'rounded-l-inner bg-canvas')}>
                      {line.label}
                    </th>
                    <td className={cn('py-3 text-center', banded && 'rounded-r-inner bg-canvas')}>
                      <Mark on={line.free} yes={copy.yes} no={copy.no} />
                    </td>
                    <td className={cn('bg-accent-soft py-3 text-center', last && 'rounded-b-card pb-4')}>
                      <Mark on yes={copy.yes} no={copy.no} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <span aria-hidden className={cn(PRO_FRAME, VALUE_COLUMN)} />
          </div>
        </div>
        <div className="flex flex-col gap-4 md:col-span-4 md:row-start-2 md:self-start">
          <ButtonLink variant="sticker" href={`/${locale}/app/register`} className="min-h-control-touch w-fit px-6">
            {copy.signup}
          </ButtonLink>
          <p className="max-w-prose text-small text-muted">
            <b className="font-semibold text-ink">{copy.pro}</b> · <span>{copy.trial}</span>
          </p>
        </div>
      </Container>
    </section>
  );
}
