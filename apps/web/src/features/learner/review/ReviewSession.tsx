'use client';

import { CalendarBarButton } from '@/app-chrome/CalendarBarButton';
import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ApiError, NetworkError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { hardReplace } from '@/app-shell/navigate';
import { useRouteLocale } from '@/app-shell/route-locale';
import { NotFoundState } from '@/ui/NotFoundState';
import { EmptyState } from '@/ui/States';
import { SkeletonBlocks } from '@/ui/Skeleton';
import { cn } from '@/lib/cn';
import { useDesktop } from '@/lib/use-desktop';
import { KeyLegend } from '@/ui/KeyLegend';
import { ProgressBar } from '@/ui/ProgressBar';
import { StreakToast } from '@/ui/StreakToast';
import { isId, useGroup, useGroups } from '../groups/groups-api';
import { CardStack, type CardStackHandle } from './CardStack';
import { Pile } from './Pile';
import { ReviewSummary } from './ReviewSummary';
import { useReviewQueue, type Answer } from './use-review-queue';

const NUDGE_MS = 2200;

/**
 * K/20–K/22 `/app/review?group=&mode=new|all|due` (Học, đợt C), the dissolving card stack laid out as mockup L220-304 (P.17): on
 * desktop the two piles beside the stack, on a phone under it; the buttons under both. Keys: Space turns the card both ways, 1 or ←
 * Still learning, 2 or → Know, Esc ends; Enter on the summary goes home.
 */
