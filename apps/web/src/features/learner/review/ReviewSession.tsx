'use client';

import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ApiError, NetworkError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { hardReplace } from '@/app-shell/navigate';
import { EmptyState, FullScreenSpinner, NotFoundState } from '@/app-ui/States';
import { cn } from '@/lib/cn';
import { BUTTON_BASE, BUTTON_VARIANT } from '@/ui/Button';
import { Kbd } from '@/ui/Kbd';
import { KeyLegend } from '@/ui/KeyLegend';
import { ProgressBar } from '@/ui/ProgressBar';
import { isId, useGroup, useGroups } from '../groups/groups-api';
import { CardStack, type CardStackHandle } from './CardStack';
import { Pile } from './Pile';
import { ReviewSummary } from './ReviewSummary';
import { useReviewQueue, type Answer } from './use-review-queue';

const NUDGE_MS = 2200;

/**
 * K/20–K/22 `/app/review?group=&mode=new|all|due` (Học, đợt C), rebuilt as the dissolving card stack (Figma 80:3228 / 80:3321 /
 * 80:3429, prototype chong-the-mo.html): the two piles beside the stack, the buttons under it. Keys: Space turns the card both ways,
 * 1 or ← Cần ôn lại, 2 or → Đã biết, Esc ends; Enter on the summary goes home.
 */
export function ReviewSession() {
  const t = useTranslations('App');
  const locale = useLocale();
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
  else if (session.queue.isPending || session.finishing) body = <FullScreenSpinner />;
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
      <div className="flex w-full flex-1 flex-col gap-6">
        {/* Says which card came up after an answer (audit 26/10/2026 #8); empty until the first answer. */}
        <p data-live="result" aria-live="polite" aria-atomic="true" className="sr-only">
          {session.index > 0 && session.card ? t('review.card', { n: session.index + 1, total }) : ''}
        </p>
        <div className="grid grid-cols-2 items-start gap-x-4 gap-y-6 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)_minmax(0,1fr)] md:gap-x-8">
          <Pile tone="review" label={t('review.stillLearning')} words={piles.review} className="md:col-start-1 md:row-start-1 md:pt-10" />
          <Pile tone="known" label={t('review.know')} words={piles.known} className="md:col-start-3 md:row-start-1 md:pt-10" />
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
          <div className="grid w-full max-w-xl grid-cols-2 gap-3 md:flex md:w-auto md:justify-center">
            <AnswerButton tone="review" disabled={!session.flipped} onPress={() => rate('review')} label={t('review.stillLearning')} keyCap="1" icon={<ArrowLeft aria-hidden className="size-4" />} />
            <button
              ref={flipButton}
              type="button"
              onClick={session.flip}
              autoFocus
              className={cn(BUTTON_BASE, BUTTON_VARIANT.primary, 'col-span-2 row-start-1 md:col-auto md:row-auto md:min-w-44')}
            >
              <RotateCcw aria-hidden className="size-4" />
              {session.flipped ? t('review.flipBack') : t('review.flip')}
              <span className="hidden md:inline-flex">
                <Kbd>Space</Kbd>
              </span>
            </button>
            <AnswerButton tone="known" disabled={!session.flipped} onPress={() => rate('known')} label={t('review.know')} keyCap="2" icon={<ArrowRight aria-hidden className="size-4" />} />
          </div>
          <KeyLegend
            aria-label={t('review.legend')}
            className="pt-2"
            items={[
              { keys: ['Space'], label: t('review.flip') },
              { keys: ['1', '←'], label: t('review.stillLearning') },
              { keys: ['2', '→'], label: t('review.know') },
              { keys: ['Esc'], label: t('review.stop') },
            ]}
          />
        </div>
      </div>
    );

  const showProgress = !notFound && !session.done && total > 0;
  const closeClass =
    'flex size-11 shrink-0 items-center justify-center rounded-wm-md border border-wm-line bg-wm-surface text-wm-ink outline-none ' +
    'hover:brightness-112 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent md:size-9';
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 pt-4 md:px-6 md:pt-8">
        {session.done || notFound ? (
          <Link href={`/${locale}/app`} aria-label={t('common.close')} className={closeClass}>
            <X aria-hidden className="size-4.5" />
          </Link>
        ) : (
          <button type="button" aria-label={t('review.close')} onClick={session.end} className={closeClass}>
            <X aria-hidden className="size-4.5" />
          </button>
        )}
        <span className="hidden max-w-64 truncate font-wm-sans text-wm-small-strong text-wm-ink md:block">{group.data?.name}</span>
        {showProgress && (
          <>
            <ProgressBar value={session.index} max={total} label={t('review.left', { count: left })} className="min-w-12 flex-1" />
            <span className="shrink-0 font-wm-mono text-wm-mono text-wm-muted">{t('review.left', { count: left })}</span>
          </>
        )}
      </header>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-stretch px-4 py-6 md:px-6">{body}</div>
    </div>
  );
}

/**
 * Cần ôn lại / Đã biết under the stack. Before the card is turned they stay pressable but `aria-disabled`: a press shakes the card and
 * says why (prototype chong-the-mo.html:271), instead of doing nothing.
 */
function AnswerButton({ tone, disabled, onPress, label, keyCap, icon }: {
  tone: 'review' | 'known'; disabled: boolean; onPress: () => void; label: string; keyCap: string; icon: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-disabled={disabled || undefined}
      onClick={onPress}
      className={cn(
        BUTTON_BASE,
        tone === 'known' ? BUTTON_VARIANT.pass : `${BUTTON_VARIANT.secondary} text-wm-fail`,
        'md:min-w-40',
        disabled && 'opacity-55 shadow-none',
      )}
    >
      {tone === 'review' && icon}
      {tone === 'known' && <Check aria-hidden className="size-4" />}
      {label}
      <span className="hidden md:inline-flex">
        <Kbd>{keyCap}</Kbd>
      </span>
      {tone === 'known' && icon}
    </button>
  );
}
