'use client';

import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { ButtonLink } from '@/ui/ButtonLink';
import { deckPlan } from './deck-actions';
import type { GroupSummary } from './groups-api';

/**
 * Học · Ôn of one group (design đợt C §4.1, giao diện mới §9 M3, Figma "Nút" 3:12): two equal buttons with no count; the one
 * with work waiting is the navy primary, the other secondary. Width comes from the caller (148 px in Figma).
 */
export function DeckButtons({ group, className, buttonClassName }: { group: GroupSummary; className?: string; buttonClassName?: string }) {
  const t = useTranslations('App.deck');
  const locale = useLocale();
  const plan = deckPlan(group);
  if (plan.learn === null && plan.recall === null) return null;
  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      {plan.learn !== null && (
        <ButtonLink
          href={`/${locale}/app/review?group=${group.id}&mode=${plan.learn}`}
          data-google-vignette="false"
          variant={plan.primary === 'learn' ? 'primary' : 'secondary'}
          className={buttonClassName}
        >
          {t('learn')}
        </ButtonLink>
      )}
      {plan.recall !== null && (
        <ButtonLink
          href={`/${locale}/app/recall?group=${group.id}`}
          data-google-vignette="false"
          variant={plan.primary === 'recall' ? 'primary' : 'secondary'}
          className={buttonClassName}
        >
          {plan.recall === 'due' ? t('recall') : t('recallExtra')}
        </ButtonLink>
      )}
    </div>
  );
}
