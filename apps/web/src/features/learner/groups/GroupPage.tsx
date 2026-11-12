'use client';

import { MoreHorizontal, Search, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { Button as AriaButton, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import { BackLink } from '@/app-chrome/BackLink';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { createFormat, useFormat } from '@/app-shell/format';
import { useAddWord, useAddWordScope } from '@/features/learner/add-word/add-word-context';
import type { AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { groupTone } from '@/lib/group-color';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { Skeleton } from '@/ui/Skeleton';
import { StageBar } from '@/ui/StageBar';
import { TextButton } from '@/ui/TextButton';
import { showToast } from '@/ui/Toast';
import { rhythm } from './carousel';
import { mastered } from './deck-actions';
import { DeckButtons } from './DeckButtons';
import { useCloseFlip, useFlipFrom } from './flip';
import { useGroupDialogs } from './GroupDialogs';
import { GroupStack } from './GroupStack';
import {
  isId,
  useDeckWords,
  useGroup,
  useGroupMutations,
  useGroups,
  type DeckWord,
  type GroupDetail,
  type GroupSummary,
  type WordFilter,
} from './groups-api';
import { STAGE_KEYS } from './stages';

/** The number of words behind each filter, from the deck summary (counted on the server, owner 27/10/2026). */
function filterCount(summary: GroupSummary | undefined, filter: WordFilter, total: number): number | null {
  if (filter === 'all') return summary?.total ?? total;
  if (!summary) return null;
  if (filter === 'priority') return summary.today.priority;
  if (filter === 'due') return summary.available.due;
  if (filter === 'new') return summary.available.new;
  return summary.cells[Number(filter.slice(6))]?.total ?? 0;
}

/** Stage dots of the word rows (design §7.3); stage 5's dot is a gradient, so the row uses its flat colour. */
const STAGE_DOT = ['bg-wm-stage-0-dot', 'bg-wm-stage-1-dot', 'bg-wm-stage-2-dot', 'bg-wm-stage-3-dot', 'bg-wm-stage-4-dot', 'bg-wm-stage-5-solid'] as const;

const ALERT = 'flex flex-col items-start gap-3 rounded-wm-xl bg-wm-surface p-6 shadow-wm-card';

/** Một nhóm (Figma 84:3552 / 84:3749): `/app/group?id=` — the stack from the carousel, today's counts, the rhythm bar and every word. */
export function GroupPage() {
  const t = useTranslations('App.group');
  const tCommon = useTranslations('App.common');
  const locale = useLocale();
  const raw = useSearchParams().get('id');
  const id = isId(raw) ? raw.toLowerCase() : null;
  const detail = useGroup(id);
  const summary = useGroups().data?.items.find((g) => g.id === id);
  const notFound = id === null || (detail.error instanceof ApiError && detail.error.problem.status === 404);
  // Opened from the carousel (owner 10/11/2026): the deck list already holds this deck, so the head draws at once and the stack
  // flies in without a skeleton in between; the detail (creation date) fills in when it arrives.
  const shown = detail.data ?? (summary && !detail.isError ? fromSummary(summary) : null);

  if (notFound || !shown) {
    return (
      <>
        <BackLink href={`/${locale}/app/groups`} label={t('back')} />
        {notFound ? (
          <div className={ALERT}>
            <h1 className="font-wm-display text-wm-card-title text-wm-ink">{t('notFound')}</h1>
            <Link href={`/${locale}/app/groups`} className="text-wm-small-strong text-wm-accent">
              {t('toList')}
            </Link>
          </div>
        ) : detail.isError ? (
          <GroupError error={detail.error} onRetry={() => void detail.refetch()} />
        ) : (
          <div role="status" className="flex flex-col gap-5 md:flex-row md:items-center md:gap-11">
            <span className="sr-only">{tCommon('loading')}</span>
            <Skeleton className="h-74 w-52 rounded-wm-xl" />
            <Skeleton className="h-40 flex-1 rounded-wm-xl" />
          </div>
        )}
      </>
    );
  }
  return <GroupBody detail={shown} />;
}

/** The detail a deck-list row already tells: no creation date yet, no count of words only in this deck. */
function fromSummary(summary: GroupSummary): GroupDetail {
  return { id: summary.id, name: summary.name, version: summary.version, item_count: summary.total, removable_items: 0, created_at: '', updated_at: '' };
}

function GroupError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const errorText = useErrorMessage();
  const tCommon = useTranslations('App.common');
  return (
    <div role="alert" className={ALERT}>
      <p className="text-wm-base text-wm-ink">{errorText(error)}</p>
      <Button variant="secondary" onPress={onRetry}>
        {tCommon('retry')}
      </Button>
    </div>
  );
}

/** Until `GET /v1/groups` arrives, the stack is drawn from the deck detail with nothing waiting. */
function fallbackSummary(detail: GroupDetail): GroupSummary {
  return {
    id: detail.id, name: detail.name, version: detail.version, total: detail.item_count, today: { priority: 0, due: 0, new: 0 },
    cells: [0, 1, 2, 3, 4, 5].map((level) => ({ level, total: 0, due: 0 })), backlog: 0, available: { due: 0, new: 0 },
  };
}

function GroupBody({ detail }: { detail: GroupDetail }) {
  useAddWordScope(detail.id);
  const addWord = useAddWord();
  const t = useTranslations('App.group');
  const tStage = useTranslations('App.stages');
  const tGroups = useTranslations('App.groups');
  const locale = useLocale() as AppLocale;
  const format = useFormat();
  const summary = useGroups().data?.items.find((g) => g.id === detail.id);
  const group = summary ?? { ...fallbackSummary(detail) };
  const { open, dialogs } = useGroupDialogs();
  const [filter, setFilter] = useState<WordFilter>('all');
  const words = useDeckWords(detail.id, filter);
  const shown = words.data?.pages.flatMap((page) => page.items) ?? [];
  const total = summary?.total ?? detail.item_count;
  // Owner 06/11/2026: a deck with no words leads with [Thêm từ]; no study button for 0 words and no counts that are all 0.
  const empty = total === 0;
  const known = summary ? mastered(summary) : 0;
  const created = detail.created_at ? format.date(detail.created_at, 'full') : null;
  const tone = groupTone(detail.id, total);
  const pageRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  useFlipFrom('group-stack', stackRef, pageRef);
  const close = useCloseFlip('group-stack-back', stackRef, pageRef);
  const filters: Array<{ id: WordFilter; label: string }> = [
    { id: 'all', label: t('filterAll') },
    { id: 'priority', label: t('filterPriority') },
    { id: 'due', label: t('filterDue') },
    { id: 'new', label: t('filterNew') },
    ...([1, 2, 3, 4, 5] as const).map((level) => ({ id: `stage-${level}` as WordFilter, label: t('filterStage', { stage: tStage(STAGE_KEYS[level]) }) })),
  ];
  const filterTotal = filterCount(summary, filter, detail.item_count);
  const left = filterTotal === null ? null : Math.max(0, filterTotal - shown.length);

  return (
    <div ref={pageRef} className="flex flex-col gap-6">
      <div data-in="0">
        <BackLink href={`/${locale}/app/groups`} label={t('back')} onClick={close} />
      </div>
      <section aria-labelledby="group-title" className="relative isolate flex flex-col items-center gap-5 md:flex-row md:items-center md:gap-11">
        <div aria-hidden className={cn('gcar-halo -z-10', tone.wash)} />
        {/* Above the group info while it flies in from the carousel (motion doc §3). */}
        <GroupStack group={group} size="page" depth={2} ref={stackRef} className="z-10" />
        <div data-in="1" className="flex w-full min-w-0 flex-1 flex-col gap-4">
          <p className="text-wm-meta text-wm-muted">
            {created === null
              ? t('metaNoDate', { count: detail.item_count, mastered: known })
              : known > 0
                ? t('metaMastered', { count: detail.item_count, mastered: known, date: created })
                : t('meta', { count: detail.item_count, date: created })}
          </p>
          <h1 id="group-title" className="flex items-center gap-3 font-wm-display text-3xl font-extrabold leading-tight tracking-tight text-wm-ink md:text-5xl">
            <span aria-hidden className={cn('size-3.25 shrink-0 rounded-wm-xs md:size-4', tone.bg)} />
            <span className="min-w-0 wrap-anywhere">{detail.name}</span>
          </h1>
          {summary && !empty && (
            <ul aria-label={t('todayChips')} className="flex flex-wrap gap-2">
              {(
                [
                  ['chipPriority', summary.today.priority],
                  ['chipDue', summary.today.due],
                  ['chipNew', summary.today.new],
                ] as const
              ).map(([key, count]) => (
                <li key={key} className="flex items-baseline gap-1 rounded-wm-md bg-wm-surface px-3 py-1.25 text-wm-small text-wm-ink shadow-wm-soft">
                  <b className={cn('font-wm-display font-extrabold', tone.ink)}>{format.number(count)}</b>{' '}
                  {/* The copy is "{count} ưu tiên": the number is drawn apart, in the deck ink. */}
                  {t(key, { count }).replace(/^\S+\s/, '')}
                </li>
              ))}
            </ul>
          )}
          {summary && !empty && (
            <StageBar
              aria-label={tGroups('rhythm')}
              segments={rhythm(summary.cells).map((c) => ({
                size: c.total,
                fill: c.due,
                tone: tone.bg,
                label: tGroups('rhythmSegment', { stage: tStage(STAGE_KEYS[c.level]), due: c.due, total: c.total }),
              }))}
              labels={rhythm(summary.cells).map((c) => (
                <span key={c.level} className="hidden md:inline">
                  <b className="font-bold text-wm-ink">{c.total}</b> {tStage(STAGE_KEYS[c.level])}
                </span>
              ))}
            />
          )}
          <div className="flex flex-wrap items-center gap-3">
            {empty ? (
              <Button onPress={() => addWord.open(undefined, { groupId: detail.id })}>{t('addWord')}</Button>
            ) : (
              summary && <DeckButtons group={summary} buttonClassName="w-29.75 md:w-37" />
            )}
            {!empty && (
              <TextButton tone="muted" onPress={() => addWord.open(undefined, { groupId: detail.id })} className="text-wm-button md:min-h-11">
                {t('addWord')}
              </TextButton>
            )}
            <DeckMenu
              studyAll={`/${locale}/app/review?group=${detail.id}&mode=all`}
              total={detail.item_count}
              onRename={() => open({ kind: 'rename', group: detail })}
              onDelete={() => open({ kind: 'delete', group: detail, leaveTo: 'groups' })}
            />
          </div>
          {summary && summary.backlog > 0 && (
            <Link
              href={`/${locale}/app/group/backlog?id=${detail.id}`}
              className="flex w-fit items-center gap-3 rounded-wm-md bg-wm-fail-soft px-3 py-2 text-wm-small-strong text-wm-fail outline-none focus-visible:outline-3 focus-visible:outline-wm-accent"
            >
              {t('backlog', { count: summary.backlog })}
              <span className="text-wm-accent">{t('backlogSee')}</span>
            </Link>
          )}
        </div>
      </section>
      {empty ? (
        <EmptyDeck />
      ) : (
        <section data-in="2" aria-labelledby="all-words" className="flex flex-col gap-3">
          <h2 id="all-words" className="font-wm-display text-xl font-bold text-wm-ink md:text-2xl">
            {t('allWords', { count: total })}
          </h2>
          <div role="group" aria-label={t('filterLabel')} className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
            {filters.map((f) => {
              const count = filterCount(summary, f.id, detail.item_count);
              const pressed = f.id === filter;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    'flex min-h-9 shrink-0 items-baseline gap-1 rounded-wm-md border px-3 py-1.5 text-wm-small outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent',
                    pressed ? 'border-wm-ink bg-wm-ink text-wm-surface' : 'border-wm-line bg-wm-surface text-wm-muted hover:text-wm-ink',
                  )}
                >
                  <span>{f.label}</span>
                  {count !== null && <span className="text-wm-meta font-bold">{format.number(count)}</span>}
                </button>
              );
            })}
          </div>
          {words.isPending ? (
            <div role="status" className="flex flex-col gap-2">
              <span className="sr-only">{t('allWords', { count: total })}</span>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-wm-lg" />
              ))}
            </div>
          ) : words.isError ? (
            <GroupError error={words.error} onRetry={() => void words.refetch()} />
          ) : shown.length === 0 ? (
            <p className="text-wm-base text-wm-muted">{filter === 'all' ? t('empty') : t('emptyFilter')}</p>
          ) : (
            <>
              <ul aria-label={t('allWords', { count: total })} className="flex flex-col gap-2">
                {shown.map((word) => (
                  <WordRow key={word.item_id} card={word} groupId={detail.id} />
                ))}
              </ul>
              {words.hasNextPage && (
                <TextButton onPress={() => void words.fetchNextPage()} isDisabled={words.isFetchingNextPage} className="w-fit">
                  {left !== null && left > 0 ? t('loadMore', { count: left }) : t('loadMoreUnknown')}
                </TextButton>
              )}
            </>
          )}
        </section>
      )}
      {dialogs}
    </div>
  );
}

