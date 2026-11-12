'use client';

import { useTranslations } from 'next-intl';
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { arrive, dissolve, prefersReducedMotion, shake } from '@/lib/stack-motion';
import { useDesktop } from '@/lib/use-desktop';
import { PronunciationLine } from '@/ui/PronunciationLine';
import { SpeakSentence } from '@/ui/SpeakButton';
import { toLevel, useLevelInterval, useLevelName } from '@/ui/levels';
import type { Card } from '../groups/groups-api';
import { TargetWord } from '@/ui/TargetWord';
import { useForms } from './use-forms';
import { useCardDrag, type Rating } from './useCardDrag';

export type CardStackHandle = {
  /** A key or button rating: the card dissolves towards its pile, or shakes when it is not turned over yet. */
  rate: (rating: Rating) => void;
};

type Props = {
  cards: Card[];
  /** Index of the card on top. */
  current: number;
  flipped: boolean;
  onFlip: () => void;
  onRate: (rating: Rating) => void;
  /** A rating tried before the card was turned over (key, button or drag). */
  onNudge?: () => void;
  /** The stamps' stage lines are off (e.g. Học of new words, where Đã biết keeps the word new). */
  stampDetails?: boolean;
  /** The top card's name for screen readers ("Thẻ 2 trên 20"). */
  label?: string;
};

type Leaving = { card: Card; direction: 1 | -1; how: 'drag' | 'key'; speed: number; from: string };

/** Up to three cards behind the top one (motion doc §2: depth 1–3; the third is fully faded and only keeps the next arrival smooth). */
const BEHIND = 3;

/**
 * The Học stack (Figma 80:3228, prototype chong-the-mo.html; owner chose "Chồng thẻ tan mờ", vòng 6). Only the top card renders its
 * content (word page, speakers); the cards behind draw a light front with no request (M5 code R surprise 14). A rated card leaves at
 * once and keeps flying while the next one comes forward, so a fast second answer acts on the next card (QM5-2 a).
 */
export const CardStack = forwardRef<CardStackHandle, Props>(function CardStack(
  { cards, current, flipped, onFlip, onRate, onNudge, stampDetails = true, label },
  ref,
) {
  const t = useTranslations('App.review');
  const levelName = useLevelName();
  const topRef = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState<Leaving[]>([]);
  const [follow, setFollow] = useState(0);
  const top = cards[current] as Card | undefined;
  /** The card already rated (Review Focus 5): a second press before React renders again still sees it on top, turned over. */
  const rated = useRef<string | null>(null);

  function rateNow(rating: Rating, how: 'drag' | 'key', speed = 0) {
    if (!top) return;
    if (!flipped) {
      if (topRef.current) void shake(topRef.current);
      onNudge?.();
      return;
    }
    if (rated.current === top.item_id) return;
    rated.current = top.item_id;
    const from = topRef.current?.style.transform ?? '';
    setLeaving((list) => [...list, { card: top, direction: rating === 'known' ? 1 : -1, how, speed, from }]);
    setFollow(0);
    onRate(rating);
  }

  useImperativeHandle(ref, () => ({ rate: (rating: Rating) => rateNow(rating, 'key') }));

  const { dx, stamp } = useCardDrag(topRef, {
    enabled: top !== undefined,
    id: top?.item_id,
    flipped,
    onRate: (rating, speed) => rateNow(rating, 'drag', speed),
    onTap: onFlip,
    onNudge,
    onProgress: setFollow,
  });

  // The new top card comes forward from behind (blur to sharp); the first card of the session just rises in.
  const shownTop = useRef<string | null>(null);
  useLayoutEffect(() => {
    const id = top?.item_id ?? null;
    // A new top card (or the same card back after a lost save) can be rated again.
    rated.current = null;
    if (id && shownTop.current && shownTop.current !== id && topRef.current) {
      topRef.current.style.transform = '';
      void arrive(topRef.current);
    }
    shownTop.current = id;
  }, [top?.item_id]);

  const behind = cards.slice(current + 1, current + 1 + BEHIND);
  const next = toLevel(top ? top.level + 1 : 1);
  const strength = Math.min(1, Math.abs(dx) / 110);

  return (
    <div className="cstack">
      {[...behind].reverse().map((card) => {
        const depth = behind.indexOf(card) + 1;
        // The card just behind follows the hand: it rises and sharpens as the drag reaches the threshold (motion doc §2).
        // Reduced motion: no scale or blur behind (motion doc §8), so the card behind stays put.
        const pull = depth === 1 && follow > 0 && !prefersReducedMotion() ? follow : 0;
        return (
          <div
            key={card.item_id}
            aria-hidden
            inert
            data-depth={depth}
            className="cstack-card"
            // raw-ok: the follow progress is data (0–1), not a design value
            style={pull ? { transform: `translateY(${16 - 12 * pull}px) scale(${0.95 + 0.04 * pull})`, filter: `blur(${(1 - pull) * 5}px)`, opacity: 0.85 + 0.15 * pull } : undefined}
          >
            <LightFront card={card} />
          </div>
        );
      })}
      {top && (
        <div key={top.item_id} ref={topRef} role="group" aria-label={label} data-depth={0} data-flipped={flipped} className="cstack-card cstack-top">
          <FullCard card={top} flipped={flipped} onFlip={onFlip} />
          {flipped && (
            <>
              <Stamp side="review" shown={stamp === 'review'} strength={stamp === 'review' ? strength : 0} label={t('stillLearning')} detail={stampDetails ? t('stampReview') : null} />
              <Stamp side="known" shown={stamp === 'known'} strength={stamp === 'known' ? strength : 0} label={t('know')} detail={stampDetails ? t('stampKnow', { level: levelName(next) }) : null} />
            </>
          )}
        </div>
      )}
      {leaving.map((item) => (
        <LeavingCard key={`leaving-${item.card.item_id}`} item={item} onDone={() => setLeaving((list) => list.filter((l) => l !== item))} />
      ))}
    </div>
  );
});

