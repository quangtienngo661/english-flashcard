import { Check, Volume2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Tag } from '@/ui/Tag';
import { DemoLoops } from '../interactive/DemoLoops';
import { Reveal } from '../interactive/Reveal';
import { Container } from '../layout/Container';
import { fill, type LandingCopy } from './copy';
import { ChoiceRow, Eyebrow, Filled, Progress, SectionHead, WaveBars } from './parts';
import { BIN_VALUE, BORDER_15, CARD, LISTEN_WORD, QUESTION, TEXT_17 } from './styles';

/** The review box Figma draws lit (`7:180`): "7 ngày · quen mặt". */
const ACTIVE_BIN = 2;

/**
 * Four steps in learning order. The phone practice demo keeps the sentence and choices 1 and 4.
 * M8.6: the cards come in 0 / 120 / 220 / 300 ms apart (bản 3); while on screen Ghi từ types, the listen button pings and the review boxes
 * light in turn (DemoLoops). The practice demo stays still.
 */
export function LearnSection({ copy }: { copy: LandingCopy['learn'] }) {
  const { practice, note, listen, review } = copy;
  return (
    <section id="cach-hoc" aria-labelledby="cach-hoc-title" className="scroll-mt-15 md:scroll-mt-17">
      <Container className="flex flex-col items-center gap-8 pt-12 pb-4 md:gap-10 md:pt-16">
        <SectionHead id="cach-hoc-title" title={copy.title} lead={copy.lead} />
        <DemoLoops className="w-full">
          <ol className="mx-auto w-full max-w-245">
            <Card step={1} eyebrow={note.eyebrow} title={note.title} body={note.body} delay={0}>
              <div className="flex flex-col gap-2.5 rounded-wm-row bg-wm-bg p-4">
                <p className={cn(TEXT_17, BORDER_15, 'flex h-11.5 items-center rounded-wm-control border-wm-line bg-wm-surface px-3 text-wm-ink')}>
                  <span data-typed="">{note.typed}</span>
                  <span aria-hidden data-caret="" className="ml-px h-4.75 w-0.5 bg-wm-accent" />
                </p>
                <p data-result="" className="flex items-baseline justify-between gap-3 rounded-wm-control bg-wm-surface px-3 py-2 shadow-wm-soft">
                  <span className="font-wm-display text-wm-word text-wm-ink">{note.lemma}</span>
                  <span className="font-wm-sans text-wm-caption text-wm-muted">{note.meaning}</span>
                </p>
              </div>
            </Card>
            <Card step={2} eyebrow={listen.eyebrow} title={listen.title} delay={120}>
              <div className="flex items-center gap-4 rounded-wm-row bg-wm-bg p-4">
                <span aria-hidden data-listen="" className="inline-flex size-13 shrink-0 items-center justify-center rounded-full bg-wm-accent ring-10 ring-wm-accent/25">
                  <Volume2 className="size-5.5 text-wm-on-accent" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className={cn(LISTEN_WORD, 'text-wm-ink')}>{listen.word}</span>
                  <span className="flex items-center gap-2 font-wm-sans text-wm-small text-wm-muted">
                    {listen.ipa}
                    <WaveBars count={4} />
                  </span>
                </span>
              </div>
            </Card>
            <Card step={3} eyebrow={practice.eyebrow} title={practice.title} body={practice.body} delay={220}>
              <PracticeDemo copy={practice} />
            </Card>
            <Card step={4} eyebrow={review.eyebrow} title={review.title} body={review.body} delay={300}>
              <ol className="flex flex-wrap gap-2">
                {review.bins.map((bin, i) => (
                  // The lit look hangs on `data-on`, so DemoLoops can move it: the accent fill is a layer that fades (300 ms), the text
                  // colours change with it.
                  <li
                    key={bin.value}
                    data-bin=""
                    data-on={i === ACTIVE_BIN ? '' : undefined}
                    className="group relative isolate flex flex-col gap-1 rounded-wm-control bg-wm-bg px-3 py-2 text-wm-ink before:absolute before:inset-0 before:-z-10 before:rounded-wm-control before:bg-wm-accent before:opacity-0 before:shadow-wm-btn data-on:text-wm-on-accent data-on:before:opacity-100 motion-safe:transition-colors motion-safe:duration-300 motion-safe:before:transition-opacity motion-safe:before:duration-300 md:flex-1 md:p-3.5 lg:px-2.5 xl:px-3.5"
                  >
                    <span className={BIN_VALUE}>{bin.value}</span>
                    <span className="hidden font-wm-sans text-wm-caption text-wm-muted group-data-on:text-wm-on-accent group-data-on:opacity-80 md:block">{bin.label}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </ol>
        </DemoLoops>
      </Container>
    </section>
  );
}

function Card({
  step,
  eyebrow,
  title,
  body,
  delay,
  children,
}: {
  step: number;
  eyebrow: string;
  title: string;
  body?: string;
  delay: number;
  children: ReactNode;
}) {
  return (
    // raw-ok: the number rail is 40 px wide and the demo column can shrink to fit.
    <li className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 pb-7 last:pb-0 after:absolute after:top-10 after:bottom-0 after:left-4.75 after:w-0.5 after:bg-wm-line last:after:hidden md:gap-4">
      <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-wm-accent font-wm-display font-bold text-wm-on-accent">
        {step}
      </span>
      <Reveal
        as="article"
        delay={delay}
        // raw-ok: the approved desktop layout sets aside 300 px for the text.
        className="grid min-w-0 items-start gap-4 text-left lg:grid-cols-[300px_minmax(0,1fr)]"
      >
        <div className="flex flex-col gap-1 pt-2">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h3 className="font-wm-display text-wm-card-title text-wm-ink">{title}</h3>
          {body && <p className="mt-1 font-wm-sans text-wm-base text-wm-muted">{body}</p>}
        </div>
        <div className={cn(CARD, 'min-w-0 rounded-wm-card p-2 md:p-4')}>{children}</div>
      </Reveal>
    </li>
  );
}

function PracticeDemo({ copy }: { copy: LandingCopy['learn']['practice'] }) {
  const shown = [0, 3];
  const { tally } = copy;
  return (
    <div className="flex flex-col gap-3 rounded-wm-row bg-wm-bg p-4">
      <div className="hidden flex-col gap-3 md:flex">
        <div className="flex items-center gap-2 font-wm-sans text-wm-caption text-wm-muted">
          <span className="mr-auto">{copy.demoTitle}</span>
          <span>{copy.count}</span>
          <span role="img" aria-label={fill(tally.rightLabel, { count: tally.right })}>
            <Tag tone="pass">
              <Check aria-hidden className="size-3" />
              {tally.right}
            </Tag>
          </span>
          <span role="img" aria-label={fill(tally.wrongLabel, { count: tally.wrong })}>
            <Tag tone="fail">
              <X aria-hidden className="size-3" />
              {tally.wrong}
            </Tag>
          </span>
        </div>
        <Progress done={6} total={20} />
      </div>
      <p className={cn(QUESTION, 'py-4 text-wm-ink md:py-5')}>
        <Filled sentence={copy.sentence} target={copy.target} />
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {copy.choices.map((word, i) => (
          <ChoiceRow
            key={word}
            n={i + 1}
            word={word}
            state={i === 0 ? 'right' : i === 3 ? 'wrong' : undefined}
            statusLabel={i === 0 ? copy.choiceStatus.correct : i === 3 ? copy.choiceStatus.incorrect : undefined}
            className={shown.includes(i) ? undefined : 'hidden md:flex'}
          />
        ))}
      </div>
    </div>
  );
}
