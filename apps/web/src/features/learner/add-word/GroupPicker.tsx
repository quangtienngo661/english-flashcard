'use client';

import { Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import { TEXT_BUTTON_BASE, TEXT_BUTTON_TONE } from '@/ui/TextButton';
import { cn } from '@/lib/cn';
import { groupTone } from '@/lib/group-color';
import { rhythm } from '../groups/carousel';
import type { GroupSummary } from '../groups/groups-api';
import { GROUP_NAME_MAX } from '../groups/group-name';
import { STAGE_KEYS } from '../groups/stages';

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

/**
 * K/42, K/42b, K/42c, M/52: find or create a deck; "Dùng gần đây" first, then every deck A–Z with its colour, its six stages and its
 * size (Figma Overlay 5, 124:5260). The list scrolls inside the dialog.
 */
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
          <DeckList label={t('results', { count: matches.length })} groups={matches} value={value} onChange={onChange} />
        ) : (
          <p className="font-wm-sans text-wm-small text-wm-muted">{t('noneNamed', { name: query })}</p>
        )
      ) : (
        <div className="-mx-1 flex max-h-88 flex-col gap-3 overflow-y-auto px-1">
          {recent.length > 0 && <DeckList label={t('recent')} groups={recent} value={value} onChange={onChange} />}
          <DeckList label={t('all', { count: groups.length })} groups={sorted} value={value} onChange={onChange} />
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

function DeckList({ label, groups, value, onChange }: { label: string; groups: GroupSummary[]; value: string | null; onChange: (id: string) => void }) {
  const t = useTranslations('App.addWord');
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-0.5">
      <p aria-hidden className="pb-1 text-wm-meta text-wm-muted">
        {label}
      </p>
      {groups.map((g) => (
        <label
          key={g.id}
          className={cn(
            'flex min-h-11 cursor-pointer items-center gap-3 rounded-wm-control px-3 py-2.5 hover:bg-wm-accent/4 has-focus-visible:outline-3 has-focus-visible:outline-wm-accent',
            value === g.id && 'bg-wm-accent/6',
          )}
        >
          <input type="radio" name={name} checked={value === g.id} onChange={() => onChange(g.id)} className="size-4.5 shrink-0 accent-wm-accent outline-none" />
          <span data-group-square aria-hidden className={cn('size-2.25 shrink-0 rounded-wm-key', groupTone(g.id, g.total).bg)} />
          <span className="min-w-0 flex-1 break-words font-wm-sans text-wm-base-strong text-wm-ink">{g.name}</span>
          {g.total > 0 && <MiniStages group={g} />}
          <span className="shrink-0 text-wm-meta text-wm-muted">{t('words', { count: g.total })}</span>
        </label>
      ))}
    </div>
  );
}

/** Stage 5's dot is a gradient, so the bar uses its flat colour; an empty stage stays grey. */
const STAGE_FILL = ['bg-wm-stage-0-dot', 'bg-wm-stage-1-dot', 'bg-wm-stage-2-dot', 'bg-wm-stage-3-dot', 'bg-wm-stage-4-dot', 'bg-wm-stage-5-solid'] as const;

/** The six stages of a deck in small (Figma: 8×5 segments, gap 2): which stages hold words. */
function MiniStages({ group }: { group: GroupSummary }) {
  const t = useTranslations('App.groups');
  const tStage = useTranslations('App.stages');
  const cells = rhythm(group.cells);
  return (
    <figure aria-label={t('rhythm')} className="m-0 flex shrink-0 gap-0.5">
      {cells.map((c) => (
        <span
          key={c.level}
          aria-label={`${tStage(STAGE_KEYS[c.level])}: ${c.total}`}
          className={cn('block h-1.25 w-2 rounded-wm-key', c.total > 0 ? STAGE_FILL[c.level] : 'bg-wm-ink/14')}
        />
      ))}
    </figure>
  );
}
