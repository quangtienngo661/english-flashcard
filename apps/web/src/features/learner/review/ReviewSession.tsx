'use client';

import { X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
import { StudyPattern } from '@/app-chrome/AppShell';
import { ApiError, NetworkError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { hardReplace } from '@/app-shell/navigate';
import { Button } from '@/app-ui/Button';
import { EmptyState, FullScreenSpinner, NotFoundState } from '@/app-ui/States';
import { isId, useGroup } from '../groups/groups-api';
import { Flashcard } from './Flashcard';
import { ReviewSummary } from './ReviewSummary';
import { useReviewQueue } from './use-review-queue';

const KBD = 'hidden rounded-sm border px-1.5 text-caption md:inline';

/** K/20–K/22 `/app/review?group=&mode=due|all`: a full-screen review session over one deck. */
export function ReviewSession() {
  const t = useTranslations('App');
  const locale = useLocale();
  const params = useSearchParams();
  const raw = params.get('group');
  const id = isId(raw) ? raw.toLowerCase() : null;
  const mode = params.get('mode') === 'all' ? 'all' : 'due';
  const group = useGroup(id);
  const session = useReviewQueue(id, mode);
  const errorText = useErrorMessage();
  const notFound =
    id === null || [group.error, session.queue.error].some((e) => e instanceof ApiError && e.problem.status === 404);

  // Keys of the mockup: Space flips, 1 Still learning, 2 Know, Esc ends; Enter on the summary goes home.
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
      if (!session.card) return;
      if (e.key === ' ') {
        e.preventDefault();
        session.flip();
      } else if (e.key === '1') void session.answer('review');
      else if (e.key === '2') void session.answer('known');
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
  let body: ReactNode;
  if (notFound) body = <NotFoundState title={t('group.notFound')} back={{ href: `/${locale}/app/groups`, label: t('group.toList') }} />;
  else if (session.queue.isPending) body = <FullScreenSpinner />;
  else if (session.done) body = <ReviewSummary counts={session.counts} />;
  else if (total === 0)
    body = (
      <EmptyState
        title={t('review.emptyTitle')}
        body={t('review.emptyBody')}
        action={
          <Link href={`/${locale}/app/review?group=${id}&mode=all`} className="font-semibold text-primary underline underline-offset-2">
            {t('review.studyAll')}
          </Link>
        }
      />
    );
  else if (session.card)
    body = (
      <div className="flex w-full flex-1 flex-col justify-between gap-6 md:flex-none md:justify-center">
        {/* Says which card came up after an answer (audit 26/10/2026 #8); empty until the first answer. */}
        <p data-live="result" aria-live="polite" aria-atomic="true" className="sr-only">
          {session.index > 0 ? t('review.card', { n: session.index + 1, total }) : ''}
        </p>
        <Flashcard key={session.card.item_id} card={session.card} position={session.index + 1} total={total} flipped={session.flipped} onFlip={session.flip} />
        <div className="flex flex-col gap-3">
          {session.error !== null && (
            <p role="alert" className="text-ui text-danger">
              {session.error instanceof NetworkError ? t('review.failed') : errorText(session.error)}
            </p>
          )}
          {!session.flipped ? (
            <Button variant="sticker" size="lg" className="justify-between" autoFocus onPress={session.flip}>
              {t('review.flip')}
              <kbd className={`${KBD} border-on-accent`}>Space</kbd>
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="quiet" size="lg" className="justify-between" isPending={session.busy} onPress={() => void session.answer('review')}>
                {t('review.stillLearning')}
                <kbd className={`${KBD} border-border-strong`}>1</kbd>
              </Button>
              <Button variant="sticker" size="lg" className="justify-between" isPending={session.busy} onPress={() => void session.answer('known')}>
                {t('review.know')}
                <kbd className={`${KBD} border-on-accent`}>2</kbd>
              </Button>
            </div>
          )}
        </div>
      </div>
    );

  const showProgress = !notFound && !session.done && total > 0;
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-canvas">
      <StudyPattern />
      <header className="relative flex items-center justify-between gap-3 px-4 pt-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {session.done || notFound ? (
            <Link href={`/${locale}/app`} aria-label={t('common.close')} className="rounded-sm p-1 text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <X aria-hidden className="size-5" />
            </Link>
          ) : (
            <button type="button" aria-label={t('review.close')} onClick={session.end} className="rounded-sm p-1 text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <X aria-hidden className="size-5" />
            </button>
          )}
          <kbd className={`${KBD} border-border-strong text-ink`}>Esc</kbd>
          <span className="truncate text-ui text-ink">{group.data?.name}</span>
        </div>
        {showProgress && (
          <>
            <span className="hidden shrink-0 text-ui font-semibold text-ink md:inline">{t('review.left', { count: left })}</span>
            <span className="shrink-0 text-ui font-semibold text-ink md:hidden">{t('review.progress', { done: session.index + 1, total })}</span>
          </>
        )}
      </header>
      {showProgress && (
        <div aria-hidden className="relative mx-4 mt-3 h-2 overflow-hidden rounded-full bg-neutral-soft md:hidden">
          <div
            className="h-full rounded-full bg-primary"
            // raw-ok: progress share of the session
            style={{ width: `${Math.round(((session.index + 1) / total) * 100)}%` }}
          />
        </div>
      )}
      <main id="main" className="relative mx-auto flex w-full max-w-xl flex-1 flex-col items-stretch justify-center px-4 py-6">
        {body}
      </main>
    </div>
  );
}
