'use client';

import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

export type TabItem = { id: string; label: string; count?: number };

type Props = {
  items: TabItem[];
  selected: string;
  /** Names the tablist or the nav. */
  label?: string;
} & ({ onSelect: (id: string) => void; hrefs?: never } | { hrefs: Record<string, string>; onSelect?: never });

const ITEM =
  '-mb-px flex items-baseline border-b-2 py-2.5 font-wm-sans text-wm-button outline-none focus-visible:outline-3 focus-visible:outline-wm-accent';
const ON = 'border-wm-accent text-wm-ink';
const OFF = 'border-transparent text-wm-muted hover:text-wm-ink';

function Label({ item }: { item: TabItem }) {
  return (
    <>
      {item.label}
      {item.count !== undefined && (
        <>
          {' '}
          <span className="ml-1 text-wm-meta text-wm-muted">{item.count}</span>
        </>
      )}
    </>
  );
}

/**
 * Underline tabs (mockup L174-177): 24 px apart, the selected one in ink over a 2 px accent line, the count in the label style.
 * With `onSelect` a tablist of buttons: arrow keys, Home and End move the selection and the focus (one tab stop). With `hrefs` a nav of
 * links (the word page's jump links); the selected link is `aria-current`.
 */
export function Tabs({ items, selected, label, onSelect, hrefs }: Props) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  if (hrefs) {
    return (
      <nav aria-label={label}>
        <ul className="flex flex-wrap gap-x-6 border-b border-wm-line">
          {items.map((item) => (
            <li key={item.id}>
              <a href={hrefs[item.id]} aria-current={item.id === selected ? 'location' : undefined} className={cn(ITEM, item.id === selected ? ON : OFF)}>
                <Label item={item} />
              </a>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  const move = (event: KeyboardEvent, index: number) => {
    const last = items.length - 1;
    const keys: Record<string, number> = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last };
    const next = keys[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onSelect?.(items[next].id);
    refs.current[next]?.focus();
  };

  // One tab stop even when `selected` names no tab.
  const stop = items.some((item) => item.id === selected) ? selected : items[0]?.id;
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-x-6 border-b border-wm-line">
      {items.map((item, i) => {
        const on = item.id === selected;
        return (
          <button
            key={item.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={item.id === stop ? 0 : -1}
            onClick={() => onSelect?.(item.id)}
            onKeyDown={(event) => move(event, i)}
            className={cn(ITEM, on ? ON : OFF)}
          >
            <Label item={item} />
          </button>
        );
      })}
    </div>
  );
}
