'use client';

import { MoreHorizontal, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import { useAddWord } from '@/features/learner/add-word/add-word-context';
import { cn } from '@/lib/cn';
import { mastered } from './deck-actions';
import { DeckButtons } from './DeckButtons';
import type { GroupSummary } from './groups-api';

/** Cards waiting today in a deck (priority + due + new, already capped by the API). */
export const waiting = (g: GroupSummary) => g.today.priority + g.today.due + g.today.new;

/** K/10 order: decks with priority cards, then most cards waiting, then by name; decks done for today last. */
export function sortForToday(groups: GroupSummary[]): GroupSummary[] {
  return [...groups].sort(
    (a, b) =>
      Number(waiting(b) > 0) - Number(waiting(a) > 0) ||
      Number(b.today.priority > 0) - Number(a.today.priority > 0) ||
      waiting(b) - waiting(a) ||
      a.name.localeCompare(b.name),
  );
}

const TONES = ['bg-primary-soft', 'bg-accent-soft', 'bg-success-soft', 'bg-danger-soft'] as const;

/** The six stages as small bars (K/10 card head): filled = due today, outline = the rest. */
export function StageBars({ cells, className }: { cells: GroupSummary['cells']; className?: string }) {
  const max = Math.max(1, ...cells.map((c) => c.total));
  return (
    <div aria-hidden className={cn('flex h-10 items-end gap-1', className)}>
      {cells.map((cell) => (
        <span
          key={cell.level}
          className={cn('w-4 rounded-sm border-2 border-ink', cell.total > 0 ? 'bg-ink' : 'bg-transparent')}
          // raw-ok: bar height is the stage's share of the deck
          style={{ height: `${Math.max(18, Math.round((cell.total / max) * 100))}%` }}
        />
      ))}
    </div>
  );
}

type Actions = { onRename: (g: GroupSummary) => void; onDelete: (g: GroupSummary) => void };

const ACTION =
  'relative z-10 mt-auto flex min-h-control items-center justify-center gap-2 rounded-inner border-2 border-border-strong bg-surface px-4 text-ui font-semibold text-ink shadow-button-secondary hover:bg-primary-soft';

/**
 * One deck (K/10, K/16): stage bars, size and words mastered, name, cards waiting, Học · Ôn (đợt C §4.1) and the ⋯ menu (K/10b). Owner 06/11/2026: a deck
 * with no words says "Chưa có từ" and offers [Thêm từ] (locked to it), never "Xong hôm nay" or a study button for 0 words.
 */
export function GroupCard({ group, index, actions }: { group: GroupSummary; index: number; actions: Actions }) {
  const t = useTranslations('App.groups');
  const tDeck = useTranslations('App.deck');
  const locale = useLocale();
  const addWord = useAddWord();
  const count = waiting(group);
  const empty = group.total === 0;
  const known = mastered(group);

  return (
    // Owner 27/10/2026: the whole card opens the deck (stretched link) and lifts a little on hover; the menu and the review
    // button sit above the link and keep their own action.
    <li className="relative flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-surface shadow-ledge-soft transition duration-fast ease-standard focus-within:shadow-ledge hover:shadow-ledge motion-safe:hover:-translate-y-1 motion-safe:focus-within:-translate-y-1">
      <div className={cn('pastel-island relative px-4 pb-3 pt-4', TONES[index % TONES.length])}>
        <StageBars cells={group.cells} />
        <GroupMenu group={group} actions={actions} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-caption text-muted">
          {t('words', { count: group.total })}
          {known > 0 && ` · ${tDeck('mastered', { count: known })}`}
          {group.backlog > 0 && ` · ${t('backlogShort', { count: group.backlog })}`}
        </p>
        <h3 className="break-words text-title font-semibold text-ink">
          <Link href={`/${locale}/app/group?id=${group.id}`} className="outline-none after:absolute after:inset-0 after:rounded-card focus-visible:after:ring-2 focus-visible:after:ring-primary">
            {group.name}
          </Link>
        </h3>
        <span
          className={cn(
            'w-fit rounded-full px-2 py-0.5 text-caption font-semibold',
            empty ? 'border border-border-strong text-muted' : count > 0 ? 'bg-accent-soft text-ink' : 'bg-success-soft text-success',
          )}
        >
          {empty ? t('emptyChip') : count > 0 ? t('waitingChip', { count }) : t('doneChip')}
        </span>
        {empty ? (
          <button type="button" onClick={() => addWord.open(undefined, { groupId: group.id })} className={ACTION}>
            <Plus aria-hidden className="size-4 shrink-0" />
            {t('addWord')}
          </button>
        ) : (
          <DeckButtons group={group} size="card" className="mt-auto" />
        )}
      </div>
    </li>
  );
}

const ITEM = 'cursor-pointer rounded-sm px-3 py-2 text-ui text-ink outline-none data-focused:bg-primary-soft';

function GroupMenu({ group, actions }: { group: GroupSummary; actions: Actions }) {
  const t = useTranslations('App.groups');
  const locale = useLocale();
  return (
    <MenuTrigger>
      <Button
        aria-label={t('menu', { name: group.name })}
        className="absolute right-3 top-3 z-10 rounded-sm p-1 text-ink outline-none hover:bg-surface/60 focus-visible:ring-2 focus-visible:ring-primary"
      >
        <MoreHorizontal aria-hidden className="size-5" />
      </Button>
      <Popover placement="bottom end" className="w-56 rounded-inner bg-surface p-1 shadow-menu motion-safe:data-entering:animate-menu-in">
        <Menu className="outline-none">
          <MenuItem className={ITEM} onAction={() => actions.onRename(group)}>
            {t('rename')}
          </MenuItem>
          {group.total > 0 && (
            <MenuItem className={ITEM} href={`/${locale}/app/review?group=${group.id}&mode=all`} data-google-vignette="false">
              {t('studyAll', { count: group.total })}
            </MenuItem>
          )}
          <MenuItem className={`${ITEM} text-danger`} onAction={() => actions.onDelete(group)}>
            {t('delete')}
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
