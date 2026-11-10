'use client';

import { ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useTopicSuggestions } from './groups-api';

/** Rows shown on Hôm nay (Figma 117:4425 "Tạo nhóm nhanh theo chủ đề"). */
const ROWS = 4;

/** "Tạo nhóm nhanh theo chủ đề": the first topic suggestions as rows; hidden when the API suggests nothing (GH3). */
export function TopicSuggestions() {
  const t = useTranslations('App.groups');
  const locale = useLocale();
  const { data } = useTopicSuggestions();
  if (!data || data.items.length === 0) return null;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="topic-suggestions">
      <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-3">
        <h2 id="topic-suggestions" className="font-wm-display text-xl font-bold text-wm-ink md:text-2xl">
          {t('suggestTitle')}
        </h2>
        <Link href={`/${locale}/app/lookup`} className="text-wm-small-strong text-wm-accent outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-wm-accent">
          {t('suggestAll')}
        </Link>
      </div>
      <ul className="grid gap-x-7 gap-y-1.5 md:grid-cols-2">
        {data.items.slice(0, ROWS).map((item) => (
          <li key={`${item.topic.code}-${item.level}`} className="border-t border-wm-line">
            <Link
              href={`/${locale}/app/topic?code=${encodeURIComponent(item.topic.code)}&level=${encodeURIComponent(item.level)}`}
              className="flex min-h-11 items-center gap-3 px-0.5 py-3 outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-wm-accent"
            >
              <span className="min-w-0 flex-1 truncate font-wm-sans text-wm-button text-wm-ink">{t('suggestCard', { topic: item.topic.name, level: item.level })}</span>
              <span className="shrink-0 font-wm-mono text-wm-mono text-wm-muted">{t('suggestCount', { count: item.count })}</span>
              <ArrowRight aria-hidden className="size-4 shrink-0 text-wm-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
