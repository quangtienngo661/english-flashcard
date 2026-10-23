'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { useTopicSuggestions, type TopicSuggestion } from './groups-api';

const TONES = ['bg-accent-soft', 'bg-success-soft', 'bg-primary-soft'] as const;

/** "Tạo nhóm nhanh theo chủ đề" (K/94, K/16; API (h), D17): hidden when the API suggests nothing (GH3). */
export function TopicSuggestions() {
  const t = useTranslations('App.groups');
  const locale = useLocale();
  const { data } = useTopicSuggestions();
  if (!data || data.items.length === 0) return null;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="topic-suggestions">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="topic-suggestions" className="text-title font-semibold text-ink">
          {t('suggestTitle')}
        </h2>
        <Link href={`/${locale}/app/lookup`} className="text-ui font-semibold text-primary underline underline-offset-2">
          {t('suggestAll')}
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.items.map((item, i) => (
          <SuggestionCard key={`${item.topic.code}-${item.level}`} item={item} tone={TONES[i % TONES.length]} />
        ))}
      </div>
    </section>
  );
}

function SuggestionCard({ item, tone }: { item: TopicSuggestion; tone: string }) {
  const t = useTranslations('App.groups');
  const locale = useLocale();
  const title = t('suggestCard', { topic: item.topic.name, level: item.level });
  return (
    <section aria-label={title} className={cn('flex flex-col gap-3 rounded-card p-4 shadow-ledge-soft', tone)}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-body font-semibold text-ink">{title}</h3>
        <span className="shrink-0 text-caption text-muted">{t('suggestCount', { count: item.count })}</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {item.samples.map((sample) => (
          <li key={sample.sense_id} className="flex min-w-0 items-baseline gap-2 rounded-sm bg-surface px-2.5 py-1.5">
            <span className="text-ui font-semibold text-ink">{sample.lemma}</span>
            {sample.meaning && <span className="truncate text-caption text-muted">{sample.meaning}</span>}
          </li>
        ))}
      </ul>
      <Link
        href={`/${locale}/app/topic?code=${encodeURIComponent(item.topic.code)}&level=${encodeURIComponent(item.level)}`}
        className="flex min-h-control w-fit items-center rounded-inner border-2 border-border-strong bg-surface px-4 text-ui font-semibold text-ink"
      >
        {t('suggestMore')}
      </Link>
    </section>
  );
}
