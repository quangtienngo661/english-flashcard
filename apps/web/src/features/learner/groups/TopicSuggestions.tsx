'use client';

import { ArrowRight, Layers } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { Tag } from '@/ui/Tag';
import { useTopicSuggestions, type TopicSuggestion } from './groups-api';

/** Topics shown on Hôm nay (Figma 117:4425 "Tạo nhóm nhanh theo chủ đề"). */
const ROWS = 4;
/** Sample words printed under a topic name. */
const SAMPLES = 3;

/**
 * "Tạo nhóm nhanh theo chủ đề": the first topic suggestions as small cards (owner 10/11/2026: polish of the Figma rows), each with
 * its level, a few sample words and the word count; hidden when the API suggests nothing (GH3).
 */
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
      <ul className="grid gap-3 md:grid-cols-2">
        {data.items.slice(0, ROWS).map((item) => (
          <li key={`${item.topic.code}-${item.level}`}>
            <TopicCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TopicCard({ item }: { item: TopicSuggestion }) {
  const t = useTranslations('App.groups');
  const locale = useLocale();
  const title = t('suggestCard', { topic: item.topic.name, level: item.level });
  const count = t('suggestCount', { count: item.count });
  const samples = item.samples.slice(0, SAMPLES).map((s) => s.lemma);
  return (
    <Link
      href={`/${locale}/app/topic?code=${encodeURIComponent(item.topic.code)}&level=${encodeURIComponent(item.level)}`}
      aria-label={`${title}, ${count}`}
      className="group flex h-full items-center gap-3.5 rounded-wm-xl border border-wm-line bg-wm-surface p-3.5 shadow-wm-row outline-none transition duration-200 ease-out-strong hover:border-wm-accent/30 hover:shadow-wm-card focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent motion-safe:hover:-translate-y-0.5"
    >
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-wm-lg bg-wm-accent-soft text-wm-accent">
        <Layers className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-wm-display text-base font-bold text-wm-ink">{item.topic.name}</span>
          <Tag tone="accent" mono>
            {item.level}
          </Tag>
        </span>
        {samples.length > 0 && <span className="truncate text-wm-caption text-wm-muted">{samples.join(', ')}…</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="font-wm-mono text-wm-mono text-wm-muted">{count}</span>
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-wm-pill bg-wm-bg text-wm-muted transition duration-200 ease-out-strong group-hover:bg-wm-accent group-hover:text-wm-on-accent"
        >
          <ArrowRight className="size-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5" />
        </span>
      </span>
    </Link>
  );
}
