'use client';

import { FolderClosed, Layers, Plus, Search, Sparkles, type LucideIcon } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { AppCopy, LandingCopy } from '../copy';
import { AddWordDemo } from './AddWordDemo';
import { GroupsDemo } from './GroupsDemo';
import { LookupDemo } from './LookupDemo';
import { PracticeDemo } from './PracticeDemo';
import { ReviewCardDemo } from './ReviewCardDemo';

const TABS = ['review', 'groups', 'practice', 'lookup', 'addWord'] as const;
type TabKey = (typeof TABS)[number];
const ICONS = { review: Layers, groups: FolderClosed, practice: Sparkles, lookup: Search, addWord: Plus } satisfies Record<TabKey, LucideIcon>;

function Caption({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-title font-extrabold tracking-tight text-balance text-ink">{title}</h2>
      <p className="max-w-prose text-ui text-ink">{body}</p>
    </div>
  );
}

// The first screen's window onto the app (design landing-redesign §3): the app's own navy bar with its five main parts as tabs, and the
// part's real screen below with sample data. The first screen (Hero) shows the window's top three quarters and lets the next section lie over the rest
// (its lower quarter is blank), so what is inside is kept small and to the main visuals, at every width (owner 03/11/2026, mobile pass Q1).
// Below md the bar shows the four other tabs as icons sharing the width, and the open one by its name alone (Q2; at 320 px an icon beside the name
// would leave the others under 36 px); md to lg icons and names; from lg names only.
// All five panels stay in the DOM; the inactive ones are `hidden`, so the page reads without JS.
export function AppShowcase({ copy, app }: { copy: LandingCopy['showcase']; app: AppCopy }) {
  const [active, setActive] = useState<TabKey>('review');
  const base = useId();
  const refs = useRef<Partial<Record<TabKey, HTMLButtonElement | null>>>({});

  const select = (index: number) => {
    const key = TABS[(index + TABS.length) % TABS.length];
    setActive(key);
    refs.current[key]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const moves: Record<string, number | undefined> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: TABS.length - 1 };
    const to = moves[event.key];
    if (to === undefined) return;
    event.preventDefault();
    select(to);
  };

  const panel = (key: TabKey, caption: ReactNode, demo: ReactNode) => (
    <div
      key={key}
      role="tabpanel"
      id={`${base}-panel-${key}`}
      aria-labelledby={`${base}-tab-${key}`}
      hidden={active !== key}
      className="grid min-h-152 content-start gap-3 p-4 md:min-h-128 md:p-6 lg:p-5"
    >
      {caption}
      <div className="min-w-0">{demo}</div>
    </div>
  );

  return (
    <section id="tinh-nang" aria-label={copy.label} className="scroll-mt-16">
      <div className="overflow-hidden rounded-t-feature border-2 border-b-0 border-navy bg-canvas">
          <div className="flex items-center overflow-x-auto bg-navy p-1 text-on-navy no-scrollbar md:px-4 md:py-2.5 lg:px-5 lg:py-1">
            {/* From lg (the window then sits in the narrow right column) the icons make way, so that all five tabs fit without scrolling the bar (LR32, LR45). */}
            <div role="tablist" aria-label={copy.label} className="flex w-full md:w-auto md:gap-1">
              {TABS.map((key, index) => {
                const Icon = ICONS[key];
                const selected = active === key;
                return (
                  <button
                    key={key}
                    ref={(node) => {
                      refs.current[key] = node;
                    }}
                    type="button"
                    role="tab"
                    id={`${base}-tab-${key}`}
                    aria-selected={selected}
                    aria-controls={`${base}-panel-${key}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActive(key)}
                    onKeyDown={(event) => onKeyDown(event, index)}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-control px-2.5 text-ui whitespace-nowrap outline-none transition-transform duration-fast ease-out-strong focus-visible:ring-2 focus-visible:ring-accent motion-safe:active:scale-97 md:shrink-0 md:flex-none md:py-2.5 md:pr-2.5 md:pl-2 md:text-body lg:min-h-0 lg:px-2.5 lg:py-1 lg:text-ui',
                      selected ? 'shrink-0 bg-accent font-semibold text-on-accent' : 'min-w-0 flex-1 font-medium text-on-navy hover:bg-navy-raised',
                    )}
                  >
                    <Icon aria-hidden className={cn('size-5 shrink-0 lg:hidden', selected && 'max-md:hidden')} />
                    <span className={selected ? undefined : 'max-md:sr-only'}>{copy.tabs[key]}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {panel('review', <Caption title={copy.review.title} body={copy.review.body} />, <ReviewCardDemo copy={copy.review} app={app} />)}
          {panel('groups', <Caption title={copy.groups.title} body={copy.groups.body} />, <GroupsDemo copy={copy.groups} />)}
          {panel('practice', <Caption title={copy.practice.title} body={copy.practice.body} />, <PracticeDemo copy={copy.practice} app={app} />)}
          {panel('lookup', <Caption title={copy.lookup.title} body={copy.lookup.body} />, <LookupDemo copy={copy.lookup} />)}
          {panel('addWord', <Caption title={copy.addWord.title} body={copy.addWord.body} />, <AddWordDemo copy={copy.addWord} app={app} />)}
      </div>
    </section>
  );
}
