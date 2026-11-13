'use client';

import { useTranslations } from 'next-intl';
import { Focusable, OverlayArrow, Tooltip, TooltipTrigger } from 'react-aria-components';
import { cn } from '@/lib/cn';
import { LEVEL_FILL, LEVELS, useLevelInterval, useLevelName } from './levels';

/**
 * Words per level as a bar and a legend (mockup L185-193): one segment per non-empty level, wide in proportion to its count, 3 px apart;
 * the segments grow in from the left (700 ms, none under reduced motion). The legend below names every level with its count, in full.
 * Hovering or focusing a segment shows the level name, the count and the review interval. `counts` has six entries, level 0 first.
 */
export function LevelBar({ counts, size = 'md', centered = false }: { counts: readonly number[]; size?: 'md' | 'lg'; centered?: boolean }) {
  const t = useTranslations('App.levels');
  const tWords = useTranslations('App.stack');
  const levelName = useLevelName();
  const levelInterval = useLevelInterval();
  const total = counts.reduce((sum, c) => sum + c, 0);

  return (
    <figure aria-label={t('bar')} className="m-0 flex w-full flex-col gap-2">
      <div className={cn('flex gap-0.75', size === 'lg' ? 'h-3' : 'h-2.5')}>
        {total === 0 && <span aria-hidden className="block flex-1 rounded-wm-key bg-wm-line" />}
        {LEVELS.map((level) => {
          const count = counts[level] ?? 0;
          if (count <= 0) return null;
          const tip = [levelName(level), tWords('words', { count }), levelInterval(level)].filter(Boolean).join(' · ');
          return (
            <TooltipTrigger key={level} delay={0} closeDelay={100}>
              <Focusable>
                <span
                  role="img"
                  aria-label={tip}
                  className={cn(
                    'block min-w-0 origin-left rounded-wm-key outline-none motion-safe:animate-wm-bar-grow focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent',
                    LEVEL_FILL[level],
                  )}
                  // raw-ok: the segment width is its count, its delay follows its level
                  style={{ flexGrow: count, flexBasis: 0, animationDelay: `${level * 60}ms` }}
                />
              </Focusable>
              <Tooltip
                offset={8}
                className="group rounded-wm-row bg-wm-ink px-3 py-2 font-wm-sans text-wm-small text-wm-surface shadow-wm-pop motion-safe:data-entering:animate-wm-feedback-in"
              >
                <OverlayArrow>
                  <svg aria-hidden width={10} height={6} viewBox="0 0 10 6" className="fill-wm-mark-ink group-placement-bottom:rotate-180">
                    <path d="M0 0 L5 6 L10 0" />
                  </svg>
                </OverlayArrow>
                {tip}
              </Tooltip>
            </TooltipTrigger>
          );
        })}
      </div>
      <ul aria-label={t('bar')} className={cn('flex flex-wrap gap-y-1 text-wm-meta text-wm-muted', centered ? 'mx-auto max-w-115 justify-center gap-x-3' : 'gap-x-3.5')}>
        {LEVELS.map((level) => (
          <li key={level} className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span aria-hidden className={cn('size-2 shrink-0 rounded-wm-key', LEVEL_FILL[level])} />
            <b className="font-bold tabular-nums text-wm-ink">{counts[level] ?? 0}</b> {levelName(level)}
          </li>
        ))}
      </ul>
    </figure>
  );
}
