'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { FOCUS, TOC_MAX_HEIGHT, TOC_PHONE_CURRENT, TOC_PHONE_LIST_HEIGHT } from './styles';

type Section = { id: string; text: string };
type Labels = { heading: string; open: string };

/** A section counts as current once its heading is this far from the top of the screen (under the header, bar and phone pill). */
const CURRENT_LINE_PX = 160;

/**
 * "Mục lục" (`14:273` desktop, `17:328` phone): one `nav` of plain `#id` links.
 * - From lg: a 260 px card left of the article, sticky, the section being read filled `--accent-soft`.
 * - Below lg, with JS: a sticky pill ("Mục lục" + the current section + a chevron) that opens the list under it (a disclosure; the open
 *   state is not drawn, R225) and closes when a link is followed.
 * - Without JS (no `js` class on `html`): the heading and the list, not sticky, no current state; the links work as anchors.
 * Copy comes in as props: public pages send no messages to the client.
 */
export function LegalToc({ sections, labels }: { sections: Section[]; labels: Labels }) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const headings = sections.map((section) => document.getElementById(section.id)).filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;
    let frame = 0;
    const find = () => {
      frame = 0;
      let at = headings[0]!.id;
      for (const heading of headings) if (heading.getBoundingClientRect().top <= CURRENT_LINE_PX) at = heading.id;
      setCurrent(at);
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(find);
    };
    find();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [sections]);

  const currentText = sections.find((section) => section.id === current)?.text ?? sections[0]?.text;

  return (
    <nav
      aria-label={labels.heading}
      className={cn(
        'z-20 flex flex-col rounded-wm-card border border-wm-line bg-wm-surface shadow-wm-soft',
        'max-lg:[.js_&]:sticky max-lg:[.js_&]:top-15.75 md:max-lg:[.js_&]:top-17.75 max-lg:[.js_&]:backdrop-blur-wm-sm',
        'lg:sticky lg:top-24 lg:w-65 lg:shrink-0 lg:gap-1 lg:overflow-y-auto lg:border-0 lg:px-4 lg:py-5',
        TOC_MAX_HEIGHT,
      )}
    >
      <p className="px-3.5 pt-3 font-wm-sans text-wm-base-strong text-wm-ink max-lg:[.js_&]:hidden lg:p-0 lg:pb-1">{labels.heading}</p>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={labels.open}
        onClick={() => setOpen((was) => !was)}
        className={cn('hidden min-h-11 w-full items-center justify-between gap-3 rounded-wm-control px-3.5 py-3 text-left max-lg:[.js_&]:flex', FOCUS)}
      >
        <span className="flex min-w-0 flex-col">
          <span className="font-wm-sans text-wm-caption text-wm-muted">{labels.heading}</span>
          <span className={TOC_PHONE_CURRENT}>{currentText}</span>
        </span>
        <ChevronDown aria-hidden className={cn('size-5 shrink-0 text-wm-ink transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <ul
        id={listId}
        className={cn(
          'flex flex-col gap-1 px-2 pb-2 lg:p-0',
          open ? cn('max-lg:overflow-y-auto max-lg:border-t max-lg:border-wm-line max-lg:pt-2', TOC_PHONE_LIST_HEIGHT) : 'max-lg:[.js_&]:hidden',
        )}
      >
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={section.id === current ? 'location' : undefined}
              data-current={section.id === current ? '' : undefined}
              onClick={() => setOpen(false)}
              className={cn(
                'flex min-h-11 items-center rounded-wm-control px-2.5 py-1.5 font-wm-sans text-wm-small text-wm-muted transition-colors duration-200 hover:text-wm-ink lg:block lg:min-h-0',
                'data-current:bg-wm-accent-soft data-current:font-semibold data-current:text-wm-accent',
                FOCUS,
              )}
            >
              {section.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
