'use client';

import { useQueries } from '@tanstack/react-query';
import { Lightbulb } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { useApi } from '@/app-shell/session/session-context';
import { Button } from '@/ui/Button';
import { cn } from '@/lib/cn';
import { ButtonKey } from './QuestionCard';
import type { Item } from './use-practice-session';

type HintStep = { kind: 'definition' | 'example' | 'meaning' | 'first_letter'; text: string };
type LegacyLetters = { first_letter: string; length: number };
export type HintValue = HintStep | LegacyLetters;

/** The levels this question has, in order (Bước 7 design §8: up to three). */
export const hintLevels = (item: Item) => ([1, 2, 3] as const).filter((n) => item.hints_available[`level${n}`]);

// raw-ok: mockup L352 lays the hint rows on three columns: 24 px number, 112 px hint name, the content.
const GRID = 'grid grid-cols-[1.5rem_7rem_minmax(0,1fr)] items-center gap-x-3.5 gap-y-3';
// raw-ok: mockup L361 sets the first-letter hint in Bricolage 22 px with 0.12em tracking.
const MASK = 'font-wm-display text-wm-block-title tracking-[0.12em] text-wm-ink';

/**
 * K/63 "Gợi ý" box (copy doc §15 point 10; P.13, mockup L352-361): the title with progress dots at its right, then one row per level on
 * three columns (number, hint name, content); the next locked row has [Show hint N] (key H) in its content column. `POST …/hint` only
 * raises the item's level, so reading an opened level again (after a reload) is safe. First letter stays `e___` (QP3); only its font changes.
 */
export function HintPanel({ item, onOpen, locked }: { item: Item; onOpen: (level: number) => void; locked: boolean }) {
  const t = useTranslations('App.practice.session.hint');
  const api = useApi();
  const titleId = useId();
  const levels = hintLevels(item);
  const opened = levels.filter((n) => n <= item.hint_level);
  const hints = useQueries({
    queries: opened.map((level) => ({
      queryKey: ['practice', 'hint', item.item_id, level],
      queryFn: () => api.post<{ level: number; hint: HintValue }>(`/v1/practice/items/${item.item_id}/hint`, { level }),
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    })),
  });
  if (opened.length === 0) return null;
  const nextLevel = levels.find((n) => n > item.hint_level);
  return (
    <section aria-labelledby={titleId} className={cn(GRID, 'rounded-wm-card border border-wm-accent/22 bg-wm-accent-soft px-5 py-4.5')}>
      <div className="col-span-full flex items-center gap-2">
        <Lightbulb aria-hidden className="size-4 shrink-0 text-wm-ink" />
        <h3 id={titleId} className="text-wm-small-strong text-wm-ink">
          {t('progress', { opened: opened.length, total: levels.length })}
        </h3>
        <span aria-hidden className="ml-auto flex gap-1.5">
          {levels.map((n) => (
            <span key={n} className={cn('size-2 rounded-full border border-wm-ink', n <= item.hint_level && 'bg-wm-ink')} />
          ))}
        </span>
      </div>
      <ol className="col-span-full grid grid-cols-subgrid gap-y-3">
        {levels.map((n, index) => {
          const on = n <= item.hint_level;
          const value = on ? hints[index]?.data?.hint : undefined;
          return (
            <li key={n} className="col-span-full grid grid-cols-subgrid items-center">
              <span
                aria-hidden
                className={cn(
                  'flex size-6 items-center justify-center rounded-full border-2 border-wm-ink font-wm-sans text-wm-meta font-semibold',
                  on ? 'bg-wm-ink text-wm-surface' : 'text-wm-ink',
                )}
              >
                {n}
              </span>
              <span className={cn('text-wm-small-strong', value ? 'text-wm-ink' : 'text-wm-muted')}>
                {value ? ('kind' in value ? t(`kinds.${value.kind}`) : t('kinds.letters')) : t('locked', { n })}
              </span>
              <span className="min-w-0 break-words text-wm-small text-wm-ink">
                {value ? (
                  'kind' in value ? (
                    value.kind === 'first_letter' ? <span className={MASK}>{`${value.text}___`}</span> : value.text
                  ) : (
                    t('letters', { first: value.first_letter, length: value.length })
                  )
                ) : (
                  n === nextLevel &&
                  !locked && (
                    <Button variant="secondary" className="w-fit md:min-h-9 md:px-3" onPress={() => onOpen(n)}>
                      {t('open', { n })}
                      <ButtonKey>H</ButtonKey>
                    </Button>
                  )
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
