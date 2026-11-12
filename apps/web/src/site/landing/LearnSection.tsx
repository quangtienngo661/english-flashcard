import { Volume2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { DemoLoops } from '../interactive/DemoLoops';
import { Reveal } from '../interactive/Reveal';
import { Container } from '../layout/Container';
import type { LandingCopy } from './copy';
import { ChoiceRow, Eyebrow, Marked, Progress, SectionHead, WaveBars } from './parts';
import { BIN_VALUE, BORDER_15, CARD, LISTEN_WORD, SENTENCE_22, TEXT_17 } from './styles';

/** The review box Figma draws lit (`7:180`): "7 ngày · quen mặt". */
const ACTIVE_BIN = 2;

/**
 * "Từ lúc gặp tới lúc dùng được" `7:61` (phone `9:291`): four cards on a 3-column grid from lg (Figma 768 + 376, gap 16). "Nghe và đọc
 * phiên âm" shows from md (the phone frame has none); the phone practice demo keeps only the sentence and choices 1 and 4. On a phone the
 * review boxes are pills that wrap 3 + 2, as `9:291` draws them (R245).
 * M8.6: the cards come in 0 / 120 / 220 / 300 ms apart (bản 3); while on screen Ghi từ types, the listen button pings and the review boxes
 * light in turn (DemoLoops). The practice demo stays still.
 */
export function LearnSection({ copy }: { copy: LandingCopy['learn'] }) {
  const { practice, note, listen, review } = copy;
  return (
    <section id="cach-hoc" aria-labelledby="cach-hoc-title" className="scroll-mt-15 md:scroll-mt-17">
      <Container className="flex flex-col items-center gap-8 pt-12 pb-4 md:gap-10 md:pt-16">
        <SectionHead id="cach-hoc-title" title={copy.title} lead={copy.lead} />
        <DemoLoops className="grid w-full gap-4 lg:grid-cols-3">
          <Card eyebrow={practice.eyebrow} title={practice.title} body={practice.body} delay={0} className="lg:col-span-2 lg:row-span-2">
            <PracticeDemo copy={practice} />
          </Card>
          <Card eyebrow={note.eyebrow} title={note.title} body={note.body} delay={120}>
            <div className="flex flex-col gap-2.5 rounded-wm-row bg-wm-bg p-4">
              <p className={cn(TEXT_17, BORDER_15, 'flex h-11.5 items-center rounded-wm-control border-wm-line bg-wm-surface px-3 text-wm-ink')}>
                <span data-typed="">{note.typed}</span>
                <span aria-hidden data-caret="" className="ml-px h-4.75 w-0.5 bg-wm-accent" />
              </p>
              <p data-result="" className="flex items-baseline justify-between gap-3 rounded-wm-row bg-wm-surface px-3 py-2 shadow-wm-soft">
                <span className="font-wm-display text-wm-word text-wm-ink">{note.lemma}</span>
                <span className="font-wm-sans text-wm-caption text-wm-muted">{note.meaning}</span>
              </p>
            </div>
          </Card>
          <Card eyebrow={listen.eyebrow} title={listen.title} delay={220} className="hidden md:flex">
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
          <Card eyebrow={review.eyebrow} title={review.title} body={review.body} delay={300} className="lg:col-span-3">
            <ol className="flex flex-wrap gap-2">
              {review.bins.map((bin, i) => (
                // The lit look hangs on `data-on`, so DemoLoops can move it: the accent fill is a layer that fades (300 ms), the text
                // colours change with it.
                <li
                  key={bin.value}
                  data-bin=""
                  data-on={i === ACTIVE_BIN ? '' : undefined}
                  className="group relative isolate flex flex-col gap-1 rounded-wm-control bg-wm-bg px-3 py-2 text-wm-ink before:absolute before:inset-0 before:-z-10 before:rounded-wm-control before:bg-wm-accent before:opacity-0 before:shadow-wm-btn data-on:text-wm-on-accent data-on:before:opacity-100 motion-safe:transition-colors motion-safe:duration-300 motion-safe:before:transition-opacity motion-safe:before:duration-300 md:flex-1 md:p-3.5"
                >
                  <span className={BIN_VALUE}>{bin.value}</span>
                  <span className="hidden font-wm-sans text-wm-caption text-wm-muted group-data-on:text-wm-on-accent group-data-on:opacity-80 md:block">{bin.label}</span>
                </li>
              ))}
            </ol>
          </Card>
        </DemoLoops>
      </Container>
    </section>
  );
}

function Card({
  eyebrow,
  title,
  body,
  delay,
  className,
  children,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  delay: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Reveal as="article" delay={delay} className={cn(CARD, 'flex flex-col gap-3.5 rounded-wm-card p-5 text-left md:p-6', className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h3 className="font-wm-display text-wm-card-title text-wm-ink">{title}</h3>
      {body && <p className="font-wm-sans text-wm-base text-wm-muted">{body}</p>}
      {/* Figma pins the demo to the card's foot (a spacer in `7:67`), so the two columns end level. */}
      <div className="mt-auto pt-2">{children}</div>
    </Reveal>
  );
}

function PracticeDemo({ copy }: { copy: LandingCopy['learn']['practice'] }) {
  const shown = [0, 3];
  return (
    <div className="flex flex-col gap-3 rounded-wm-row bg-wm-bg p-4">
      <div className="hidden flex-col gap-3 md:flex">
        <p className="flex justify-between gap-3 font-wm-sans text-wm-caption text-wm-muted">
          <span>{copy.demoTitle}</span>
          <span>{copy.count}</span>
        </p>
        <Progress done={6} total={20} />
        <ul className="flex flex-wrap gap-2">
          {copy.scores.map(({ n, label }) => (
            <li key={label} className="rounded-wm-pill border border-wm-line bg-wm-surface px-3 py-1 font-wm-sans text-wm-caption text-wm-muted">
              <span className="font-semibold text-wm-ink">{n}</span> {label}
            </li>
          ))}
        </ul>
      </div>
      <p className={cn(SENTENCE_22, 'py-1 text-wm-ink')}>
        <Marked sentence={copy.sentence} target={copy.target} />
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {copy.choices.map((word, i) => (
          <ChoiceRow
            key={word}
            n={i + 1}
            word={word}
            state={i === 0 ? 'right' : i === 3 ? 'wrong' : undefined}
            note={i === 0 ? copy.right : i === 3 ? copy.wrong : undefined}
            className={shown.includes(i) ? undefined : 'hidden md:flex'}
          />
        ))}
      </div>
    </div>
  );
}
