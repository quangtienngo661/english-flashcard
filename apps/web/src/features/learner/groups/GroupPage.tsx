'use client';

import { MoreHorizontal, Search, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button as AriaButton, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import { BackLink } from '@/app-chrome/BackLink';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { createFormat, useFormat } from '@/app-shell/format';
import { useAddWord, useAddWordScope } from '@/features/learner/add-word/add-word-context';
import type { AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { groupTone } from '@/lib/group-color';
import { shownPos } from '@/lib/pos';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { Skeleton } from '@/ui/Skeleton';
import { Card } from '@/ui/Card';
import { LevelBar } from '@/ui/LevelBar';
import { PageTitle } from '@/ui/PageTitle';
import { Select } from '@/ui/Select';
import { SectionTitle } from '@/ui/SectionTitle';
import { ButtonLink } from '@/ui/ButtonLink';
import { TEXT_BUTTON_BASE, TEXT_BUTTON_TONE, TextButton } from '@/ui/TextButton';
import { LEVEL_FILL, STATE_TEXT, toLevel, useLevelInterval, useLevelName } from '@/ui/levels';
import { showToast } from '@/ui/Toast';
import { rhythm } from './carousel';
import { rememberCentre } from './centre-memory';
import { deckPlan } from './deck-actions';
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

/** The number of words behind each filter, from the deck summary (counted on the server, owner 27/10/2026). */
function filterCount(summary: GroupSummary | undefined, filter: WordFilter, total: number): number | null {
  if (filter === 'all') return summary?.total ?? total;
  if (!summary) return null;
  if (filter === 'priority') return summary.today.priority;
  if (filter === 'due') return summary.available.due;
  if (filter === 'new') return summary.available.new;
  return summary.cells[Number(filter.slice(6))]?.total ?? 0;
}

const ALERT = 'flex flex-col items-start gap-3 rounded-wm-card bg-wm-surface p-6 shadow-wm-card';

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
            <Skeleton className="h-74 w-52 rounded-wm-card" />
            <Skeleton className="h-40 flex-1 rounded-wm-card" />
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
  const levelName = useLevelName();
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
  const created = detail.created_at ? format.date(detail.created_at, 'full') : null;
  const tone = groupTone(detail.id, total);
  const pageRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  useFlipFrom('group-stack', stackRef, pageRef);
  // Back on Nhóm, the carousel opens on this group (owner 13/11/2026).
  useEffect(() => rememberCentre(detail.id), [detail.id]);
  const close = useCloseFlip('group-stack-back', stackRef, pageRef);
  const filters: Array<{ id: WordFilter; label: string }> = [
    { id: 'all', label: t('filterAll') },
    { id: 'priority', label: t('filterPriority') },
    { id: 'due', label: t('filterDue') },
    { id: 'new', label: t('filterNew') },
    ...([1, 2, 3, 4, 5] as const).map((level) => ({ id: `stage-${level}` as WordFilter, label: levelName(level) })),
  ];
  const filterTotal = filterCount(summary, filter, detail.item_count);
  const left = filterTotal === null ? null : Math.max(0, filterTotal - shown.length);

  return (
    <div ref={pageRef} className="flex flex-col gap-6">
      <div data-in="0">
        <BackLink href={`/${locale}/app/groups`} label={t('back')} onClick={close} prefetch />
      </div>
      {/* Bản A (owner 13/11/2026, mockup mot-nhom-hai-cot.html): from 1280 px the group on the left (400 px, it stays while the table
          scrolls) and the words on the right; narrower, the same parts one under the other. The stack comes first and larger. From 1024
          the table got only 493 px and cut "presentation" mid-word (audit C2), so the split moved to 1280 (QA3). */}
      <div
        // raw-ok: the 400 px group column beside the words (bản A); no token for a two-track grid
        className="flex flex-col gap-8 xl:grid xl:grid-cols-[25rem_minmax(0,1fr)] xl:items-start xl:gap-9"
      >
      <section aria-label={detail.name} className="relative isolate flex flex-col items-center gap-5 xl:sticky xl:top-24 xl:items-start">
        <div aria-hidden className={cn('gcar-halo -z-10', tone.wash)} />
        {/* Above the group info while it flies in from the carousel (motion doc §3). */}
        <GroupStack group={group} size="page" depth={2} ref={stackRef} className="z-10" />
        <div data-in="1" className="flex w-full min-w-0 flex-col gap-4">
          <div className="min-w-0 wrap-anywhere">
            <PageTitle eyebrow={created === null ? t('metaNoDate', { count: detail.item_count }) : t('meta', { count: detail.item_count, date: created })}>
              {detail.name}
            </PageTitle>
          </div>
          {summary && !empty && (
            <TodayBar
              label={t('todayChips')}
              parts={[
                { key: 'priority', fill: 'bg-wm-level-priority', count: summary.today.priority, text: t('chipPriority', { count: summary.today.priority }) },
                { key: 'due', fill: 'bg-wm-level-due', count: summary.today.due, text: t('chipDue', { count: summary.today.due }) },
                { key: 'new', fill: LEVEL_FILL[0], count: summary.today.new, text: t('chipNew', { count: summary.today.new }) },
              ]}
            />
          )}
          {summary && !empty && (
            <LevelBar size="lg" counts={rhythm(summary.cells).map((c) => c.total)} />
          )}
          {(() => {
            const menu = (
              <DeckMenu
                onRename={() => open({ kind: 'rename', group: detail })}
                onDelete={() => open({ kind: 'delete', group: detail, leaveTo: 'groups' })}
              />
            );
            const add = (
              <TextButton tone="muted" onPress={() => addWord.open(undefined, { groupId: detail.id })} className="text-wm-button text-wm-ink md:min-h-11">
                {t('addWord')}
              </TextButton>
            );
            return empty || !summary ? (
              <div className="flex flex-wrap items-center gap-3">
                {empty && <Button onPress={() => addWord.open(undefined, { groupId: detail.id })}>{t('addWord')}</Button>}
                {menu}
              </div>
            ) : (
              <GroupActions group={summary} total={detail.item_count} menu={menu} add={add} />
            );
          })()}
          {summary && summary.backlog > 0 && (
            <Link
              href={`/${locale}/app/group/backlog?id=${detail.id}`}
              className="flex w-fit items-center gap-3 rounded-wm-row bg-wm-fail-soft px-3 py-2 text-wm-small-strong text-wm-fail outline-none focus-visible:outline-3 focus-visible:outline-wm-accent"
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
          <SectionTitle id="all-words">{t('allWords', { count: total })}</SectionTitle>
          {/* One dropdown instead of the row of chips (bản A, owner 13/11/2026): no colours, each filter with its count. */}
          <Select
            label={t('filterLabel')}
            hideLabel
            size="sm"
            className="w-fit min-w-52"
            value={filter}
            onChange={(id) => setFilter(id as WordFilter)}
            // Until the deck summary arrives only [Tất cả] has a count to show.
            items={filters.flatMap((f) => {
              const count = filterCount(summary, f.id, detail.item_count);
              return count === null ? [] : [{ id: f.id, label: f.label, suffix: format.number(count) }];
            })}
            display={(item) => `${item.label} · ${item.suffix ?? ''}`}
          />
          {words.isPending ? (
            <div role="status" className="flex flex-col gap-2">
              <span className="sr-only">{t('allWords', { count: total })}</span>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-wm-row" />
              ))}
            </div>
          ) : words.isError ? (
            <GroupError error={words.error} onRetry={() => void words.refetch()} />
          ) : shown.length === 0 ? (
            <p className="text-wm-base text-wm-muted">{filter === 'all' ? t('empty') : t('emptyFilter')}</p>
          ) : (
            <>
              <Card className="p-2 pb-1 md:p-2 md:pb-1">
                <table aria-label={t('allWords', { count: total })} className="w-full border-separate border-spacing-0 text-left">
                  <thead>
                    <tr className={ROW}>
                      <Th>{t('colWord')}</Th>
                      <Th className="hidden md:table-cell">{t('colMeaning')}</Th>
                      <Th className="text-right md:text-left">{t('colLevel')}</Th>
                      <Th className="hidden md:table-cell">{t('colState')}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((word, i) => (
                      <WordRow key={word.item_id} card={word} groupId={detail.id} last={i === shown.length - 1} />
                    ))}
                  </tbody>
                </table>
              </Card>
              {words.hasNextPage && (
                <TextButton onPress={() => void words.fetchNextPage()} isDisabled={words.isFetchingNextPage} className="w-fit">
                  {left !== null && left > 0 ? t('loadMore', { count: left }) : t('loadMoreUnknown')}
                </TextButton>
              )}
            </>
          )}
        </section>
      )}
      </div>
      {dialogs}
    </div>
  );
}