/** A rated card keeps flying away above the stack, out of reach, then is removed. */
function LeavingCard({ item, onDone }: { item: Leaving; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  useLayoutEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = item.from;
    void dissolve(el, item.direction, item.how, item.speed).then(() => done.current());
  }, [item]);
  return (
    <div ref={ref} aria-hidden inert data-leaving className="cstack-card">
      <FullCard card={item.card} flipped onFlip={() => {}} still />
    </div>
  );
}

function Stamp({ side, shown, strength, label, detail }: { side: 'review' | 'known'; shown: boolean; strength: number; label: string; detail: string | null }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute top-6 z-10 flex flex-col rounded-wm-control border-2 bg-wm-surface px-3 py-1.5 font-wm-display text-wm-word',
        side === 'review' ? 'right-6 rotate-7 border-wm-fail text-wm-fail' : 'left-6 -rotate-7 border-wm-pass text-wm-pass',
        !shown && 'invisible',
      )}
      // raw-ok: the stamp fades in with the drag distance (data, 0–1)
      style={{ opacity: strength }}
    >
      {label}
      {detail && <small className="font-wm-sans text-wm-caption">{detail}</small>}
    </div>
  );
}

const FACE = 'cstack-face flex min-h-80 flex-col overflow-hidden rounded-wm-dialog border border-wm-line bg-wm-surface shadow-wm-card md:min-h-96';

/** The front of a card behind the top one: word and part of speech, no request, no speaker. */
function LightFront({ card }: { card: Card }) {
  return (
    <div className={cn(FACE, 'items-center justify-center gap-1 p-6 text-center')}>
      <span className="break-all font-wm-display text-wm-lemma text-wm-ink">{card.content.lemma}</span>
      <span className="font-wm-sans text-wm-small text-wm-muted">{card.content.pos}</span>
    </div>
  );
}

/**
 * The top card, both faces (K/20, K/21, M/30, M/31): word, part of speech and pronunciation in front; meaning, forms, example and saved
 * sentences behind. It turns in 3D (300 ms, perspective 1400 px); with reduced motion the faces swap by opacity. The face turned away
 * stays mounted but inert.
 */
