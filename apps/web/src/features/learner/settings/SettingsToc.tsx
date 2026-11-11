'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/use-reduced-motion';

export type TocEntry = { id: string; title: string };

/**
 * The entry to mark (R153): the section pressed, until its scroll ends; at the bottom of the page the last section (it can never be
 * the first one in the band there); otherwise the first section inside the band. `null`: keep the current mark.
 */
export function currentSection(ids: readonly string[], visible: ReadonlySet<string>, atBottom: boolean, clicked: string | null): string | null {
  if (clicked !== null) return clicked;
  if (atBottom) return ids.at(-1) ?? null;
  return ids.find((id) => visible.has(id)) ?? null;
}

// A page that does not scroll is at its top, not its bottom.
const atPageBottom = () => window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1;
// Browsers without `scrollend` (and a press whose section is already in place, which scrolls nowhere) let the mark go after this.
const CLICK_HOLD_MS = 1000;

/**
 * "Mục lục" of Cài đặt (Figma 120:4349, desktop only): one link per section. The entry of the section nearest the top is marked
 * (`aria-current`, surface fill, card shadow); an IntersectionObserver and the scroll event follow the scroll (`currentSection`). Pressing an entry scrolls to its section
 * (at once under reduced motion) and moves focus to the section heading.
 */
export function SettingsToc({ entries }: { entries: TocEntry[] }) {
  const t = useTranslations('App.settings');
  const reduced = useReducedMotion();
  const [active, setActive] = useState(entries[0]?.id ?? '');
  const clicked = useRef<string | null>(null);
  const releaseClick = useRef<() => void>(() => {});

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const ids = entries.map((entry) => entry.id);
    const visible = new Set<string>();
    const update = () => {
      const next = currentSection(ids, visible, atPageBottom(), clicked.current);
      if (next) setActive(next);
    };
    // A band from under the top bar to the middle of the screen: the first section inside it is the one being read.
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (record.isIntersecting) visible.add(record.target.id);
          else visible.delete(record.target.id);
        }
        update();
      },
      { rootMargin: '-96px 0px -50% 0px' },
    );
    for (const entry of entries) {
      const section = document.getElementById(entry.id);
      if (section) observer.observe(section);
    }
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
      releaseClick.current();
    };
  }, [entries]);

  function go(event: MouseEvent<HTMLAnchorElement>, id: string) {
    const section = document.getElementById(id);
    if (!section) return;
    event.preventDefault();
    releaseClick.current();
    clicked.current = id;
    const release = () => {
      clicked.current = null;
      window.removeEventListener('scrollend', release);
      window.clearTimeout(timer);
      releaseClick.current = () => {};
    };
    const timer = window.setTimeout(release, CLICK_HOLD_MS);
    window.addEventListener('scrollend', release);
    releaseClick.current = release;
    setActive(id);
    section.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    document.getElementById(`${id}-title`)?.focus({ preventScroll: true });
  }

  return (
    <nav aria-label={t('toc')} className="hidden w-50 shrink-0 self-start lg:sticky lg:top-24 lg:block">
      <ul className="flex flex-col gap-0.5">
        {entries.map((entry) => {
          const current = entry.id === active;
          return (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                aria-current={current ? 'true' : undefined}
                onClick={(event) => go(event, entry.id)}
                className={cn(
                  'block rounded-wm-md px-3 py-2 font-wm-sans text-wm-small outline-none focus-visible:outline-3 focus-visible:outline-wm-accent',
                  current ? 'bg-wm-surface font-semibold text-wm-ink shadow-wm-card' : 'text-wm-muted hover:text-wm-ink',
                )}
              >
                {entry.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
