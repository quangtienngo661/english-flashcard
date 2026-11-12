import { cn } from '@/lib/cn';
import { FlyIn } from '../interactive/FlyIn';
import { Container } from '../layout/Container';
import type { LandingCopy } from './copy';
import { Glow, SectionHead } from './parts';
import { BORDER_15 } from './styles';

/** The card Figma draws lit (`6:160`, 1.5 px accent border); every border flashes as its card lands. */
const LIT = 'fluctuate';

/** Figma scene 2's landing order (`13:209`…`13:222`), 55 ms apart; a word not listed goes after these. */
const FLY_ORDER = ['advocate', 'substantial', 'coherent', 'deteriorate', 'mitigate', 'fluctuate', 'viable', 'scrutiny', 'inevitable', 'allocate', 'reluctant', 'prevalent'];

/**
 * "Nhóm từ của mỗi đề" `6:120` (phone `9:242`): the twelve words of one test as a group, 4 × 3 cards (2 × 6 on a phone), and the caption
 * pill. The cards fly in as the list scrolls in, the caption last (FlyIn).
 */
export function GroupsSection({ copy }: { copy: LandingCopy['groups'] }) {
  return (
    <section id="nhom-tu" aria-labelledby="nhom-tu-title" className="relative isolate scroll-mt-15 overflow-x-clip md:scroll-mt-17">
      <Glow tone="accent" className="top-45 left-1/2 -ml-130 h-132 w-204" />
      <Glow tone="mark" className="top-75 left-1/2 ml-10 h-114 w-168" />
      <Container className="flex flex-col items-center gap-8 pt-12 pb-10 md:gap-11 md:pt-16 md:pb-12">
        <SectionHead id="nhom-tu-title" title={copy.title} lead={copy.lead} />
        <FlyIn>
          <ul className="grid w-full grid-cols-2 gap-2 md:w-auto md:grid-cols-4 md:gap-3.5">
            {copy.cards.map(({ word, pos, meaning }, i) => (
              <li
                key={word}
                data-group-card=""
                data-fly-step={String(FLY_ORDER.includes(word) ? FLY_ORDER.indexOf(word) : FLY_ORDER.length + i)}
                className={cn(
                  'relative flex h-16 flex-col justify-center gap-0.5 rounded-wm-row bg-wm-surface px-4 md:h-18.5 md:w-52.5',
                  word === LIT ? cn(BORDER_15, 'border-wm-accent shadow-wm-btn') : 'border border-wm-line shadow-wm-soft',
                )}
              >
                <span className="font-wm-display text-wm-word text-wm-ink">{word}</span>
                <span className="truncate font-wm-sans text-wm-caption text-wm-muted">
                  {pos} · {meaning}
                </span>
              </li>
            ))}
          </ul>
          <p data-group-caption="" className="rounded-wm-pill bg-wm-surface px-3.5 py-1.75 text-center font-wm-sans text-wm-small text-wm-muted shadow-wm-soft">
            <span className="md:hidden">{copy.captionPhone}</span>
            <span className="hidden md:inline">{copy.caption}</span>
          </p>
        </FlyIn>
      </Container>
    </section>
  );
}
