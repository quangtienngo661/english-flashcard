'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { MouseEvent, Ref } from 'react';
import { cn } from '@/lib/cn';
import { groupTone } from '@/lib/group-color';
import { stackDepth } from './carousel';
import { waiting } from './deck-actions';
import type { GroupSummary } from './groups-api';

/**
 * One group as a stack of cards (M3 Figma A §2.3, §4): the face plus up to three cards behind it. One design scaled with
 * `font-size` (the `.gstack` rules in globals.css are in `em`); `size` picks the base size: `today` (Hôm nay row), `carousel`
 * (Nhóm), `page` (Một nhóm head). The face shows the normal, done (nothing waiting) or empty (no word, dashed) state; the cards behind
 * sit lower, smaller and blurred (mockup L483-487).
 */
export function GroupStack({
  group,
  size,
  depth,
  href,
  onOpen,
  ref,
  className,
}: {
  group: GroupSummary;
  size: 'today' | 'carousel' | 'page' | 'lookup';
  /** Cards behind the face; defaults to `stackDepth(waiting)`. Empty groups have none. */
  depth?: number;
  /** Makes the group name a link that covers the whole card. */
  href?: string;
  /** Runs when the name link is pressed, before navigation (the open FLIP remembers the stack). */
  onOpen?: (event: MouseEvent<HTMLAnchorElement>) => void;
  ref?: Ref<HTMLDivElement>;
  className?: string;
}) {
  const t = useTranslations('App.stack');
  const count = waiting(group);
  const empty = group.total === 0;
  const tone = groupTone(group.id, group.total);
  const layers = empty ? 0 : Math.min(depth ?? stackDepth(count), stackDepth(count));
  const name = href ? (
    <Link href={href} prefetch onClick={onOpen} className="outline-none after:absolute after:inset-0 after:z-10 after:rounded-wm-dialog focus-visible:after:outline-3 focus-visible:after:outline-offset-2 focus-visible:after:outline-wm-accent">
      {group.name}
    </Link>
  ) : (
    group.name
  );
  return (
    <div ref={ref} className={cn('gstack', className)} data-size={size} data-layers={layers}>
      {[3, 2, 1].filter((n) => n <= layers).map((n) => (
        <div key={n} aria-hidden data-behind={n} className={cn('gstack-behind rounded-wm-dialog', tone.soft)} />
      ))}
      <div className={cn('gstack-face rounded-wm-dialog', tone.border)} data-empty={empty || undefined}>
        <p className="gstack-meta">{empty ? t('empty') : t('words', { count: group.total })}</p>
        <p className="gstack-name">{name}</p>
        <div className="gstack-grow" />
        {empty ? (
          <p className="gstack-state text-wm-muted">{t('noWords')}</p>
        ) : count > 0 ? (
          <p className="gstack-count">
            <b className={tone.ink}>{count}</b> <span>{t('waiting')}</span>
          </p>
        ) : (
          <p className="gstack-state text-wm-pass">{t('done')}</p>
        )}
        <Footer group={group} empty={empty} done={!empty && count === 0} />
      </div>
    </div>
  );
}

function Footer({ group, empty, done }: { group: GroupSummary; empty: boolean; done: boolean }) {
  const t = useTranslations('App.stack');
  if (empty) return <p className="gstack-foot">{t('addHint')}</p>;
  const word = done ? group.last_reviewed?.lemma : group.next_lemma;
  if (!word) return null;
  return (
    <p className="gstack-foot">
      <span>{done ? t('last') : t('next')}</span> <b>{word}</b>
    </p>
  );
}
