'use client';

import { Check, Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState, type KeyboardEvent } from 'react';
import { ListBox, ListBoxItem, type Selection } from 'react-aria-components';
import { TEXT_BUTTON_BASE, TEXT_BUTTON_TONE } from '@/ui/TextButton';
import { cn } from '@/lib/cn';
import { groupTone, type GroupTone } from '@/lib/group-color';
import type { GroupSummary } from '../groups/groups-api';
import { QUICK_ADD_GROUPS_MAX } from './add-word-api';
import { GROUP_NAME_MAX } from '../groups/group-name';

type Props = {
  groups: GroupSummary[];
  /** The chosen groups, in the order they were chosen. */
  value: string[];
  onChange: (ids: string[]) => void;
  /** "Tạo nhóm “du l”": make the deck and choose it. */
  onCreate: (name: string) => void;
  /** K/42c: nothing matches the typed name; the caller shows [Tạo nhóm và lưu] for it. */
  onUnmatched?: (name: string | null) => void;
  recentIds: string[];
  /** A group the learner cannot untick (the group page the sheet was opened from). */
  pinnedId?: string | null;
  /** Enter on a row: the caller confirms the choice (Space and click toggle). */
  onConfirm?: () => void;
};

const collator = new Intl.Collator('vi');

/** "Đã chọn {n} nhóm" for the dialog footer, next to the picker's buttons. */
export function SelectedCount({ count }: { count: number }) {
  const t = useTranslations('App.addWord');
  return <span className="font-wm-sans text-wm-caption text-wm-muted md:order-first md:mr-auto md:self-center">{t('selectedCount', { count })}</span>;
}

/**
 * K/42, K/42b, K/42c, M/52, QP1 (mockup L396–416, cách B): find or create decks and tick as many as the word should go to. "Dùng gần
 * đây" first, then every deck A–Z; each row has a mini stack of two cards in the deck colour that lifts when the row is ticked.
 * The list scrolls inside the dialog.
 */
export function GroupPicker({ groups, value, onChange, onCreate, onUnmatched, recentIds, pinnedId = null, onConfirm }: Props) {
  const t = useTranslations('App.addWord');
  const [text, setText] = useState('');
  const box = useRef<HTMLInputElement>(null);
  const query = text.trim();
  const sorted = [...groups].sort((a, b) => collator.compare(a.name, b.name));
  const matches = query ? sorted.filter((g) => g.name.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))) : sorted;
  const exact = groups.some((g) => g.name.toLocaleLowerCase('vi') === query.toLocaleLowerCase('vi'));
  const recent = groups.filter((g) => recentIds.includes(g.id));

  function type(next: string) {
    setText(next);
    const q = next.trim();
    const unmatched = q.length > 0 && !groups.some((g) => g.name.toLocaleLowerCase('vi').includes(q.toLocaleLowerCase('vi')));
    onUnmatched?.(unmatched ? q.slice(0, GROUP_NAME_MAX) : null);
  }

  const list = (label: string, shown: GroupSummary[]) => (
    <DeckList label={label} groups={shown} value={value} onChange={onChange} pinnedId={pinnedId} onConfirm={onConfirm} />
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="-mt-2 font-wm-sans text-wm-caption text-wm-muted">{t('pickerHint')}</p>
      <label className="flex min-h-11 items-center gap-2 rounded-wm-control border-2 border-wm-line bg-wm-surface px-3.5 focus-within:border-wm-accent focus-within:ring-4 focus-within:ring-wm-accent/16">
        <Search aria-hidden className="size-4.5 shrink-0 text-wm-muted" />
        <input
          ref={box}
          type="search"
          aria-label={t('search')}
          placeholder={t('search')}
          value={text}
          maxLength={GROUP_NAME_MAX}
          onChange={(e) => type(e.target.value)}
          className="min-w-0 flex-1 bg-transparent py-2 font-wm-sans text-wm-base text-wm-ink outline-none placeholder:text-wm-muted"
        />
      </label>
      {query && !exact && matches.length > 0 && (
        <CreateRow label={t('createNamed', { name: query })} onPress={() => onCreate(query.slice(0, GROUP_NAME_MAX))} />
      )}
      {!query && <CreateRow label={t('createNew')} onPress={() => box.current?.focus()} />}
      {query ? (
        matches.length > 0 ? (
          list(t('results', { count: matches.length }), matches)
        ) : (
          <p className="font-wm-sans text-wm-small text-wm-muted">{t('noneNamed', { name: query })}</p>
        )
      ) : (
        <div className="-mx-1 flex max-h-88 flex-col gap-3 overflow-y-auto px-1">
          {recent.length > 0 && list(t('recent'), recent)}
          {list(t('all', { count: groups.length }), sorted)}
        </div>
      )}
    </div>
  );
}

function CreateRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button type="button" onClick={onPress} className={cn(TEXT_BUTTON_BASE, TEXT_BUTTON_TONE.add, 'self-start text-left')}>
      <Plus aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 break-words">{label}</span>
    </button>
  );
}

function DeckList({
  label, groups, value, onChange, pinnedId, onConfirm,
}: { label: string; groups: GroupSummary[]; value: string[]; onChange: (ids: string[]) => void; pinnedId: string | null; onConfirm?: () => void }) {
  const t = useTranslations('App.addWord');

  function select(keys: Selection) {
    const next = keys === 'all' ? groups.map((g) => g.id) : [...keys].map(String);
    // The chosen order is kept: what was ticked stays where it was, what was just ticked goes last.
    const ordered = [...value.filter((id) => next.includes(id)), ...next.filter((id) => !value.includes(id))];
    onChange(pinnedId && !ordered.includes(pinnedId) ? [pinnedId, ...ordered] : ordered);
  }

  // Enter confirms the choice; the list itself keeps Space and click for ticking.
  function confirmOnEnter(event: KeyboardEvent) {
    if (event.key !== 'Enter' || !onConfirm || value.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    onConfirm();
  }

  return (
    <div className="flex flex-col gap-0.5" onKeyDownCapture={confirmOnEnter}>
      <p aria-hidden className="px-2 pb-1 text-wm-meta text-wm-muted">
        {label}
      </p>
      <ListBox
        aria-label={label}
        selectionMode="multiple"
        selectedKeys={new Set(value)}
        disabledKeys={[...(pinnedId ? [pinnedId] : []), ...(value.length >= QUICK_ADD_GROUPS_MAX ? groups.map((g) => g.id).filter((id) => !value.includes(id)) : [])]}
        onSelectionChange={select}
        className="flex flex-col gap-0.5 outline-none"
      >
        {groups.map((g) => {
          const tone = groupTone(g.id, g.total);
          return (
            <ListBoxItem
              key={g.id}
              id={g.id}
              textValue={g.name}
              className={({ isSelected, isFocusVisible }) =>
                cn(
                  'flex min-h-12 cursor-pointer items-center gap-3 rounded-wm-row px-2.5 py-1.5 outline-none transition-colors duration-200 motion-reduce:transition-none',
                  isSelected ? tone.wash : 'hover:bg-wm-accent/4',
                  isFocusVisible && 'outline-3 outline-wm-accent',
                )
              }
            >
              {({ isSelected }) => (
                <>
                  <MiniStack tone={tone} selected={isSelected} />
                  <span
                    className={cn(
                      'min-w-0 flex-1 break-words font-wm-sans text-wm-base-strong transition-colors duration-200 motion-reduce:transition-none',
                      isSelected ? tone.ink : 'text-wm-ink',
                    )}
                  >
                    {g.name}
                  </span>
                  <span className="shrink-0 text-wm-meta text-wm-muted">{t('words', { count: g.total })}</span>
                  <Check
                    aria-hidden
                    className={cn(
                      'size-5 shrink-0 transition duration-200 motion-reduce:transition-none',
                      isSelected ? cn('scale-100 opacity-100', tone.ink) : 'scale-60 opacity-0',
                    )}
                  />
                </>
              )}
            </ListBoxItem>
          );
        })}
      </ListBox>
    </div>
  );
}

/** Two cards in the group colour (mockup `.mini`): the back one leans out, the front one lifts when the row is ticked (300 ms). */
function MiniStack({ tone, selected }: { tone: GroupTone; selected: boolean }) {
  const card = 'absolute inset-0 rounded-wm-key transition-transform duration-300 ease-wm-out-strong motion-reduce:transition-none';
  return (
    <span aria-hidden className="relative block h-5.5 w-6.5 shrink-0">
      <i className={cn(card, tone.softBg, selected ? '-translate-x-1 translate-y-0.75 -rotate-14' : '-translate-x-0.5 translate-y-0.5 -rotate-8')} />
      <i className={cn(card, 'border-2 bg-wm-surface', tone.border, selected && '-translate-y-0.75')} />
    </span>
  );
}
