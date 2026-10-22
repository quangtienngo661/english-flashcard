'use client';

import { MoreHorizontal } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button as AriaButton, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import { AppShell } from '@/app-chrome/AppShell';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { createFormat } from '@/app-shell/format';
import { Button } from '@/app-ui/Button';
import { Dialog } from '@/app-ui/Dialog';
import { Select } from '@/app-ui/Select';
import { ErrorState, FullScreenSpinner, NotFoundState } from '@/app-ui/States';
import { showToast } from '@/app-ui/Toast';
import type { AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { waiting } from './GroupCard';
import { useGroupDialogs } from './GroupDialogs';
import { highlightWord } from './highlight';
import {
  isId,
  useAllGroupItems,
  useGroup,
  useGroupMutations,
  useGroupQueue,
  useGroups,
  type Card,
  type GroupDetail,
  type GroupSummary,
} from './groups-api';
import { STAGE_KEYS } from './stages';

type Filter = 'all' | 'priority' | 'due' | 'new' | `stage-${1 | 2 | 3 | 4 | 5}`;
const STAGE_AXIS = ['Mới', '1', '3', '7', '14', '30'] as const;

function matches(card: Card, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'priority') return card.section === 'priority';
  if (filter === 'due') return card.section === 'due';
  if (filter === 'new') return card.section === 'new';
  return card.level === Number(filter.slice(6));
}

/** K/11–K/13: `/app/group?id=` — the deck's stages, today's counts, a card preview and every word with its stage. */
export function GroupPage() {
  const t = useTranslations('App.group');
  const locale = useLocale();
  const raw = useSearchParams().get('id');
  const id = isId(raw) ? raw.toLowerCase() : null;
  const detail = useGroup(id);
  const notFound = id === null || (detail.error instanceof ApiError && detail.error.problem.status === 404);

  return (
    <AppShell variant="sub" back={{ href: `/${locale}/app/groups`, label: t('back') }}>
      {notFound ? (
        <NotFoundState title={t('notFound')} back={{ href: `/${locale}/app/groups`, label: t('toList') }} />
      ) : detail.data ? (
        <GroupBody detail={detail.data} />
      ) : detail.isError ? (
        <GroupError error={detail.error} onRetry={() => void detail.refetch()} />
      ) : (
        <FullScreenSpinner />
      )}
    </AppShell>
  );
}

function GroupError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const errorText = useErrorMessage();
  return <ErrorState message={errorText(error)} onRetry={onRetry} />;
}

