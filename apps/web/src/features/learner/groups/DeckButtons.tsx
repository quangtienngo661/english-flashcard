'use client';

import { Layers2, ListChecks } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { deckPlan } from './deck-actions';
import type { GroupSummary } from './groups-api';

const BASE =
  'relative z-10 flex items-center justify-center gap-2 whitespace-nowrap rounded-inner px-4 font-semibold outline-none transition duration-fast ease-standard focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-safe:active:translate-y-0.5 motion-safe:active:shadow-none';
const PRIMARY = 'border-2 border-accent bg-accent text-on-accent shadow-ledge-accent hover:brightness-95';
const SECONDARY = 'border-2 border-border-strong bg-surface text-ink shadow-button-secondary hover:bg-primary-soft';

/**
 * Học · Ôn of one deck (design đợt C §4.1, mockup `index.html`): two equal buttons with no count; the one with work waiting is
 * yellow. `size`: `card` on a deck card, `touch` on the Today hero and the deck page.
 */
export function DeckButtons({ group, size = 'touch', className }: { group: GroupSummary; size?: 'card' | 'touch'; className?: string }) {
  const t = useTranslations('App.deck');
  const locale = useLocale();
  const plan = deckPlan(group);
  if (plan.learn === null && plan.recall === null) return null;
  const height = size === 'card' ? 'min-h-control text-ui' : 'min-h-control-touch text-body';
  const two = plan.learn !== null && plan.recall !== null;
  return (
    <div className={cn('grid gap-3', two ? 'grid-cols-2' : 'grid-cols-1', className)}>
      {plan.learn !== null && (
        <Link
          href={`/${locale}/app/review?group=${group.id}&mode=${plan.learn}`}
          data-google-vignette="false"
          className={cn(BASE, height, plan.primary === 'learn' ? PRIMARY : SECONDARY)}
        >
          <Layers2 aria-hidden className="size-5 shrink-0" />
          {t('learn')}
        </Link>
      )}
      {plan.recall !== null && (
        <Link
          href={`/${locale}/app/recall?group=${group.id}`}
          data-google-vignette="false"
          className={cn(BASE, height, plan.primary === 'recall' ? PRIMARY : SECONDARY)}
        >
          <ListChecks aria-hidden className="size-5 shrink-0" />
          {plan.recall === 'due' ? t('recall') : t('recallExtra')}
        </Link>
      )}
    </div>
  );
}
