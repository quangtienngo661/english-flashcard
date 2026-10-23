'use client';

import { Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import type { GroupSummary } from '../groups/groups-api';
import { GROUP_NAME_MAX } from '../groups/group-name';

type Props = {
  groups: GroupSummary[];
  value: string | null;
  onChange: (id: string) => void;
  /** "Tạo nhóm “du l”": make the deck and choose it. */
  onCreate: (name: string) => void;
  /** K/42c: nothing matches the typed name; the caller shows [Tạo nhóm và lưu] for it. */
  onUnmatched?: (name: string | null) => void;
  recentId: string | null;
};

const collator = new Intl.Collator('vi');

/** K/42, K/42b, K/42c, M/52: find or create a deck; "Dùng gần đây" first, then every deck A–Z with its size. */
export function GroupPicker({ groups, value, onChange, onCreate, onUnmatched, recentId }: Props) {
  const t = useTranslations('App.addWord');
  const [text, setText] = useState('');
  const box = useRef<HTMLInputElement>(null);
  const query = text.trim();
  const sorted = [...groups].sort((a, b) => collator.compare(a.name, b.name));
  const matches = query ? sorted.filter((g) => g.name.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))) : sorted;
  const exact = groups.some((g) => g.name.toLocaleLowerCase('vi') === query.toLocaleLowerCase('vi'));
  const recent = groups.filter((g) => g.id === recentId);

  function type(next: string) {
    setText(next);
    const q = next.trim();
    const unmatched = q.length > 0 && !groups.some((g) => g.name.toLocaleLowerCase('vi').includes(q.toLocaleLowerCase('vi')));
    onUnmatched?.(unmatched ? q.slice(0, GROUP_NAME_MAX) : null);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex min-h-control items-center gap-2 rounded-control bg-canvas px-3 focus-within:ring-2 focus-within:ring-primary">
        <Search aria-hidden className="size-4 shrink-0 text-muted" />
        <input
          ref={box}
          type="search"
          aria-label={t('search')}
          placeholder={t('search')}
          value={text}
          maxLength={GROUP_NAME_MAX}
          onChange={(e) => type(e.target.value)}
          className="min-w-0 flex-1 bg-transparent py-2 text-ui text-ink outline-none placeholder:text-placeholder"
        />
      </label>
      {query && !exact && matches.length > 0 && (
        <CreateRow label={t('createNamed', { name: query })} onPress={() => onCreate(query.slice(0, GROUP_NAME_MAX))} />
      )}
      {!query && <CreateRow label={t('createNew')} onPress={() => box.current?.focus()} />}
      {query ? (
        matches.length > 0 ? (
          <DeckList label={t('results', { count: matches.length })} groups={matches} value={value} onChange={onChange} />
        ) : (
          <p className="text-ui text-muted">{t('noneNamed', { name: query })}</p>
        )
      ) : (
        <>
          {recent.length > 0 && <DeckList label={t('recent')} groups={recent} value={value} onChange={onChange} />}
          <DeckList label={t('all', { count: groups.length })} groups={sorted} value={value} onChange={onChange} />
        </>
      )}
    </div>
  );
}

function CreateRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button type="button" onClick={onPress} className="flex items-center gap-2 rounded-inner px-1 py-1.5 text-left text-ui font-semibold text-primary outline-none hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary">
      <Plus aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 break-words">{label}</span>
    </button>
  );
}

function DeckList({ label, groups, value, onChange }: { label: string; groups: GroupSummary[]; value: string | null; onChange: (id: string) => void }) {
  const t = useTranslations('App.addWord');
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col">
      <p aria-hidden className="pb-1 text-caption font-semibold text-muted">
        {label}
      </p>
      {groups.map((g) => (
        <label
          key={g.id}
          className={cn('flex cursor-pointer items-center gap-3 border-b border-border px-1 py-2.5 last:border-b-0', value === g.id && 'font-semibold')}
        >
          <input type="radio" name={name} checked={value === g.id} onChange={() => onChange(g.id)} className="size-4 shrink-0 accent-primary" />
          <span className="min-w-0 flex-1 break-words text-ui text-ink">{g.name}</span>
          <span className="shrink-0 text-caption text-muted">{t('words', { count: g.total })}</span>
        </label>
      ))}
    </div>
  );
}
