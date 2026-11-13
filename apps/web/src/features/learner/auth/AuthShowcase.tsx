'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { useWordCycle } from '@/lib/word-cycle';
import { Card } from '@/ui/Card';
import { LEVEL_FILL, LEVEL_INTERVAL_DAYS, useLevelInterval, useLevelName, type Level } from '@/ui/levels';
import { TargetWord } from '@/ui/TargetWord';
import { TypingBlank } from '@/ui/TypingBlank';

// The panel beside the sign-in and sign-up forms, from 1280 px only (P.14, mockup L418-460, L1395-1480). It tells the learning loop: words
// travel a dashed memory path from "Mới" to "Bậc 5", the word card cycles five words, the practice card types the word into the blank and
// turns green, and the due count falls. It is a picture of the app, not content: the whole panel is aria-hidden. With reduced motion
// nothing moves and the final frame of each loop shows at once.

// The scene is drawn at 640 x 868 (the panel at 1440 x 900) and scales with rem; the SVG and the travelling words share these coordinates.
const PATH = 'M 55 774 C 183 713, 210 571, 274 479 S 384 306, 475 234 S 549 122, 585 71';

/** Points of the path at 2 %, 17 %, 37 %, 57 %, 77 % and 95 % of its length (mockup nodes, plus "Mới" at the start). */
const NODES: Array<[x: number, y: number, level: Level]> = [[71, 766, 0], [167, 674, 1], [251, 517, 2], [350, 368, 3], [471, 237, 4], [564, 110, 5]];

/** Each label sits on the side of its dot away from the cards: right for Mới, Bậc 2, 3 and 4, left for Bậc 1 and 5 (Bậc 3 to the right: the word card's foot is on its left). */
const LABEL_LEFT: ReadonlySet<Level> = new Set<Level>([1, 5]);

/**
 * Travelling words, each 3.5 s behind the one before; with reduced motion they stand still at a level's stretch of the path (`still`, % of
 * the path). With motion each makes one lap of the 14 s path and then goes on to its still point and stays (T10, QA7): the travel runs from
 * 2 % to 98 %, so the lap count is 1 + (still − 2) / 96, and every word comes to rest about 16 s in, as the word cycle ends its round.
 */
const TRAVELLERS: Array<{ word: string; delay: number; still: number; stillLevel: Level }> = [
  { word: 'mitigate', delay: 0, still: 15, stillLevel: 0 },
  { word: 'allocate', delay: -3.5, still: 40, stillLevel: 2 },
  { word: 'viable', delay: -7, still: 62, stillLevel: 3 },
  { word: 'coherent', delay: -10.5, still: 85, stillLevel: 4 },
];
const laps = (still: number) => 1 + (still - 2) / 96;

const LEVEL_ANIMATION: Record<Exclude<Level, 0>, string> = {
  1: 'animate-wm-showcase-level-1', 2: 'animate-wm-showcase-level-2', 3: 'animate-wm-showcase-level-3',
  4: 'animate-wm-showcase-level-4', 5: 'animate-wm-showcase-level-5',
};

type DemoWord = {
  word: 'mitigate' | 'allocate' | 'viable' | 'deteriorate' | 'coherent';
  pos: string; gloss: string; example: string; question: [string, string]; level: Exclude<Level, 0>;
};

// Demo data, not copy: the same in every locale except the meaning (App.auth.showcase.<word>).
const WORDS: DemoWord[] = [
  { word: 'mitigate', pos: 'verb · /ˈmɪt.ɪ.ɡeɪt/', gloss: 'to make something bad less serious', example: 'Planting trees can help mitigate urban heat.', question: ['The new policy should ', ' the risk.'], level: 1 },
  { word: 'allocate', pos: 'verb · /ˈæl.ə.keɪt/', gloss: 'to give a share of something for a purpose', example: 'The council will allocate more money to buses.', question: ['We need to ', ' more time to testing.'], level: 2 },
  { word: 'viable', pos: 'adjective · /ˈvaɪ.ə.bəl/', gloss: 'able to work successfully', example: 'Solar power is now a viable option.', question: ['Is the plan financially ', '?'], level: 3 },
  { word: 'deteriorate', pos: 'verb · /dɪˈtɪə.ri.ə.reɪt/', gloss: 'to become worse over time', example: 'Air quality tends to deteriorate in the dry season.', question: ['His health began to ', ' last winter.'], level: 1 },
  { word: 'coherent', pos: 'adjective · /kəʊˈhɪə.rənt/', gloss: 'logical and well organised', example: 'She gave a clear and coherent answer.', question: ['Write a ', ' argument in your essay.'], level: 4 },
];

const LENGTHS = WORDS.map((w) => w.word.length);