function GroupBody({ detail }: { detail: GroupDetail }) {
  const t = useTranslations('App.group');
  const tStage = useTranslations('App.stages');
  const locale = useLocale() as AppLocale;
  const summary = useGroups().data?.items.find((g) => g.id === detail.id);
  const queue = useGroupQueue(detail.id, 'all');
  const items = useAllGroupItems(detail.id).data;
  const { open, dialogs } = useGroupDialogs();
  const [filter, setFilter] = useState<Filter>('all');
  const cards = queue.data?.cards ?? [];
  const count = summary ? waiting(summary) : 0;
  const review = `/${locale}/app/review?group=${detail.id}`;
  const created = createFormat(locale, 'UTC').date(detail.created_at, 'full');
  const filters: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: t('filterAll') },
    { id: 'priority', label: t('filterPriority') },
    { id: 'due', label: t('filterDue') },
    { id: 'new', label: t('filterNew') },
    ...([1, 2, 3, 4, 5] as const).map((level) => ({ id: `stage-${level}` as Filter, label: t('filterStage', { stage: tStage(STAGE_KEYS[level]) }) })),
  ];
  const shown = cards.filter((c) => matches(c, filter));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 lg:col-span-1 lg:self-start">
        <div>
          <h1 className="break-words text-h2 font-extrabold text-ink">{detail.name}</h1>
          <p className="text-caption text-muted">{t('meta', { count: detail.item_count, date: created })}</p>
        </div>
        {summary && (
          <div className="flex flex-wrap gap-2 text-caption font-semibold">
            <span className="rounded-full bg-accent px-2 py-0.5 text-on-accent">{t('chipPriority', { count: summary.today.priority })}</span>
            <span className="rounded-full bg-primary px-2 py-0.5 text-on-primary">{t('chipDue', { count: summary.today.due })}</span>
            <span className="rounded-full border border-border-strong px-2 py-0.5 text-ink">{t('chipNew', { count: summary.today.new })}</span>
          </div>
        )}
        <div className="flex gap-2">
          {count > 0 ? (
            <Link href={review} className="flex min-h-control-touch flex-1 items-center justify-center rounded-inner bg-accent px-4 text-body font-semibold text-on-accent shadow-ledge-accent">
              {t('review', { count })}
            </Link>
          ) : (
            <Link href={`${review}&mode=all`} className="flex min-h-control-touch flex-1 items-center justify-center rounded-inner bg-accent px-4 text-body font-semibold text-on-accent shadow-ledge-accent">
              {t('studyAll', { count: detail.item_count })}
            </Link>
          )}
          <DeckMenu
            studyAll={`${review}&mode=all`}
            total={detail.item_count}
            onRename={() => open({ kind: 'rename', group: detail })}
            onDelete={() => open({ kind: 'delete', group: detail, leaveTo: 'groups' })}
          />
        </div>
        {summary && <StageChart summary={summary} />}
        {summary && summary.backlog > 0 && (
          <Link href={`/${locale}/app/group/backlog?id=${detail.id}`} className="flex items-center justify-between rounded-inner bg-danger-soft px-3 py-2 text-ui font-semibold text-danger">
            {t('backlog', { count: summary.backlog })}
            <span className="underline underline-offset-2">{t('backlogSee')}</span>
          </Link>
        )}
      </section>

      <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
        {cards.length > 0 && <CardPreview cards={cards} />}
        <section className="flex flex-col gap-3">
          <h2 id="all-words" className="text-title font-semibold text-ink">
            {t('allWords', { count: cards.length })}
          </h2>
          <div className="w-full sm:w-72">
            <Select
              label={t('filterLabel')}
              hideLabel
              value={filter}
              onChange={(next) => setFilter(next as Filter)}
              items={filters.map((f) => ({ ...f, suffix: t('filterCount', { count: cards.filter((c) => matches(c, f.id)).length }) }))}
            />
          </div>
          {queue.isPending ? (
            <FullScreenSpinner />
          ) : cards.length === 0 ? (
            <p className="text-body text-muted">{t('empty')}</p>
          ) : (
            <ul aria-label={t('allWords', { count: cards.length })} className="divide-y divide-border rounded-card border border-border bg-surface">
              {shown.map((card) => (
                <WordRow key={card.item_id} card={card} groupId={detail.id} groupCount={items?.get(card.item_id)?.group_count} changed={items?.get(card.item_id)?.sense_changed ?? false} />
              ))}
            </ul>
          )}
        </section>
      </div>
      {dialogs}
    </div>
  );
}

const MENU_ITEM = 'cursor-pointer rounded-sm px-3 py-2 text-ui text-ink outline-none data-focused:bg-primary-soft';

/** K/13: the deck's ⋯ menu. */
function DeckMenu({ studyAll, total, onRename, onDelete }: { studyAll: string; total: number; onRename: () => void; onDelete: () => void }) {
  const t = useTranslations('App');
  return (
    <MenuTrigger>
      <AriaButton aria-label={t('group.menu')} className="flex min-h-control-touch w-11 items-center justify-center rounded-inner border-2 border-border-strong bg-surface outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <MoreHorizontal aria-hidden className="size-5" />
      </AriaButton>
      <Popover placement="bottom end" className="w-56 rounded-inner bg-surface p-1 shadow-menu">
        <Menu className="outline-none">
          <MenuItem className={MENU_ITEM} onAction={onRename}>
            {t('groups.rename')}
          </MenuItem>
          <MenuItem className={MENU_ITEM} href={studyAll}>
            {t('groups.studyAll', { count: total })}
          </MenuItem>
          <MenuItem className={`${MENU_ITEM} text-danger`} onAction={onDelete}>
            {t('groups.delete')}
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

/** The six stages as columns (TV9 labels "Mới · 1 · 3 · 7 · 14 · 30"): blue = due today, outline = not yet. */
function StageChart({ summary }: { summary: GroupSummary }) {
  const t = useTranslations('App.group');
  const max = Math.max(1, ...summary.cells.map((c) => c.total));
  return (
    <figure aria-label={`${t('chartLabel')}: ${summary.cells.map((c, i) => `${STAGE_AXIS[i]} ${c.total}`).join(', ')}`} className="flex flex-col gap-2">
      <ul className="flex h-36 items-end justify-between gap-2">
        {summary.cells.map((cell, i) => (
          <li key={cell.level} data-stage={STAGE_AXIS[i]} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-caption font-semibold text-ink">{cell.total}</span>
            <span
              className="flex w-full flex-col justify-end overflow-hidden rounded-sm border-2 border-primary"
              // raw-ok: column height is the stage's share of the deck
              style={{ height: `${Math.max(6, Math.round((cell.total / max) * 80))}%` }}
            >
              <span
                className="block w-full bg-primary"
                // raw-ok: filled part is the share due today
                style={{ height: `${cell.total ? Math.round((cell.due / cell.total) * 100) : 0}%` }}
              />
            </span>
            <span className="text-caption text-muted">{STAGE_AXIS[i]}</span>
          </li>
        ))}
      </ul>
      <figcaption className="text-center text-caption text-muted">{t('chartLabel')}</figcaption>
      <p className="flex flex-wrap justify-center gap-3 text-caption text-muted">
        <span className="flex items-center gap-1">
          <span aria-hidden className="size-2 rounded-full bg-primary" />
          {t('legendDue')}
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden className="size-2 rounded-full border border-primary" />
          {t('legendLater')}
        </span>
      </p>
    </figure>
  );
}

/** K/11 "Xem trước thẻ": the front, then the back on a press or Space. */
function CardPreview({ cards }: { cards: Card[] }) {
  const t = useTranslations('App.group');
  const [index, setIndex] = useState(0);
  const [back, setBack] = useState(false);
  const card = cards[index % cards.length].content;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-title font-semibold text-ink">{t('preview')}</h2>
        <span className="text-caption text-muted">{t('previewHint')}</span>
      </div>
      <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface p-6">
        <button
          type="button"
          onClick={() => setBack((b) => !b)}
          onKeyDown={(e) => {
            if (e.key === ' ') {
              e.preventDefault();
              setBack((b) => !b);
            }
          }}
          className="flex min-h-40 w-full max-w-xs flex-col items-center justify-center gap-1 rounded-card border-2 border-ink bg-session-card p-4 text-center shadow-ledge-accent outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {back ? (
            <>
              <span className="text-title font-semibold text-ink">{card.meaning.text}</span>
              {card.examples[0] && <span className="text-caption text-muted">{highlightWord(card.examples[0], card.lemma)}</span>}
            </>
          ) : (
            <>
              <span className="break-all text-h3 font-extrabold text-ink">{card.lemma}</span>
              <span className="text-caption text-muted">{card.pos}</span>
            </>
          )}
        </button>
        {cards.length > 1 && (
          <Button
            variant="quiet"
            onPress={() => {
              setIndex((i) => i + 1);
              setBack(false);
            }}
          >
            {t('nextCard')} ›
          </Button>
        )}
      </div>
    </section>
  );
}

