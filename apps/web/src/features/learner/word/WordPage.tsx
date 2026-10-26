'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/app-chrome/AppShell';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useApi } from '@/app-shell/session/session-context';
import { Button } from '@/app-ui/Button';
import { EmptyState, ErrorState, FullScreenSpinner } from '@/app-ui/States';
import { useAddWord } from '../add-word/add-word-context';
import type { WordRow } from '../lookup/lookup-api';
import { FormsLine } from './FormsLine';
import { LearningBlock } from './LearningBlock';
import { SenseBlock } from './SenseBlock';
import { levelRange, useSenseItems, useWordPage, wordHref, type PageSense, type WordPageData } from './word-api';

/** K/31–K/33, M/41 `/app/word?w=`: every meaning of a word by part of speech, its forms, what the learner learns of it. */
export function WordPage() {
  const t = useTranslations('App.word');
  const locale = useLocale();
  // At most 100 characters (the API's limit); dots only would be dropped by the URL parser and reach the word list instead (review I-3).
  const raw = [...(useSearchParams().get('w')?.trim() ?? '')].slice(0, 100).join('');
  const lemma = raw.length > 0 && !/^\.+$/.test(raw) ? raw : null;
  const page = useWordPage(lemma);
  const errorText = useErrorMessage();
  const notFound = lemma === null || (page.error instanceof ApiError && page.error.problem.status === 404);

  return (
    <AppShell
      variant="sub"
      back={{ href: `/${locale}/app/lookup`, label: t('back') }}
      aside={page.data ? <WordAside data={page.data} /> : undefined}
    >
      {notFound ? (
        <EmptyState title={t('notFoundTitle', { word: raw })} body={t('notFoundBody')} action={<AddThis word={raw} />} />
      ) : page.data ? (
        <WordBody data={page.data} />
      ) : page.isError ? (
        <ErrorState message={errorText(page.error)} onRetry={() => void page.refetch()} />
      ) : (
        <FullScreenSpinner />
      )}
    </AppShell>
  );
}

const senseList = (data: WordPageData) => data.sections.flatMap((s) => s.senses);

function WordBody({ data }: { data: WordPageData }) {
  const t = useTranslations('App.word');
  const senses = senseList(data);
  const items = useSenseItems(senses.map((s) => s.sense_id)).data;
  const forms = data.inflections.map((i) => i.form);
  const range = levelRange(senses);
  const bases = [...new Set(senses.flatMap((s) => (s.form_of ? [s.form_of.lemma] : [])))];
  const onlyForms = senses.every((s) => s.form_of);
  // K/88: "Từ của tôi" for the learner's own word, "AI gợi ý" while a meaning still comes as the AI suggested it.
  const mine = senses.some((s) => s.scope === 'private');
  const aiSuggested = senses.some((s) => s.ai_suggested);

  return (
    <section className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 shadow-ledge-soft md:p-8">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <h1 className="break-all text-display font-extrabold text-ink">{data.lemma}</h1>
        <div className="mb-2 flex gap-1.5">
          {range && <span className="rounded-sm bg-primary-soft px-1.5 py-0.5 text-caption font-semibold text-primary">{range}</span>}
          <span className="rounded-sm bg-neutral-soft px-1.5 py-0.5 text-caption font-semibold text-muted">{t('senses', { count: senses.length })}</span>
          {mine && <span className="rounded-sm bg-neutral-soft px-1.5 py-0.5 text-caption font-semibold text-ink">{t('mine.label')}</span>}
          {aiSuggested && <span className="rounded-sm bg-accent-soft px-1.5 py-0.5 text-caption font-semibold text-ink">{t('mine.aiLabel')}</span>}
        </div>
      </div>
      {aiSuggested && <p className="rounded-inner bg-accent-soft px-3 py-2 text-ui text-ink">{t('mine.aiSource')}</p>}
      {data.inflections.length > 0 && <FormsLine label={t('forms')} base={data.lemma} forms={data.inflections} current={data.lemma} />}
      {bases.map((base) => (
        <BaseForms key={base} base={base} label={t(onlyForms ? 'formOf' : 'alsoFormOf', { base })} current={data.lemma} />
      ))}
      <div className="flex flex-col divide-y divide-border">
        {senses.map((sense, i) => (
          <SenseBlock key={sense.sense_id} index={i + 1} sense={sense} item={items?.get(sense.sense_id)} forms={forms} />
        ))}
      </div>
    </section>
  );
}

/** "Là dạng chia của go: go · went · gone": the base word's own forms, read from its page. */
function BaseForms({ base, label, current }: { base: string; label: string; current: string }) {
  const page = useWordPage(base);
  return <FormsLine label={label} base={base} forms={page.data?.inflections ?? []} current={current} />;
}

function WordAside({ data }: { data: WordPageData }) {
  const senses = senseList(data);
  const items = useSenseItems(senses.map((s) => s.sense_id)).data;
  const learned = senses.find((s) => items?.has(s.sense_id));
  const topic = senses.flatMap((s) => s.topics)[0];
  return (
    <>
      {learned && items && <LearningBlock sense={learned} item={items.get(learned.sense_id)!} forms={data.inflections.map((i) => i.form)} />}
      {topic && <SameTopic topic={topic} lemma={data.lemma} />}
    </>
  );
}

/** "Cùng chủ đề: Hướng": a few other words of the word's first topic (`GET /v1/words?topic=`). */
function SameTopic({ topic, lemma }: { topic: PageSense['topics'][number]; lemma: string }) {
  const t = useTranslations('App.word');
  const locale = useLocale();
  const api = useApi();
  const words = useQuery({
    queryKey: ['words', 'topic', topic.code],
    queryFn: () => api.get<{ items: WordRow[] }>(`/v1/words?page_size=8&topic=${encodeURIComponent(topic.code)}`),
    staleTime: 5 * 60_000,
  });
  const others = (words.data?.items ?? []).filter((w) => w.lemma !== lemma);
  if (words.isSuccess && others.length === 0) return null;
  return (
    <section aria-label={t('sameTopic', { topic: topic.name })} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-ledge-soft">
      <h2 className="text-title font-semibold text-ink">{t('sameTopic', { topic: topic.name })}</h2>
      <div className="flex flex-wrap gap-2">
        {others.map((w) => (
          <Link key={w.lemma} href={wordHref(locale, w.lemma)} className="rounded-full border border-border-strong px-3 py-1 text-ui font-semibold text-ink hover:bg-primary-soft">
            {w.lemma}
          </Link>
        ))}
      </div>
    </section>
  );
}

function AddThis({ word }: { word: string }) {
  const t = useTranslations('App.word');
  const { open } = useAddWord();
  return (
    <Button variant="sticker" onPress={() => open(word)}>
      {t('addThis')}
    </Button>
  );
}