export function AuthShowcase() {
  const t = useTranslations('App.auth.showcase');
  const levelName = useLevelName();
  const levelInterval = useLevelInterval();
  const motion = !useReducedMotion();
  // Starts on mitigate's final frame, the frame the server renders: starting on the empty blank made the panel jump back from the
  // green answer to an empty box as soon as the page loaded (owner 13/11/2026).
  // One round, then it rests on coherent's final frame (T10, QA7: nothing beside the form moves for ever).
  const step = useWordCycle({ lengths: LENGTHS, motion, start: 'final', rounds: 1 });
  const word = WORDS[step.k % WORDS.length];
  const panel = useRef<HTMLDivElement>(null);
  const scale = useSceneScale(panel);

  return (
    <div ref={panel} aria-hidden className="auth-showcase-ground relative isolate h-full overflow-hidden rounded-wm-dialog">
      <div
        className="absolute left-1/2 top-1/2 h-217 w-160"
        // raw-ok: the scene keeps its 640 x 868 drawing and scales with the panel (owner 13/11/2026), so the transform is computed
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        <svg viewBox="0 0 640 868" className="absolute inset-0 size-full overflow-visible">
          <path d={PATH} fill="none" strokeWidth="2" strokeDasharray="3 7" className="stroke-wm-showcase-path" />
          {NODES.map(([x, y, level]) => (
            <foreignObject key={level} x={LABEL_LEFT.has(level) ? x - 150 + 11 : x - 11} y={y - 11} width="150" height="22">
              <div className={cn('flex items-center gap-1.5', LABEL_LEFT.has(level) && 'flex-row-reverse')}>
                <span className="grid size-5.5 shrink-0 place-items-center">
                  <span className={cn('col-start-1 row-start-1 size-5.5 rounded-wm-pill opacity-22', LEVEL_FILL[level])} />
                  <span className={cn('col-start-1 row-start-1 size-3.5 rounded-wm-pill', LEVEL_FILL[level])} />
                </span>
                <span className="whitespace-nowrap rounded-wm-key bg-wm-showcase-node-label px-1.5 font-wm-sans text-wm-meta text-wm-muted">
                  {level === 0 ? levelName(0) : `${levelName(level)} · ${t('days', { days: LEVEL_INTERVAL_DAYS[level] })}`}
                </span>
              </div>
            </foreignObject>
          ))}
          {TRAVELLERS.map((traveller) => (
            <g
              key={traveller.word}
              className={cn(motion && 'animate-wm-showcase-travel')}
              // raw-ok: the memory path is SVG geometry, and each word has its own delay (or its own still point with reduced motion)
              style={{ offsetPath: `path('${PATH}')`, offsetRotate: '0deg', offsetDistance: motion ? undefined : `${traveller.still}%`, '--wm-travel-delay': `${traveller.delay}s`, '--wm-travel-laps': laps(traveller.still) } as CSSProperties}
            >
              <foreignObject x="-70" y="-14" width="140" height="28">
                <div className="flex h-full items-center justify-center">
                  <span className="flex items-center gap-1.5 whitespace-nowrap rounded-wm-control border border-wm-line bg-wm-surface px-2.5 py-0.5 font-wm-display text-wm-meta font-bold text-wm-ink opacity-90 shadow-wm-row">
                    <LevelSquare motion={motion} still={traveller.stillLevel} />
                    {traveller.word}
                  </span>
                </div>
              </foreignObject>
            </g>
          ))}
        </svg>

        <GhostChip className="left-85 top-38 rotate-4" word="deadline" />
        <GhostChip className="left-115 top-70" word="negotiate" />
        <GhostChip className="left-24 top-4" word="commute" />

        <Card
          // raw-ok: the tilt of the word card from the F.17 brief, -2.5deg, which has no Tailwind step
          className="absolute left-9 top-21 z-3 min-h-73 w-67 -rotate-[2.5deg] p-5 shadow-wm-pop md:p-5"
        >
          <div key={step.k} className={cn('flex flex-col gap-2', step.k > 0 && 'animate-wm-showcase-swap')}>
            <p className="font-wm-display text-wm-lemma text-wm-ink">{word.word}</p>
            <p className="font-wm-sans text-wm-small text-wm-muted">{word.pos}</p>
            <p className="font-wm-sans text-wm-base text-wm-ink">{word.gloss}</p>
            <p className="font-wm-sans text-wm-small text-wm-muted">{t(word.word)}</p>
            <p className="rounded-wm-row bg-wm-bg px-3 py-2.5 font-wm-sans text-wm-small text-wm-ink">
              <TargetWord text={word.example} lemma={word.word} />
            </p>
            <p className="flex items-center gap-1.5 font-wm-sans text-wm-meta text-wm-muted">
              <span className={cn('size-2 rounded-wm-key', LEVEL_FILL[word.level])} />
              {`${levelName(word.level)} · ${levelInterval(word.level)}`}
            </p>
          </div>
        </Card>

        <Card className="absolute left-95 top-105 z-3 flex w-60 rotate-3 flex-col gap-2.5 p-4.5 shadow-wm-pop md:p-4.5">
          <p className="font-wm-sans text-wm-label text-wm-muted">{t('today')}</p>
          <p className="flex items-baseline gap-2">
            <span key={step.due} className={cn('inline-block font-wm-display text-wm-page-title tabular-nums text-wm-accent', motion && 'animate-wm-showcase-drop')}>
              {step.due}
            </span>
            <span className="font-wm-sans text-wm-small text-wm-ink">{t('due')}</span>
          </p>
          <span className="flex h-2.5 gap-1">
            {LEVEL_BAR.map(([level, grow]) => (
              <span key={level} className={cn('rounded-wm-key', grow, LEVEL_FILL[level])} />
            ))}
          </span>
          <span className="flex flex-wrap gap-x-3.5 gap-y-1 font-wm-sans text-wm-meta text-wm-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-wm-key bg-wm-level-priority" />
              {t('priority', { count: 2 })}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-wm-key bg-wm-level-due" />
              {t('dueCount', { count: 10 })}
            </span>
          </span>
        </Card>

        <Card
          // raw-ok: the tilt of the practice card from the F.17 brief, -1.5deg, which has no Tailwind step
          className="absolute left-56 top-158 z-2 flex w-88 -rotate-[1.5deg] flex-col gap-2.5 p-4.5 shadow-wm-pop md:p-4.5"
        >
          <span className="self-start rounded-wm-control bg-wm-accent-soft px-2 py-0.5 font-wm-sans text-wm-label text-wm-accent">{t('practice')}</span>
          <p key={step.k} className={cn('min-h-15 font-wm-display text-wm-word text-wm-ink', step.k > 0 && 'animate-wm-showcase-swap')}>
            {word.question[0]}
            <TypingBlank word={word.word} typed={step.typed} done={step.phase === 'done'} motion={motion} />
            {word.question[1]}
          </p>
          <p className="flex min-h-6 items-center gap-2 font-wm-sans text-wm-caption text-wm-muted">
            {step.phase === 'enter' && (
              <kbd className={cn('rounded-wm-key border border-wm-line bg-wm-surface px-1.5 font-wm-sans text-wm-meta text-wm-muted', motion && 'animate-wm-showcase-key')}>
                Enter
              </kbd>
            )}
            {step.phase === 'done' && (
              <span className="inline-flex items-center gap-1 text-wm-small-strong text-wm-pass">
                <Check className="size-4" strokeWidth={2.5} />
                {t('result', { level: levelName(Math.min(5, word.level + 1) as Level) })}
              </span>
            )}
          </p>
        </Card>

      </div>
    </div>
  );
}