function WordRow({ card, groupId, groupCount, changed }: { card: Card; groupId: string; groupCount: number | undefined; changed: boolean }) {
  const t = useTranslations('App.group');
  const tStage = useTranslations('App.stages');
  const locale = useLocale() as AppLocale;
  const errorText = useErrorMessage();
  const { removeItem } = useGroupMutations();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const word = card.content.lemma;
  const stage = card.level === 0 ? tStage('s0') : t('stageChip', { stage: tStage(STAGE_KEYS[card.level]) });
  const status =
    card.section === 'new'
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
    <li aria-label={word} className="flex flex-wrap items-start justify-between gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-2">
          <Link href={`/${locale}/app/word?w=${encodeURIComponent(word)}`} className="break-all text-title font-semibold text-ink hover:underline">
            {word}
          </Link>
          <span className="text-caption text-muted">{card.content.pos}</span>
        </p>
        <p className="break-words text-ui text-ink">{card.content.meaning.text}</p>
        {card.content.examples[0] && <p className="break-words text-caption text-muted">{highlightWord(card.content.examples[0], word)}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className={cn('rounded-full px-2 py-0.5 text-caption font-semibold', card.priority ? 'bg-accent-soft text-ink' : 'bg-primary-soft text-ink')}>
          {card.priority ? `${stage} · ${t('priorityTag')}` : stage}
        </span>
        {changed && <span className="rounded-full bg-danger-soft px-2 py-0.5 text-caption font-semibold text-danger">{t('senseChanged')}</span>}
        <span className="text-caption text-muted">{status}</span>
        <button
          type="button"
          aria-label={t('removeLabel', { word })}
          disabled={busy || groupCount === undefined}
          onClick={() => (groupCount === 1 ? setConfirm(true) : void remove())}
          className="text-caption font-semibold text-primary underline-offset-2 hover:underline disabled:opacity-50"
        >
          {t('remove')}
        </button>
      </div>
      {confirm && (
        <Dialog
          isOpen
          onOpenChange={(open) => !open && setConfirm(false)}
          title={t('removeLastTitle', { word })}
          isDismissable={!busy}
          footer={
            <>
              <Button variant="quiet" onPress={() => setConfirm(false)}>
                {t('keep')}
              </Button>
              <Button variant="danger" onPress={() => void remove()} isPending={busy}>
                {t('removeLastConfirm')}
              </Button>
            </>
          }
        >
          <p className="text-body text-ink">{t('removeLastBody')}</p>
        </Dialog>
      )}
    </li>
  );
}
