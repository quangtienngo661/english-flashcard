'use client';

import { Check, FolderClosed, Layers, Plus, Search, Sparkles, type LucideIcon } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
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

function Caption({ title, body, points }: { title: string; body: string; points: string[] }) {
  return (
    <div className="flex flex-col gap-3.5 lg:col-span-3">
      <h2 className="text-title-lg font-extrabold tracking-tight text-ink md:text-h2">{title}</h2>
      <p className="max-w-prose text-body text-ink">{body}</p>
      <ul className="flex flex-col gap-2 text-body text-ink">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2.5">
            <Check aria-hidden className="mt-1 size-4 shrink-0 text-success" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

// The first screen's window onto the app (design landing-redesign §3): the app's own navy bar with its five main parts as tabs, and the
// part's real screen below with sample data. All five panels stay in the DOM; the inactive ones are `hidden`, so the page reads without JS.
// The app's Logo reads App messages, which the app does not give client components, so the page renders it and passes it in as `logo`.
export function AppShowcase({ copy, app, logo }: { copy: LandingCopy['showcase']; app: AppCopy; logo: ReactNode }) {
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
      className="grid min-h-124 content-start gap-8 p-5 md:p-8 lg:grid-cols-8 lg:items-center lg:gap-14"
    >
      {caption}
      <div className="min-w-0 lg:col-span-5">{demo}</div>
    </div>
  );

  return (
    <section id="tinh-nang" aria-label={copy.label} className="scroll-mt-16 pt-8 md:pt-12">
      <Container>
        <div className="overflow-hidden rounded-t-feature border-2 border-b-0 border-navy bg-canvas">
          <div className="flex items-center gap-5 overflow-x-auto bg-navy px-4 py-2.5 text-on-navy no-scrollbar">
            <span aria-hidden className="shrink-0">
              {logo}
            </span>
            <div role="tablist" aria-label={copy.label} className="flex gap-1.5">
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
                      'flex shrink-0 cursor-pointer items-center gap-2 rounded-control py-2.5 pr-3.5 pl-3 text-body whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      selected ? 'bg-accent font-semibold text-on-accent' : 'font-medium text-on-navy hover:bg-navy-raised',
                    )}
                  >
                    <Icon aria-hidden className="size-5" />
                    {copy.tabs[key]}
                  </button>
                );
              })}
            </div>
          </div>
          {panel('review', <Caption title={copy.review.title} body={copy.review.body} points={[copy.review.p1, copy.review.p2]} />, <ReviewCardDemo copy={copy.review} app={app} />)}
          {panel('groups', <Caption title={copy.groups.title} body={copy.groups.body} points={[copy.groups.p1]} />, <GroupsDemo copy={copy.groups} />)}
          {panel('practice', <Caption title={copy.practice.title} body={copy.practice.body} points={[copy.practice.p1, copy.practice.p2]} />, <PracticeDemo copy={copy.practice} app={app} />)}
          {panel('lookup', <Caption title={copy.lookup.title} body={copy.lookup.body} points={[copy.lookup.p1]} />, <LookupDemo copy={copy.lookup} />)}
          {panel('addWord', <Caption title={copy.addWord.title} body={copy.addWord.body} points={[copy.addWord.p1]} />, <AddWordDemo copy={copy.addWord} app={app} />)}
        </div>
      </Container>
    </section>
  );
}