export function ReviewSession() {
  const t = useTranslations('App');
  const locale = useRouteLocale();
  const params = useSearchParams();
  const raw = params.get('group');
  const id = isId(raw) ? raw.toLowerCase() : null;
  const modeParam = params.get('mode');
  // Đợt C DC25: Học opens on the new words (`new`) or on every word (`all`); `due` stays for older links.
  const mode = modeParam === 'all' || modeParam === 'new' ? modeParam : 'due';
  const group = useGroup(id);
  const summary = useGroups().data?.items.find((g) => g.id === id);
  const session = useReviewQueue(id, mode);
  const errorText = useErrorMessage();
  const stack = useRef<CardStackHandle>(null);
  const flipButton = useRef<HTMLButtonElement>(null);
  const [nudged, setNudged] = useState(false);
  const desktop = useDesktop();
  const flipLabel = session.flipped ? t('review.flipBack') : t('review.flip');
  const notFound =
    id === null || [group.error, session.queue.error].some((e) => e instanceof ApiError && e.problem.status === 404);

  // After an answer the next card's turn button takes focus (audit 26/10/2026 #8), so Space and Enter go on from there.
  useEffect(() => {
    if (session.index > 0) flipButton.current?.focus();
  }, [session.index]);

  useEffect(() => {
    if (!nudged) return;
    const timer = setTimeout(() => setNudged(false), NUDGE_MS);
    return () => clearTimeout(timer);
  }, [nudged]);

  /** A key or button answer: the stack plays it (shake before the turn, dissolve after) and reports back through `onRate`. */
  function rate(value: Answer) {
    if (session.card) stack.current?.rate(value);
  }

  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keys.current = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if ((e.key === ' ' || e.key === 'Enter') && target?.closest('button, a, input, textarea')) return;
      if (session.done) {
        if (e.key === 'Enter') hardReplace(`/${locale}/app`);
        return;
      }
      if (!session.card || session.finishing) return;
      if (e.repeat && e.key !== ' ') return;
      if (e.key === ' ') {
        e.preventDefault();
        session.flip();
      } else if (e.key === '1' || e.key === 'ArrowLeft') rate('review');
      else if (e.key === '2' || e.key === 'ArrowRight') rate('known');
      else if (e.key === 'Escape') session.end();
    };
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const total = session.cards.length;
  const left = total - session.index;
  const piles = {
    review: session.results.filter((r) => r.answer === 'review').map((r) => r.card.content.lemma),
    known: session.results.filter((r) => r.answer === 'known').map((r) => r.card.content.lemma),
  };
  let body: ReactNode;
  if (notFound) body = <NotFoundState title={t('group.notFound')} back={{ href: `/${locale}/app/groups`, label: t('group.toList') }} />;
  else if (session.queue.isPending || session.finishing) body = <SkeletonBlocks />;
  else if (session.done) body = <ReviewSummary counts={session.counts} piles={piles} group={summary} />;
  else if (total === 0)
    body = (
      <EmptyState
        title={t('review.emptyTitle')}
        body={t('review.emptyBody')}
        action={
          <Link href={`/${locale}/app/review?group=${id}&mode=all`} className="font-semibold text-wm-accent underline underline-offset-2">
            {t('review.studyAll')}
          </Link>
        }
      />
    );
  else
    body = (
      // Owner 13/11/2026: on desktop the card, the piles and the buttons sit in the middle of the screen's height.
      <div className="flex w-full flex-1 flex-col gap-6 md:justify-center md:pb-14">
        {/* Says which card came up after an answer (audit 26/10/2026 #8); empty until the first answer. */}
        <p data-live="result" aria-live="polite" aria-atomic="true" className="sr-only">
          {session.index > 0 && session.card ? t('review.card', { n: session.index + 1, total }) : ''}
        </p>
        <div
          // raw-ok: the pile, stack, pile grid of mockup L221 (the card column capped at 22.5rem, 360 px as in the owner's artifact 13/11/2026); no token for a three-track grid
          className="grid grid-cols-2 items-start gap-x-3 gap-y-5 md:grid-cols-[minmax(0,1fr)_minmax(0,22.5rem)_minmax(0,1fr)] md:items-center md:gap-x-7"
        >
          {/* The card first in reading order; on desktop the piles move to its sides (mockup L297: on a phone they sit under it). */}
          <div className="col-span-2 md:col-span-1 md:col-start-2 md:row-start-1">
            <CardStack
              ref={stack}
              cards={session.cards}
              current={session.index}
              flipped={session.flipped}
              onFlip={session.flip}
              onRate={(value) => void session.answer(value)}
              onNudge={() => setNudged(true)}
              stampDetails={mode !== 'new'}
              label={session.card ? t('review.card', { n: session.index + 1, total }) : undefined}
            />
          </div>
          <Pile tone="review" label={t('review.stillLearning')} words={piles.review} chips={desktop} className="md:col-start-1 md:row-start-1" />
          <Pile tone="known" label={t('review.know')} words={piles.known} chips={desktop} className="md:col-start-3 md:row-start-1" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <p role="status" className={cn('min-h-5 font-wm-sans text-wm-small-strong text-wm-accent transition-opacity duration-200', nudged ? 'opacity-100' : 'opacity-0')}>
            {nudged ? t('review.nudge') : ''}
          </p>
          {session.error !== null && (
            <p role="alert" className="font-wm-sans text-wm-small text-wm-fail">
              {session.error instanceof NetworkError ? t('review.failed') : errorText(session.error)}
            </p>
          )}
          {/* Mockup L270-304: 40 px buttons, 14 px bold; on a phone the side ones are 52 px icon squares and Flip card keeps its width. */}
          <div className="flex w-full justify-center gap-2 md:gap-3">
            <AnswerButton tone="review" desktop={desktop} disabled={!session.flipped} onPress={() => rate('review')} label={t('review.stillLearning')} />
            <button
              ref={flipButton}
              type="button"
              onClick={session.flip}
              // Named by its words alone: the key cap is in aria-keyshortcuts, not "Flip cardSpace".
              aria-label={flipLabel}
              aria-keyshortcuts="Space"
              autoFocus
              className={cn(ACTION, 'min-w-37 bg-wm-accent px-5 text-wm-on-accent md:px-3.5')}
            >
              <RotateCcw aria-hidden className="size-4" />
              {flipLabel}
            </button>
            <AnswerButton tone="known" desktop={desktop} disabled={!session.flipped} onPress={() => rate('known')} label={t('review.know')} />
          </div>
          {desktop && (
            <KeyLegend
              aria-label={t('review.legend')}
              className="justify-center pt-1"
              items={[
                { keys: ['Space'], label: t('review.flip') },
                { keys: ['1', '←'], label: t('review.stillLearning') },
                { keys: ['2', '→'], label: t('review.know') },
                { keys: ['Esc'], label: t('review.stop') },
              ]}
            />
          )}
        </div>
      </div>
    );

  const showProgress = !notFound && !session.done && total > 0;
  // P.17 (mockup L1187-1189): the X alone, 32 px, at the right end of the bar; the streak toast sits under it.
  const closeClass =
    'flex size-8 shrink-0 items-center justify-center rounded-wm-control border border-wm-line bg-wm-surface text-wm-ink outline-none ' +
    'hover:brightness-112 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent';
  return (
    <div className="flex flex-1 flex-col">
      <header className="relative mx-auto flex w-full max-w-5xl items-center gap-3 px-4 pt-4 md:px-6 md:pt-8">
        <span className="hidden max-w-64 truncate font-wm-sans text-wm-small-strong text-wm-ink md:block">{group.data?.name}</span>
        {showProgress ? (
          <>
            <ProgressBar value={session.index} max={total} label={t('review.left', { count: left })} className="min-w-12 flex-1" />
            <span className="shrink-0 text-wm-meta text-wm-muted">{t('review.left', { count: left })}</span>
          </>
        ) : (
          <span className="flex-1" />
        )}
        <CalendarBarButton />
        {session.done || notFound ? (
          <Link href={`/${locale}/app`} aria-label={t('common.close')} className={closeClass}>
            <X aria-hidden className="size-4" />
          </Link>
        ) : (
          <button type="button" aria-label={t('review.close')} onClick={session.end} className={closeClass}>
            <X aria-hidden className="size-4" />
          </button>
        )}
        {/* Inside the session subtree, so it speaks English (QM9-9); AppProviders' bottom toast stays empty while this one is mounted. */}
        <StreakToast placement="session-corner" />
      </header>
      {/* The stack about 20 px under the bar (mockup L1192). */}
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-stretch px-4 pb-6 pt-5 md:px-6">{body}</div>
    </div>
  );
}

