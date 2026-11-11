'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, type MouseEvent } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/use-reduced-motion';

export type TocEntry = { id: string; title: string };

/**
 * "Mục lục" of Cài đặt (Figma 120:4349, desktop only): one link per section. The entry of the section nearest the top is marked
 * (`aria-current`, surface fill, card shadow); an IntersectionObserver follows the scroll. Pressing an entry scrolls to its section
 * (at once under reduced motion) and moves focus to the section heading.
 */
export function SettingsToc({ entries }: { entries: TocEntry[] }) {
  const t = useTranslations('App.settings');
  const reduced = useReducedMotion();
  const [active, setActive] = useState(entries[0]?.id ?? '');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const visible = new Set<string>();
    // A band from under the top bar to the middle of the screen: the first section inside it is the one being read.
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (record.isIntersecting) visible.add(record.target.id);
          else visible.delete(record.target.id);
        }
        const first = entries.find((entry) => visible.has(entry.id));
        if (first) setActive(first.id);
      },
      { rootMargin: '-96px 0px -50% 0px' },
    );
    for (const entry of entries) {
      const section = document.getElementById(entry.id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, [entries]);

  function go(event: MouseEvent<HTMLAnchorElement>, id: string) {
    const section = document.getElementById(id);
    if (!section) return;
    event.preventDefault();
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