/** The due card's level bar (mockup: 2, 4, 3, 2, 1 words at Mới … Bậc 4). */
const LEVEL_BAR: Array<[Level, string]> = [[0, 'grow-2'], [1, 'grow-4'], [2, 'grow-3'], [3, 'grow-2'], [4, 'grow']];

/** The travelling word's square: Mới underneath, each level fading in at its stretch of the path. */
function LevelSquare({ motion, still }: { motion: boolean; still: Level }) {
  return (
    <span className="relative size-2 shrink-0">
      <span className={cn('absolute inset-0 rounded-wm-key', LEVEL_FILL[0])} />
      {([1, 2, 3, 4, 5] as const).map((level) => (
        <span
          key={level}
          className={cn('absolute inset-0 rounded-wm-key', LEVEL_FILL[level], motion ? cn('opacity-0', LEVEL_ANIMATION[level]) : level === still ? 'opacity-100' : 'opacity-0')}
        />
      ))}
    </span>
  );
}

/** A faint background word under the cards (chỗ 20). */
function GhostChip({ className, word }: { className: string; word: string }) {
  return (
    <span className={cn('absolute z-0 rounded-wm-control bg-wm-showcase-ghost-chip px-2.5 py-1 font-wm-display text-wm-meta font-semibold text-wm-showcase-ghost-ink', className)}>
      {word}
    </span>
  );
}

/**
 * The scene's scale: it fills the panel's width or height, whichever runs out first (owner 13/11/2026: on a wide or zoomed-out screen the
 * fixed 640 px scene sat small against the right edge), up to 1.3 times its drawn size.
 */
function useSceneScale(ref: RefObject<HTMLDivElement | null>) {
  const [value, setValue] = useState(1);
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const fit = () => {
      const { width, height } = box.getBoundingClientRect();
      if (width > 0 && height > 0) setValue(Math.min(width / 640, height / 868, 1.3));
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [ref]);
  return value;
}
