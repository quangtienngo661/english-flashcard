import { ArrowRight } from 'lucide-react';
import type { AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { ButtonLink } from '@/ui/ButtonLink';
import { Container } from '../layout/Container';
import type { LandingCopy } from './copy';
import { ChoiceRow, Glow, Marked, Progress, WaveBars } from './parts';
import { BIN_GLOW, FLOAT_VALUE, TEXT_17 } from './styles';

/**
 * Figma Hero `5:24` (phone `9:115`): the topic pill, the title with "trong câu" in the accent colour, the lead, two buttons and the stage
 * (the app mock-up with its floating cards: two from xl, where Figma's offsets fit beside it, one below). Static markup; M8.6 adds the
 * word-by-word entrance, the topic ticker, the bobbing cards and the wave bars on the elements marked here.
 */
export function Hero({ copy, stage, locale }: { copy: LandingCopy['hero']; stage: LandingCopy['stage']; locale: AppLocale }) {
  const at = copy.line2.indexOf(copy.accent);
  const before = at < 0 ? copy.line2 : copy.line2.slice(0, at);
  const after = at < 0 ? '' : copy.line2.slice(at + copy.accent.length);
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-x-clip">
      <Glow tone="accent" className="-top-5 left-1/2 -ml-160 h-126 w-192" />
      <Glow tone="mark" className="top-55 left-1/2 -ml-5 h-114 w-168" />
      <Container className="flex flex-col items-center gap-4.5 pt-11 pb-14 md:gap-5.5 md:pt-19 md:pb-18">
        <p className="flex items-center gap-2 rounded-wm-pill border border-wm-line bg-wm-surface py-1.5 pr-3.5 pl-1.5 shadow-wm-soft">
          {/* "Chủ đề (chạy vòng)": 20 px rows behind a window one row high; M8.6 moves the list. */}
          <span data-topic-ticker="" className="h-5 w-21 shrink-0 overflow-hidden rounded-wm-md bg-wm-accent md:w-22.25">
            <span className="flex flex-col">
              {copy.topics.map((topic) => (
                <span key={topic} className="flex h-5 items-center justify-center font-wm-sans text-wm-label text-wm-on-accent">
                  {topic}
                </span>
              ))}
            </span>
          </span>
          <span className="font-wm-sans text-wm-caption text-wm-muted md:text-wm-small">{copy.topicLabel}</span>
        </p>

        <h1 id="hero-title" className="max-w-205 text-center font-wm-display text-wm-site-hero-mobile text-wm-ink lg:text-wm-site-hero">
          {copy.line1} <br className="md:hidden" />
          {before}
          <span className="text-wm-accent">{copy.accent}</span>
          {after}
        </h1>
        <p className={cn(TEXT_17, 'max-w-150 text-center text-wm-muted md:text-wm-lead')}>{copy.lead}</p>

        <div className="flex flex-wrap justify-center gap-2.5 md:gap-3">
          <ButtonLink reload variant="primary" href={`/${locale}/app/register`}>
            {copy.signup}
            <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
          <ButtonLink reload variant="secondary" href="#cach-hoc">
            {copy.howTo}
          </ButtonLink>
        </div>

        <Stage copy={stage} />
      </Container>
    </section>
  );
}

/** "Sân khấu" `5:42`: Figma places the floating cards in its coordinates (desktop (−110, −40) and (793, 288); phone (−4, −11)). */
function Stage({ copy }: { copy: LandingCopy['stage'] }) {
  return (
    <div className="relative w-full max-w-250 pt-23 xl:pt-10">
      <div className="flex flex-col gap-3 rounded-wm-xl border border-wm-line bg-wm-surface p-3.5 shadow-wm-stage lg:flex-row lg:gap-4.5 lg:p-5">
        <WordCard copy={copy} />
        <PracticeCard copy={copy} />
      </div>
      <AddedCard copy={copy} />
      <BinCard copy={copy} />
    </div>
  );
}