const MENU_ITEM = 'cursor-pointer rounded-wm-sm px-3 py-2 font-wm-sans text-wm-small text-wm-ink outline-none data-focused:bg-wm-accent-soft';

/** The deck's ⋯ menu: rename, study every word, delete. */
function DeckMenu({ studyAll, total, onRename, onDelete }: { studyAll: string; total: number; onRename: () => void; onDelete: () => void }) {
  const t = useTranslations('App');
  return (
    <MenuTrigger>
      <AriaButton
        aria-label={t('group.menu')}
        className="flex size-11 items-center justify-center rounded-wm-md text-wm-muted outline-none hover:text-wm-ink focus-visible:outline-3 focus-visible:outline-wm-accent"
      >
        <MoreHorizontal aria-hidden className="size-5" />
      </AriaButton>
      <Popover placement="bottom end" className="w-56 rounded-wm-lg border border-wm-line bg-wm-surface p-1 shadow-wm-pop">
        <Menu className="outline-none">
          <MenuItem className={MENU_ITEM} onAction={onRename}>
            {t('groups.rename')}
          </MenuItem>
          {total > 0 && (
            <MenuItem className={MENU_ITEM} href={studyAll}>
              {t('groups.studyAll', { count: total })}
            </MenuItem>
          )}
          <MenuItem className={cn(MENU_ITEM, 'text-wm-fail')} onAction={onDelete}>
            {t('groups.delete')}
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

/** A deck with no words (owner 06/11/2026): what to do, and the way to pick a batch by topic. [Thêm từ] stays in the head. */
function EmptyDeck() {
  const t = useTranslations('App.group');
  const locale = useLocale();
  return (
    <section data-in="2" aria-labelledby="empty-deck" className="flex flex-col items-start gap-4 rounded-wm-xl bg-wm-surface p-6 shadow-wm-card md:p-8">
      <h2 id="empty-deck" className="text-balance font-wm-display text-wm-card-title text-wm-ink">
        {t('emptyTitle')}
      </h2>
      <p className="max-w-prose text-pretty text-wm-base text-wm-muted">{t('emptyBody')}</p>
      <Link
        href={`/${locale}/app/lookup`}
        className="flex min-h-11 items-center gap-2 text-wm-button text-wm-accent outline-none focus-visible:outline-3 focus-visible:outline-wm-accent"
      >
        <Search aria-hidden className="size-4 shrink-0" />
        {t('emptyLookup')}
      </Link>
    </section>
  );
}

function WordRow({ card, groupId }: { card: DeckWord; groupId: string }) {
  const t = useTranslations('App.group');
  const tStage = useTranslations('App.stages');
  const locale = useLocale() as AppLocale;
  const errorText = useErrorMessage();
  const { removeItem } = useGroupMutations();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const word = card.content.lemma;
  const stage = t('stageChip', { stage: tStage(STAGE_KEYS[card.level]) });
  const status = card.priority
    ? t('priorityTag')
    : card.section === 'new'
      ? t('newWord')
      : card.section === 'early'
        ? t('dueOn', { date: createFormat(locale, 'UTC').date(`${card.due_date}T00:00:00Z`, 'dayMonth') })
        : t('dueToday');

  async function remove() {
    if (busy) return;
    setBusy(true);
    try {
      await removeItem(groupId, card.item_id, crypto.randomUUID());
      showToast(t('removed', { word }), 'success');
      setConfirm(false);
    } catch (error) {
      showToast(errorText(error), 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <li aria-label={word} className="flex items-center gap-4 rounded-wm-lg bg-wm-surface px-4 py-3 shadow-wm-row">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 md:flex-row md:items-baseline md:gap-4">
        <Link
          href={`/${locale}/app/word?w=${encodeURIComponent(word)}`}
          className="font-wm-display text-wm-word text-wm-ink outline-none wrap-anywhere hover:underline focus-visible:outline-3 focus-visible:outline-wm-accent md:w-47.5 md:shrink-0 md:text-xl"
        >
          {word}
        </Link>
        <span className="hidden w-24 shrink-0 text-wm-meta text-wm-muted md:block">{card.content.pos}</span>
        <span className="min-w-0 flex-1 text-wm-small text-wm-muted wrap-anywhere md:text-wm-base md:text-wm-ink">
          {card.content.meaning.text}
          {card.sense_changed && <span className="ml-2 rounded-wm-sm bg-wm-fail-soft px-1.5 py-0.5 text-wm-label text-wm-fail">{t('senseChanged')}</span>}
        </span>
      </div>
      <span className="hidden w-32.5 shrink-0 items-center gap-1.5 text-wm-caption text-wm-muted md:flex">
        <span aria-hidden className={cn('size-2.25 shrink-0 rounded-wm-xs', STAGE_DOT[card.level])} />
        {stage}
      </span>
      <span className={cn('shrink-0 text-right text-wm-label md:w-30', card.priority ? 'text-wm-fail' : statusTone(card))}>{status}</span>
      <TextButton
        tone="muted"
        aria-label={t('removeLabel', { word })}
        isDisabled={busy}
        onPress={() => (card.group_count === 1 ? setConfirm(true) : void remove())}
        className="min-h-11 shrink-0 px-1"
      >
        <X aria-hidden className="size-4" />
      </TextButton>
      <Dialog
        isOpen={confirm}
        onOpenChange={(isOpen) => !isOpen && setConfirm(false)}
        title={t('removeLastTitle', { word })}
        isDismissable={!busy}
        footer={
          <>
            <Button variant="secondary" onPress={() => setConfirm(false)}>
              {t('keep')}
            </Button>
            <Button variant="danger" onPress={() => void remove()} isPending={busy}>
              {t('removeLastConfirm')}
            </Button>
          </>
        }
      >
        <p role="note" className="rounded-wm-lg bg-wm-fail-soft p-4 text-wm-small-strong text-wm-fail">
          {t('removeLastBody')}
        </p>
      </Dialog>
    </li>
  );
}

/** Status colour of a row (Figma 84:3552): the deck's dark ink, as the drawn "từ mới" / "cần ôn hôm nay". */
function statusTone(card: DeckWord): string {
  return card.section === 'early' ? 'text-wm-muted' : 'text-wm-ink';
}