function FullCard({ card, flipped, onFlip, still = false }: { card: Card; flipped: boolean; onFlip: () => void; still?: boolean }) {
  const t = useTranslations('App.review');
  const desktop = useDesktop();
  const levelName = useLevelName();
  const levelInterval = useLevelInterval();
  const level = toLevel(card.level);
  const { content } = card;
  const forms = useForms(still ? undefined : content.lemma);
  const pron = content.pronunciation ? { scope: content.scope, pronunciation: content.pronunciation } : null;
  return (
    <div className="cstack-flip" data-flipped={flipped}>
      <div data-face="front" aria-hidden={flipped || undefined} inert={flipped} className={FACE}>
        <button
          type="button"
          onClick={onFlip}
          className="flex flex-1 flex-col p-6 text-left outline-none focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-wm-accent"
        >
          <Badges card={card} />
          <span className="flex flex-1 flex-col items-center justify-center gap-1 py-8 text-center">
            <span className="break-all font-wm-display text-wm-section text-wm-ink">{content.lemma}</span>
            <span className="font-wm-sans text-wm-base text-wm-muted">{content.pos}</span>
          </span>
        </button>
        {/* Outside the turn button (review plan I3): a press reads the word and never turns the card. */}
        <PronunciationLine text={content.lemma} line={pron} align="center" className="px-6" />
        <span className="self-center px-6 pb-6 pt-3 font-wm-sans text-wm-caption text-wm-muted">
          {desktop ? t('hintWeb') : t('hintPhone')}
        </span>
      </div>
      <div data-face="back" aria-hidden={!flipped || undefined} inert={!flipped} className={cn(FACE, 'cstack-back')}>
        <div className="flex min-w-0 flex-col gap-2 p-6">
          <Badges card={card} />
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="break-all font-wm-display text-wm-card-title text-wm-ink">{content.lemma}</span>
            <span className="font-wm-sans text-wm-small text-wm-muted">{content.pos}</span>
          </p>
          <PronunciationLine text={content.lemma} line={pron} />
          <p className="break-words font-wm-display text-wm-card-heading-mobile text-wm-ink">{content.meaning.text}</p>
          {forms.length > 0 && (
            <ul aria-label={t('forms')} className="flex flex-wrap gap-1.5">
              {forms.map((form) => (
                <li key={form} className="rounded-wm-key border border-wm-line px-2 py-0.5 font-wm-sans text-wm-caption text-wm-ink">
                  {form}
                </li>
              ))}
            </ul>
          )}
        </div>
        {content.examples[0] && (
          <Block title={t('example')}>
            <p className="flex items-start gap-1 font-wm-sans text-wm-small text-wm-ink">
              <span className="min-w-0 flex-1 break-words"><TargetWord text={content.examples[0]} lemma={content.lemma} forms={forms} /></span>
              <span className="shrink-0">
                <SpeakSentence text={content.examples[0]} />
              </span>
            </p>
          </Block>
        )}
        {content.sentences.length > 0 && (
          <Block title={t('seen')} soft>
            {content.sentences.map((sentence) => (
              <p key={sentence} className="flex items-start gap-1 font-wm-sans text-wm-small text-wm-ink">
                <span className="min-w-0 flex-1 break-words"><TargetWord text={sentence} lemma={content.lemma} forms={forms} /></span>
                <span className="shrink-0">
                  <SpeakSentence private text={sentence} />
                </span>
              </p>
            ))}
          </Block>
        )}
        {/* Mockup L1020, L1024: the level line at the foot of the back face. */}
        <p className="mt-auto px-6 pb-5 pt-3 font-wm-sans text-wm-caption text-wm-muted">
          {level === 0 ? t('newWord') : `${levelName(level)} · ${levelInterval(level)}`}
        </p>
      </div>
    </div>
  );
}

function Block({ title, soft = false, children }: { title: string; soft?: boolean; children: ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1 border-t border-wm-line px-6 py-4', soft && 'bg-wm-accent-soft')}>
      <p className="font-wm-sans text-wm-label text-wm-muted">{title}</p>
      {children}
    </div>
  );
}

function Badges({ card }: { card: Card }) {
  const t = useTranslations('App.review');
  if (card.section === 'backlog') return <span className="w-fit rounded-wm-key bg-wm-fail-soft px-2 py-0.5 font-wm-sans text-wm-label text-wm-fail">{t('backlog')}</span>;
  if (card.priority) return <span className="w-fit rounded-wm-key bg-wm-accent-soft px-2 py-0.5 font-wm-sans text-wm-label text-wm-accent">{t('priority')}</span>;
  return null;
}
