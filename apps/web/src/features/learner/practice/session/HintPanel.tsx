'use client';

import { useQueries } from '@tanstack/react-query';
import { Lightbulb } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useApi } from '@/app-shell/session/session-context';
import { Button } from '@/app-ui/Button';
import { cn } from '@/lib/cn';
import { KBD } from './QuestionCard';
import type { Item } from './use-practice-session';

type HintStep = { kind: 'definition' | 'example' | 'meaning' | 'first_letter'; text: string };
type LegacyLetters = { first_letter: string; length: number };
export type HintValue = HintStep | LegacyLetters;

/** The levels this question has, in order (Bước 7 design §8: up to three). */
export const hintLevels = (item: Item) => ([1, 2, 3] as const).filter((n) => item.hints_available[`level${n}`]);

/**
 * K/63 "Gợi ý" box (copy doc §15 point 10): one numbered row per level; opened rows show their text, the next one has
 * [Mở gợi ý N] (key H). `POST …/hint` only raises the item's level, so reading an opened level again (after a reload) is safe.
 */
export function HintPanel({ item, onOpen, locked }: { item: Item; onOpen: (level: number) => void; locked: boolean }) {
  const t = useTranslations('App.practice.session.hint');
  const api = useApi();
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
    <section className="flex flex-col gap-2 rounded-inner bg-accent-soft p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-ui font-semibold text-ink">
          <Lightbulb aria-hidden className="size-4" />
          {t('progress', { opened: opened.length, total: levels.length })}
        </h3>
        <span aria-hidden className="flex gap-1">
          {levels.map((n) => (
            <span key={n} className={cn('size-2 rounded-full border border-ink', n <= item.hint_level && 'bg-ink')} />
          ))}
        </span>
      </div>
      <ol className="flex flex-col gap-2">
        {levels.map((n, index) => {
          const value = n <= item.hint_level ? hints[index]?.data?.hint : undefined;
          return (
            <li key={n} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span className="flex shrink-0 items-center gap-2 text-caption font-semibold text-ink sm:w-44">
                <span className={cn('flex size-5 items-center justify-center rounded-full border border-ink', n <= item.hint_level && 'bg-ink text-surface')}>{n}</span>
                {value ? ('kind' in value ? t(`kinds.${value.kind}`) : t('kinds.letters')) : t('locked', { n })}
              </span>
              {value ? (
                <span className="min-w-0 break-words text-ui text-ink">
                  {'kind' in value ? value.text : t('letters', { first: value.first_letter, length: value.length })}
                </span>
              ) : (
                n === nextLevel &&
                !locked && (
                  <Button variant="quiet" className="w-fit" onPress={() => onOpen(n)}>
                    {t('open', { n })}
                    <kbd className={`${KBD} border-border-strong`}>H</kbd>
                  </Button>
                )
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