const MENU_ITEM = 'cursor-pointer rounded-wm-control px-3 py-2 font-wm-sans text-wm-small text-wm-ink outline-none data-focused:bg-wm-accent-soft';

/** The deck's ⋯ menu: rename, study every word, delete. */
function DeckMenu({ onRename, onDelete }: { onRename: () => void; onDelete: () => void }) {
  const t = useTranslations('App');
  return (
    <MenuTrigger>
      <AriaButton
        aria-label={t('group.menu')}
        className="flex size-11 items-center justify-center rounded-wm-control text-wm-muted outline-none hover:text-wm-ink focus-visible:outline-3 focus-visible:outline-wm-accent"
      >
        <MoreHorizontal aria-hidden className="size-5" />
      </AriaButton>
      <Popover placement="bottom end" className="w-56 rounded-wm-row border border-wm-line bg-wm-surface p-1 shadow-wm-pop">
        <Menu className="outline-none">
          <MenuItem className={MENU_ITEM} onAction={onRename}>
            {t('groups.rename')}
          </MenuItem>
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
    <section data-in="2" aria-labelledby="empty-deck" className="flex flex-col items-start gap-4 rounded-wm-card bg-wm-surface p-6 shadow-wm-card md:p-8">
      <h2 id="empty-deck" className="text-balance font-wm-display text-wm-card-title text-wm-ink">
        {t('emptyTitle')}
      </h2>
      <p className="max-w-160 text-pretty text-wm-base text-wm-muted">{t('emptyBody')}</p>
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

// raw-ok: on phones a row is two columns, the word and meaning on the left, the level and status on the right
const ROW = 'grid grid-cols-[1fr_auto] md:table-row';

function Th({ className, children }: { className?: string; children: string }) {
  return (
    <th scope="col" className={cn('whitespace-nowrap border-b border-wm-line px-4 py-2.5 text-left text-wm-meta font-normal text-wm-muted', className)}>
      {children}
    </th>
  );
}

/** The status of a row, cased as a label and coloured by what it asks of the learner (mockup L375). */
function rowState(card: DeckWord): { key: 'priorityTag' | 'newWord' | 'dueOn' | 'dueToday'; tone: string } {
  if (card.priority) return { key: 'priorityTag', tone: STATE_TEXT.priority };
  if (card.section === 'new') return { key: 'newWord', tone: STATE_TEXT.new };
  if (card.section === 'early') return { key: 'dueOn', tone: STATE_TEXT.ok };
  return { key: 'dueToday', tone: STATE_TEXT.due };
}

function WordRow({ card, groupId, last }: { card: DeckWord; groupId: string; last: boolean }) {
  const t = useTranslations('App.group');
  const tCommon = useTranslations('App.common');
  const levelName = useLevelName();
  const levelInterval = useLevelInterval();
  const locale = useLocale() as AppLocale;
  const errorText = useErrorMessage();
  const { removeItem } = useGroupMutations();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const word = card.content.lemma;
  const level = toLevel(card.level);
  const state = rowState(card);
  const status = state.key === 'dueOn' ? t('dueOn', { date: createFormat(locale, 'UTC').date(`${card.due_date}T00:00:00Z`, 'dayMonth') }) : t(state.key);
  // One divider per word: under the whole row on desktop, under the second grid row (meaning and status) on phones.
  const cell = cn('px-4 py-3 align-middle', !last && 'md:border-b md:border-wm-line');
  const phoneDivider = !last && 'border-b border-wm-line';

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
    <tr aria-label={word} className={ROW}>
      <td className={cn(cell, 'col-start-1 row-start-1 min-w-0 pb-0 md:pb-3')}>
        <Link
          href={`/${locale}/app/word?w=${encodeURIComponent(word)}`}
          className="font-wm-display text-wm-word text-wm-ink outline-none break-words hover:underline focus-visible:outline-3 focus-visible:outline-wm-accent"
        >
          {word}
        </Link>
        {shownPos(card.content.pos) && <span className="block text-wm-meta text-wm-muted">{shownPos(card.content.pos)}</span>}
      </td>
      <td className={cn(cell, phoneDivider, 'col-start-1 row-start-2 min-w-0 pt-0 text-wm-small text-wm-muted wrap-anywhere md:pt-3 md:text-wm-base md:text-wm-ink')}>
        {card.content.meaning.text}
        {card.sense_changed && <span className="ml-2 rounded-wm-key bg-wm-fail-soft px-1.5 py-0.5 text-wm-label text-wm-fail">{t('senseChanged')}</span>}
      </td>
      <td className={cn(cell, 'col-start-2 row-start-1 pb-0 text-right md:pb-3 md:text-left')}>
        <span title={levelInterval(level) ?? undefined} className="inline-flex items-center gap-1.5 whitespace-nowrap text-wm-label text-wm-ink">
          <span aria-hidden className={cn('h-1.5 w-5.5 shrink-0 rounded-wm-key', LEVEL_FILL[level])} />
          {levelName(level)}
        </span>
      </td>
      <td className={cn(cell, phoneDivider, 'col-start-2 row-start-2 pt-0 md:pt-3')}>
        <div className="flex items-center justify-end gap-2 md:justify-between">
          <span className={cn('text-wm-label', state.tone)}>{status}</span>
          <TextButton
            tone="muted"
            aria-label={t('removeLabel', { word })}
            isDisabled={busy}
            onPress={() => (card.group_count === 1 ? setConfirm(true) : void remove())}
            className="min-h-11 shrink-0 px-1"
          >
            <X aria-hidden className="size-4" />
          </TextButton>
        </div>
        <Dialog
          isOpen={confirm}
          onOpenChange={(isOpen) => !isOpen && setConfirm(false)}
          title={t('removeLastTitle', { word })}
          closeLabel={tCommon('close')}
          isDismissable={!busy}
          footer={
            <>
              <TextButton tone="muted" onPress={() => setConfirm(false)} className="justify-center">
                {t('keep')}
              </TextButton>
              <Button variant="danger" onPress={() => void remove()} isPending={busy}>
                {t('removeLastConfirm')}
              </Button>
            </>
          }
        >
          <p role="note" className="rounded-wm-row bg-wm-fail-soft p-4 text-wm-small-strong text-wm-fail">
            {t('removeLastBody')}
          </p>
        </Dialog>
      </td>
    </tr>
  );
}

/**
 * Today in this group (mockup m9-ban-chot, Một nhóm; owner 13/11/2026): a thin bar of priority, due and new words, each part as wide as its
 * count, and a legend under it with the number in bold. Up to 380 px wide, above the level bar.
 */
function TodayBar({ label, parts }: { label: string; parts: Array<{ key: string; fill: string; count: number; text: string }> }) {
  const total = parts.reduce((sum, part) => sum + part.count, 0);
  return (
    <figure aria-label={label} className="m-0 flex w-full max-w-95 flex-col gap-2">
      <div aria-hidden className="flex h-2 gap-0.75">
        {total === 0 && <span className="block flex-1 rounded-wm-key bg-wm-line" />}
        {parts.map((part) =>
          part.count > 0 ? (
            <span
              key={part.key}
              data-today-part=""
              className={cn('block min-w-0 rounded-wm-key', part.fill)}
              // raw-ok: each part is as wide as its count
              style={{ flexGrow: part.count, flexBasis: 0 }}
            />
          ) : null,
        )}
      </div>
      <ul className="flex flex-wrap gap-x-3.5 gap-y-1 text-wm-meta text-wm-muted">
        {parts.map((part) => (
          <li key={part.key} className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span aria-hidden className={cn('size-2 shrink-0 rounded-wm-key', part.fill)} />
            {/* The copy is "{count} ưu tiên": the number is drawn apart, in bold. */}
            <b className="font-bold tabular-nums text-wm-ink">{part.count}</b> {part.text.replace(/^\S+\s/, '')}
          </li>
        ))}
      </ul>
    </figure>
  );
}

/**
 * The actions of mockup m9 (owner 13/11/2026, without the Enter key): the action with work waiting as the one button ("Ôn N thẻ" or
 * "Học N từ mới"), then as text the other one, "Học tất cả N từ" (moved out of the ⋯ menu) and, after them in the head, "Thêm từ". A deck
 * done for today offers "Ôn tập" when it has learned words.
 */
function GroupActions({ group, total, menu, add }: { group: GroupSummary; total: number; menu: ReactNode; add: ReactNode }) {
  const t = useTranslations('App');
  const locale = useLocale();
  const plan = deckPlan(group);
  const due = group.today.priority + group.today.due;
  const review = (mode: 'new' | 'all') => `/${locale}/app/review?group=${group.id}&mode=${mode}`;
  const recall = `/${locale}/app/recall?group=${group.id}`;
  const actions: Array<{ key: string; href: string; label: string }> = [];
  if (plan.recall === 'due') actions.push({ key: 'recall', href: recall, label: t('group.recallCount', { count: due }) });
  if (plan.learn === 'new') actions.push({ key: 'learn', href: review('new'), label: t('group.learnNew', { count: group.today.new }) });
  if (plan.recall === 'extra') actions.push({ key: 'extra', href: recall, label: t('deck.recallExtra') });
  if (total > 0) actions.push({ key: 'all', href: review('all'), label: t('groups.studyAll', { count: total }) });
  const [main, ...rest] = actions;
  // Bản A (owner 13/11/2026): the main action across the column with the ⋯ menu beside it; the text actions on the line below.
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-2">
        {main && (
          <ButtonLink href={main.href} data-google-vignette="false" variant="primary" className="flex-1">
            {main.label}
          </ButtonLink>
        )}
        {menu}
      </div>
      <div className="flex flex-wrap items-center gap-x-4.5 gap-y-1">
        {rest.map((action) => (
          <Link
            key={action.key}
            href={action.href}
            data-google-vignette="false"
            className={cn(TEXT_BUTTON_BASE, TEXT_BUTTON_TONE.normal, 'text-wm-button md:min-h-11')}
          >
            {action.label}
          </Link>
        ))}
        {add}
      </div>
    </div>
  );
}
