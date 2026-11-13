'use client';

import { Check, ChevronDown, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { Button, Dialog, DialogTrigger, Popover } from 'react-aria-components';
import { cn } from '@/lib/cn';
import { groupTone } from '@/lib/group-color';
import { waiting } from './deck-actions';
import type { GroupSummary } from './groups-api';

/** Lower case without diacritics, đ as d: "Đề 9" matches "de 9" (prototype `fold`). */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase();
}

type Section = { key: 'waiting' | 'done' | 'empty'; groups: GroupSummary[] };

/**
 * "Chọn nhóm" (Figma 84:3173 / 84:3399): the button shows the centre group; the popover has a search field and the groups under
 * three captions. Focus stays in the search field; ↑ ↓ move the highlight, Enter picks it, Esc closes and gives focus back.
 */
export function GroupPicker({
  groups,
  centreId,
  isOpen,
  onOpenChange,
  onPick,
}: {
  groups: GroupSummary[];
  centreId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (id: string) => void;
}) {
  const t = useTranslations('App.groups');
  const centre = groups.find((g) => g.id === centreId) ?? groups[0];
  const tone = groupTone(centre.id, centre.total);
  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <Button
        aria-haspopup="dialog"
        className={cn(
          'flex min-h-12 min-w-0 max-w-full items-center gap-2 rounded-wm-control border-2 bg-wm-surface py-3 pl-4 pr-3 font-wm-sans text-wm-button text-wm-ink shadow-wm-soft outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent',
          tone.soft,
        )}
      >
        <span title={t('pickerTitle')} aria-hidden className={cn('size-2.5 shrink-0 rounded-wm-key', tone.bg)} />
        <span className="min-w-0 truncate">{centre.name}</span>
        <ChevronDown aria-hidden className={cn('size-4 shrink-0 transition-transform duration-200', isOpen && 'rotate-180')} />
      </Button>
      <Popover
        placement="bottom end"
        offset={8}
        // raw-ok: 360 px wide (Figma 84:3325) but never wider than the phone minus its gutters
        className="w-[min(22.5rem,calc(100vw-2rem))] rounded-wm-row border border-wm-line bg-wm-surface p-3 shadow-wm-pop outline-none motion-safe:data-entering:animate-wm-picker-in"
      >
        <Dialog aria-label={t('pickerTitle')} className="outline-none">
          {({ close }) => (
            <PickerBody
              groups={groups}
              centreId={centre.id}
              onPick={(id) => {
                onPick(id);
                close();
              }}
            />
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

function PickerBody({ groups, centreId, onPick }: { groups: GroupSummary[]; centreId: string; onPick: (id: string) => void }) {
  const t = useTranslations('App.groups');
  const listId = useId();
  const [query, setQuery] = useState('');
  const sections = useMemo<Section[]>(() => {
    const q = fold(query.trim());
    const shown = q ? groups.filter((g) => fold(g.name).includes(q)) : groups;
    return [
      { key: 'waiting' as const, groups: shown.filter((g) => waiting(g) > 0) },
      { key: 'done' as const, groups: shown.filter((g) => g.total > 0 && waiting(g) === 0) },
      { key: 'empty' as const, groups: shown.filter((g) => g.total === 0) },
    ].filter((s) => s.groups.length > 0);
  }, [groups, query]);
  const flat = sections.flatMap((s) => s.groups);
  const [active, setActive] = useState(() => Math.max(0, flat.findIndex((g) => g.id === centreId)));
  const current = Math.min(active, flat.length - 1);
  const optionId = (id: string) => `${listId}-${id}`;

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (flat.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current + step + flat.length) % flat.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      onPick(flat[current].id);
    }
  }

  const caption = { waiting: t('capWaiting'), done: t('capDone'), empty: t('capEmpty') };
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex min-h-11 items-center gap-2 rounded-wm-control border-2 border-wm-line bg-wm-surface px-3 focus-within:border-wm-accent">
        <Search aria-hidden className="size-4 shrink-0 text-wm-muted" />
        <input
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={flat[current] ? optionId(flat[current].id) : undefined}
          aria-label={t('search', { count: groups.length })}
          placeholder={t('search', { count: groups.length })}
          // The popover opens to search; focus belongs in the field (Figma draws it focused).
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent py-2.5 font-wm-sans text-wm-base text-wm-ink outline-none placeholder:text-wm-muted"
        />
      </label>
      <div
        id={listId}
        role="listbox"
        aria-label={t('carousel')}
        // raw-ok: the list scrolls inside the popover once it outgrows the screen
        className="flex max-h-[min(26rem,60vh)] flex-col gap-0.5 overflow-y-auto"
      >
        {sections.length === 0 && <p className="px-2 py-3 text-wm-small text-wm-muted">{t('noMatch')}</p>}
        {sections.map((section) => (
          <div key={section.key} role="group" aria-label={caption[section.key]} className="flex flex-col gap-0.5">
            <p aria-hidden className="px-2 pt-1.5 text-wm-meta text-wm-muted">
              {caption[section.key]}
            </p>
            {section.groups.map((g) => {
              const index = flat.indexOf(g);
              return (
                <Row
                  key={g.id}
                  id={optionId(g.id)}
                  group={g}
                  selected={g.id === centreId}
                  active={index === current}
                  onHover={() => setActive(index)}
                  onPick={() => onPick(g.id)}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p aria-hidden className="mt-1 hidden gap-3 border-t border-wm-line pl-2 pt-2 text-wm-meta text-wm-muted md:flex">
        <span>{t('keysMove')}</span>
        <span>{t('keysPick')}</span>
        <span>{t('keysClose')}</span>
      </p>
    </div>
  );
}

function Row({ id, group, selected, active, onHover, onPick }: {
  id: string;
  group: GroupSummary;
  selected: boolean;
  active: boolean;
  onHover: () => void;
  onPick: () => void;
}) {
  const t = useTranslations('App.groups');
  const tone = groupTone(group.id, group.total);
  const count = waiting(group);
  return (
    // The search field owns the keyboard (aria-activedescendant); a row is picked with the pointer here.
    <div
      id={id}
      role="option"
      aria-selected={selected}
      onMouseMove={onHover}
      onClick={onPick}
      className={cn(
        'flex min-h-10 cursor-pointer items-center gap-3 rounded-wm-control px-2 py-2',
        selected ? tone.wash : active && 'bg-wm-bg',
        active && 'outline-2 -outline-offset-2 outline-wm-accent/40',
      )}
    >
      <span aria-hidden className={cn('size-2.5 shrink-0 rounded-wm-key', tone.bg)} />
      <span className="min-w-0 flex-1 truncate font-wm-sans text-wm-small-strong text-wm-ink">{group.name}</span>
      {group.total === 0 ? (
        <span className="shrink-0 text-wm-caption text-wm-muted">{t('rowEmpty')}</span>
      ) : count > 0 ? (
        <span className="shrink-0 text-wm-caption text-wm-muted">
          <b className={cn('font-wm-display font-extrabold', tone.ink)}>{count}</b> {t('rowWaiting')}
        </span>
      ) : (
        <span className="shrink-0 text-wm-caption text-wm-muted">{t('words', { count: group.total })}</span>
      )}
      <Check aria-hidden className={cn('size-4 shrink-0 text-wm-accent', !selected && 'invisible')} />
    </div>
  );
}