function WordCard({ copy }: { copy: LandingCopy['stage'] }) {
  return (
    <div className="flex flex-col gap-3 rounded-wm-lg bg-wm-bg p-4.5 text-left lg:w-107.5 lg:shrink-0">
      <p className="font-wm-sans text-wm-label text-wm-muted">{copy.cardLabel}</p>
      <p className="font-wm-display text-wm-lemma text-wm-ink">{copy.lemma}</p>
      <p className="flex items-center gap-2.5 font-wm-sans text-wm-base text-wm-muted">
        {copy.pos} · {copy.ipa}
        <WaveBars />
      </p>
      <p className={cn(TEXT_17, 'text-wm-ink')}>
        {copy.definition}
        <span className="text-wm-muted md:hidden"> · {copy.meaning}</span>
      </p>
      <p className="hidden font-wm-sans text-wm-button font-normal text-wm-muted md:block">{copy.meaning}</p>
      <p className="rounded-wm-md bg-wm-surface p-3 font-wm-sans text-wm-base text-wm-ink">
        <Marked sentence={copy.example} target={copy.target} />
      </p>
    </div>
  );
}

function PracticeCard({ copy }: { copy: LandingCopy['stage'] }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-wm-lg bg-wm-bg p-4.5 text-left">
      <p className="flex justify-between gap-3 font-wm-sans text-wm-caption text-wm-muted">
        <span>{copy.practiceTitle}</span>
        <span>{copy.practiceCount}</span>
      </p>
      <Progress done={3} total={16} />
      <p className="font-wm-sans text-wm-lead text-wm-ink">
        <Marked sentence={copy.sentence} target={copy.target} />
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {copy.choices.map((word, i) => (
          <ChoiceRow key={word} n={i + 1} word={word} state={i === 0 ? 'right' : undefined} note={i === 0 ? copy.right : undefined} />
        ))}
      </div>
      <p className="hidden justify-between gap-3 font-wm-sans text-wm-caption text-wm-muted md:flex">
        <span>{copy.keyNext}</span>
        <span>{copy.keyHint}</span>
      </p>
    </div>
  );
}

/** "vừa thêm" `5:135` (phone 200 wide, three words and "+15 từ"; desktop 230 wide, four words and "+14 từ"). */
function AddedCard({ copy }: { copy: LandingCopy['stage'] }) {
  const chip = 'rounded-wm-sm px-2 py-0.5 font-wm-sans text-wm-caption';
  return (
    <div
      data-float="added"
      className="absolute -top-2.75 -left-1 flex w-50 -rotate-5 flex-col gap-2 rounded-wm-lg border border-wm-line bg-wm-surface px-4 py-3.5 text-left shadow-wm-stage backdrop-blur-wm-sm xl:-top-10 xl:-left-27.5 xl:w-57.5"
    >
      <p className="flex justify-between gap-2 font-wm-sans text-wm-label text-wm-muted">
        <span>{copy.addedTitle}</span>
        <span>{copy.addedNote}</span>
      </p>
      <p className="flex flex-wrap gap-1.5">
        {copy.addedWords.map((word, i) => (
          <span key={word} className={cn(chip, 'bg-wm-accent-soft text-wm-accent', i === 3 && 'hidden xl:inline')}>
            {word}
          </span>
        ))}
        <span className={cn(chip, 'bg-wm-bg text-wm-muted xl:hidden')}>{copy.addedMorePhone}</span>
        <span className={cn(chip, 'hidden bg-wm-bg text-wm-muted xl:inline')}>{copy.addedMore}</span>
      </p>
    </div>
  );
}

/** "lên ngăn" `5:150`, desktop only (the phone frame has none): the word moved on to its next review in 7 days. */
function BinCard({ copy }: { copy: LandingCopy['stage'] }) {
  return (
    <div
      data-float="bin"
      className="absolute top-72 left-198.25 hidden w-62.5 rotate-4 flex-col gap-2 rounded-wm-lg border border-wm-line bg-wm-surface px-4 py-3.5 text-left shadow-wm-stage xl:flex"
    >
      <p className="flex justify-between gap-2 font-wm-sans text-wm-label">
        <span className="text-wm-ink">{copy.binWord}</span>
        <span className="text-wm-muted">{copy.binNote}</span>
      </p>
      <span aria-hidden className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={cn('h-2 flex-1 rounded-wm-pill', i < 3 ? cn('bg-wm-accent', BIN_GLOW) : 'bg-wm-line')} />
        ))}
      </span>
      <p className={cn(FLOAT_VALUE, 'text-wm-ink')}>{copy.binValue}</p>
    </div>
  );
}