/** Mockup L272: the three Học buttons are 40 px high, 14 px bold, no shadow. */
const ACTION =
  'inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-wm-control font-wm-sans text-wm-small font-bold outline-none ' +
  'transition duration-200 ease-wm-out-strong hover:brightness-112 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent ' +
  'motion-safe:active:scale-97';

/**
 * Still learning / Know under the stack (mockup L273-278): coloured text on the surface (dark: a 6 % wash of the colour), named by
 * `aria-label`; on a phone a 52 px square with the icon only. Before the card is turned they stay pressable but `aria-disabled` at 50 %:
 * a press shakes the card and says why (prototype chong-the-mo.html:271), instead of doing nothing.
 */
function AnswerButton({ tone, desktop, disabled, onPress, label }: {
  tone: 'review' | 'known'; desktop: boolean; disabled: boolean; onPress: () => void; label: string;
}) {
  const Icon = tone === 'review' ? ArrowLeft : Check;
  return (
    <button
      type="button"
      aria-label={label}
      aria-keyshortcuts={tone === 'review' ? '1 ArrowLeft' : '2 ArrowRight'}
      aria-disabled={disabled || undefined}
      onClick={onPress}
      className={cn(
        ACTION,
        'border border-wm-line',
        tone === 'review' ? 'bg-wm-fail-wash text-wm-fail' : 'bg-wm-pass-wash text-wm-pass',
        desktop ? 'px-3.5' : 'w-13',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <Icon aria-hidden className={desktop ? 'size-4' : 'size-5'} />
      {desktop && (
        <>
          {label}
          {tone === 'known' && <ArrowRight aria-hidden className="size-4" />}
        </>
      )}
    </button>
  );
}
