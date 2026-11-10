'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { BackLink } from '@/app-chrome/BackLink';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useFormat } from '@/app-shell/format';
import { useApi } from '@/app-shell/session/session-context';
import { blockPronunciation, type PronLine } from '@/lib/speech/pronunciation';
import { Button } from '@/ui/Button';
import { Skeleton } from '@/ui/Skeleton';
import { SpeakButton, SpeakSentence } from '@/ui/SpeakButton';
import { EmptyState, ErrorState } from '@/ui/States';
import { TextButton } from '@/ui/TextButton';
import { AddSentenceSheet } from '../add-word/AddSentenceSheet';
import { useAddWord } from '../add-word/add-word-context';
import { useGroups } from '../groups/groups-api';
import { marked } from '../lookup/DictionaryPage';
import type { WordRow } from '../lookup/lookup-api';
import { FormsLine } from './FormsLine';
import { LearningBlock } from './LearningBlock';
import { DeleteMyWordDialog, EditMyWordDialog } from './MyWordDialogs';
import { SavedSentencesDialog } from './SavedSentencesDialog';
import { SenseBlock } from './SenseBlock';
import {
  levelRange, useSenseItems, useSentenceLists, useWordPage, wordHref, type ItemState, type PageSense, type WordPageData,
} from './word-api';

/** K/31–K/33, M/41 `/app/word?w=` (Figma 118:4413 / 118:4714): every meaning of a word by part of speech, its forms, what the learner learns of it. */
export function WordPage() {
  const t = useTranslations('App.word');
  const tc = useTranslations('App.common');
  const locale = useLocale();
  // At most 100 characters (the API's limit); dots only would be dropped by the URL parser and reach the word list instead (review I-3).
  const raw = [...(useSearchParams().get('w')?.trim() ?? '')].slice(0, 100).join('');
  const lemma = raw.length > 0 && !/^\.+$/.test(raw) ? raw : null;
  const page = useWordPage(lemma);
  const errorText = useErrorMessage();
  const notFound = lemma === null || (page.error instanceof ApiError && page.error.problem.status === 404);

  return (
    <>
      <BackLink href={`/${locale}/app/lookup`} label={t('back')} />
      {notFound ? (
        <EmptyState title={t('notFoundTitle', { word: raw })} body={t('notFoundBody')} action={<AddThis word={raw} />} />
      ) : page.data ? (
        <WordBody data={page.data} />
      ) : page.isError ? (
        <ErrorState message={errorText(page.error)} onRetry={() => void page.refetch()} />
      ) : (
        <div role="status" className="flex flex-col gap-4">
          <span className="sr-only">{tc('loading')}</span>
          <Skeleton className="h-14 w-60 max-w-full md:h-20" />
          <Skeleton className="h-60 rounded-wm-xl" />
        </div>
      )}
    </>
  );
}

const senseList = (data: WordPageData) => data.sections.flatMap((s) => s.senses);

/**
 * The page: head, tabs, meanings and "Câu bạn đã gặp" in the main column; "Bạn đang học" and "Cùng chủ đề" in the right column from
 * 1024 px. Below that the two columns dissolve (`contents`) and `order` puts "Bạn đang học" after the head and "Cùng chủ đề" last.
 */
function WordBody({ data }: { data: WordPageData }) {
  const t = useTranslations('App.word');
  const senses = senseList(data);
  const items = useSenseItems(senses.map((s) => s.sense_id)).data;
  const groups = useGroups().data?.items ?? [];
  const forms = data.inflections.map((i) => i.form);
  const learned = senses.filter((s) => items?.has(s.sense_id));
  const first = learned[0];
  const topic = senses.flatMap((s) => s.topics)[0];
  const sentenceTotal = senses.reduce((n, s) => n + s.sentence_count, 0);
  const showSentences = learned.length > 0 || sentenceTotal > 0;
  const groupName = (item: ItemState | undefined) => item?.group_ids.map((id) => groups.find((g) => g.id === id)?.name).find(Boolean);
  const hasForms = data.inflections.length > 0 || senses.some((s) => s.form_of);

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-7">
      <div className="contents lg:flex lg:min-w-0 lg:flex-1 lg:flex-col lg:gap-5">
        <div className="order-1 lg:order-none">
          <WordHead data={data} />
        </div>
        <nav aria-label={t('tabsLabel')} className="order-3 lg:order-none">
          <Tabs count={senses.length} sentences={showSentences ? sentenceTotal : null} forms={hasForms} topic={Boolean(topic)} />
        </nav>
        <div id="nghia" className="order-4 flex scroll-mt-24 flex-col gap-5 lg:order-none">
          {data.sections.map((section, s) => {
            const { perSense } = blockPronunciation(section.senses);
            return (
              <MeaningsOfPos key={`${section.pos}-${s}`} pos={section.pos} count={section.senses.length}>
                {section.senses.map((sense, i) => (
                  <SenseBlock
                    key={sense.sense_id}
                    index={i + 1}
                    sense={sense}
                    item={items?.get(sense.sense_id)}
                    groupName={groupName(items?.get(sense.sense_id))}
                    forms={forms}
                    ownLine={perSense.get(sense.sense_id)}
                  />
                ))}
              </MeaningsOfPos>
            );
          })}
        </div>
        {showSentences && (
          <div className="order-5 lg:order-none">
            <SeenSentences data={data} learned={learned} forms={forms} />
          </div>
        )}
      </div>
      <div className="contents lg:flex lg:w-80 lg:shrink-0 lg:flex-col lg:gap-4">
        {first && items && (
          <div className="order-2 lg:order-none">
            <LearningBlock sense={first} item={items.get(first.sense_id)!} groups={groups} />
          </div>
        )}
        {topic && (
          <div className="order-6 lg:order-none">
            <SameTopic topic={topic} lemma={data.lemma} senses={senses} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Figma head "Từ": the word (84 px, 56 px on phones) with "Từ của tôi" / "AI gợi ý", then per part of speech "UK /…/ 🔊  US /…/ 🔊"
 * (one US speaker with the learner's own IPA for a private sense), then the "dạng chia" rows. [Sửa từ] [Xóa từ] for the own word (R70).
 */
function WordHead({ data }: { data: WordPageData }) {
  const t = useTranslations('App.word');
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null);
  const senses = senseList(data);
  // K/88: "Từ của tôi" for the learner's own word, "AI gợi ý" while a meaning still comes as the AI suggested it.
  const own = senses.find((s) => s.scope === 'private');
  const aiSuggested = senses.some((s) => s.ai_suggested);
  const bases = [...new Set(senses.flatMap((s) => (s.form_of ? [s.form_of.lemma] : [])))];
  const onlyForms = senses.every((s) => s.form_of);
  const chip = 'rounded-wm-xs bg-wm-accent-soft px-1.5 py-0.5 font-wm-mono text-wm-mono text-wm-accent';

  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <h1 className="wd-title break-all font-wm-display text-wm-ink">{data.lemma}</h1>
        {own && <span className={chip}>{t('mine.label')}</span>}
        {aiSuggested && <span className={chip}>{t('mine.aiLabel')}</span>}
      </div>
      {aiSuggested && <p className="rounded-wm-md bg-wm-accent-soft px-3 py-2 font-wm-sans text-wm-small text-wm-ink">{t('mine.aiSource')}</p>}
      {own && (
        <div className="flex flex-wrap gap-x-5">
          <TextButton onPress={() => setDialog('edit')}>{t('mine.edit')}</TextButton>
          <TextButton tone="delete" onPress={() => setDialog('delete')}>
            {t('mine.delete')}
          </TextButton>
        </div>
      )}
      <div className="flex flex-col gap-3 md:gap-2">
        {data.sections.map((section, s) => (
          <PosReading key={`${section.pos}-${s}`} pos={section.pos} lemma={data.lemma} line={blockPronunciation(section.senses).shared} />
        ))}
        {(data.inflections.length > 0 || bases.length > 0) && (
          <div id="dang-chia" className="flex scroll-mt-24 flex-col gap-2">
            {data.inflections.length > 0 && <FormsLine label={t('forms')} base={data.lemma} forms={data.inflections} current={data.lemma} />}
            {bases.map((base) => (
              <BaseForms key={base} base={base} label={t(onlyForms ? 'formOf' : 'alsoFormOf', { base })} current={data.lemma} />
            ))}
          </div>
        )}
      </div>
      {own && dialog === 'edit' && <EditMyWordDialog sense={own} onClose={() => setDialog(null)} />}
      {own && dialog === 'delete' && <DeleteMyWordDialog sense={own} onClose={() => setDialog(null)} />}
    </header>
  );
}

/** One part of speech's reading (Đợt C §5.3: its first sense's; a sense read otherwise carries its own line in its row). */
function PosReading({ pos, lemma, line }: { pos: string; lemma: string; line: PronLine | null }) {
  if (!line) return null;
  const p = line.pronunciation;
  const voices = line.scope === 'private'
    ? [{ voice: 'us' as const, label: null, ipa: p.custom, audio: p.audio.us }]
    : [
        { voice: 'uk' as const, label: 'UK', ipa: p.uk, audio: p.audio.uk },
        { voice: 'us' as const, label: 'US', ipa: p.us, audio: p.audio.us },
      ];
  return (
    <div role="group" aria-label={pos} className="flex gap-3 md:items-center md:gap-4">
      <span className="w-10 shrink-0 pt-1 font-wm-mono text-wm-mono text-wm-accent md:w-19 md:pt-0">{pos}</span>
      <div className="flex min-w-0 flex-col gap-1 md:flex-row md:flex-wrap md:items-center md:gap-x-6">
        {voices.map((v) => (
          <span key={v.voice} className="inline-flex items-center gap-2">
            {v.label && <span className="font-wm-sans text-wm-small text-wm-muted">{v.label}</span>}
            {v.ipa && (
              <span translate="no" className="break-all font-wm-sans text-wm-base-strong text-wm-ink">
                /{v.ipa}/
              </span>
            )}
            <SpeakButton text={lemma} voice={v.voice} audioUrl={v.audio} size={28} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** "Là dạng chia của go: go · went · gone": the base word's own forms, read from its page. */
function BaseForms({ base, label, current }: { base: string; label: string; current: string }) {
  const page = useWordPage(base);
  return <FormsLine label={label} base={base} forms={page.data?.inflections ?? []} current={current} />;
}

/** Figma tabs (118:4512): jump links inside the page, with counts; they wrap on phones. */
function Tabs({ count, sentences, forms, topic }: { count: number; sentences: number | null; forms: boolean; topic: boolean }) {
  const t = useTranslations('App.word');
  const tabs = [
    { href: '#nghia', label: t('tabMeanings'), count },
    ...(sentences !== null ? [{ href: '#cau-da-gap', label: t('tabSentences'), count: sentences }] : []),
    ...(forms ? [{ href: '#dang-chia', label: t('tabForms'), count: null }] : []),
    ...(topic ? [{ href: '#cung-chu-de', label: t('tabTopic'), count: null }] : []),
  ];
  return (
    <ul className="flex flex-wrap gap-x-6 border-b border-wm-line">
      {tabs.map((tab, i) => (
        <li key={tab.href}>
          <a
            href={tab.href}
            className={
              i === 0
                ? '-mb-px flex items-baseline border-b-2 border-wm-ink py-3 font-wm-sans text-wm-button text-wm-ink outline-none focus-visible:outline-3 focus-visible:outline-wm-accent'
                : 'flex items-baseline py-3 font-wm-sans text-wm-button text-wm-muted outline-none hover:text-wm-ink focus-visible:outline-3 focus-visible:outline-wm-accent'
            }
          >
            {tab.label}
            {tab.count !== null && (
              <>
                {' '}
                <span className="ml-1.5 font-wm-mono text-wm-mono text-wm-muted">{tab.count}</span>
              </>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}

function MeaningsOfPos({ pos, count, children }: { pos: string; count: number; children: ReactNode }) {
  const t = useTranslations('App.word');
  const id = `pos-${pos}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <h2 id={id} className="font-wm-display text-wm-logo font-bold text-wm-ink">
          {pos}
        </h2>
        <span className="font-wm-mono text-wm-mono text-wm-muted">{t('senses', { count })}</span>
      </div>
      <div className="flex flex-col divide-y divide-wm-line rounded-wm-xl border border-wm-line bg-wm-surface px-4 py-0.5 shadow-wm-card md:px-6">
        {children}
      </div>
    </section>
  );
}

/**
 * Figma "Câu bạn đã gặp": every saved sentence of the word's meanings, newest first, with "nghĩa N · meaning · ghi ngày dd/mm/yyyy";
 * [Thêm câu đã gặp] opens Overlay 2, which asks for the meaning when more than one is being learned. One request per meaning with
 * sentences (R71).
 */
function SeenSentences({ data, learned, forms }: { data: WordPageData; learned: PageSense[]; forms: string[] }) {
  const t = useTranslations('App.word');
  const format = useFormat();
  const [dialog, setDialog] = useState<{ kind: 'add' } | { kind: 'list'; senseId: string } | null>(null);
  const numbered = data.sections.flatMap((s) => s.senses.map((sense, i) => ({ sense, n: i + 1 })));
  const withSentences = numbered.filter(({ sense }) => sense.sentence_count > 0);
  const lists = useSentenceLists(withSentences.map(({ sense }) => sense.sense_id));
  const rows = withSentences
    .flatMap(({ sense, n }, i) => (lists[i]?.data?.items ?? []).map((sentence) => ({ sentence, sense, n })))
    .sort((a, b) => b.sentence.created_at.localeCompare(a.sentence.created_at));
  const loaded = lists.every((q) => !q.isPending);

  return (
    <section id="cau-da-gap" aria-labelledby="cau-da-gap-title" className="flex scroll-mt-24 flex-col gap-3">
      <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-3">
        <h2 id="cau-da-gap-title" className="font-wm-display text-wm-logo font-bold text-wm-ink">
          {t('seenTitle')}
        </h2>
        <p className="font-wm-mono text-wm-mono text-wm-muted md:flex-1">{t('seenCaption')}</p>
        {learned.length > 0 && (
          <TextButton tone="add" className="self-start" onPress={() => setDialog({ kind: 'add' })}>
            {t('addSentence')}
          </TextButton>
        )}
      </div>
      <div className="rounded-wm-xl border border-wm-line bg-wm-surface px-4 py-0.5 shadow-wm-card md:px-6">
        {rows.length > 0 ? (
          <ul className="flex flex-col divide-y divide-wm-line">
            {rows.map(({ sentence, sense, n }) => (
              <li key={sentence.id} className="flex flex-col gap-1 py-4">
                <div className="flex items-start gap-1">
                  <p className="min-w-0 break-words font-wm-sans text-wm-small text-wm-ink">{marked(sentence.text, sense.lemma, forms)}</p>
                  <span className="shrink-0">
                    <SpeakSentence private text={sentence.text} />
                  </span>
                </div>
                <p className="font-wm-mono text-wm-mono text-wm-muted">
                  {t('seenMeta', { n, meaning: sense.meaning.text, date: format.date(sentence.created_at, 'numeric') })}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          loaded && <p className="py-4 font-wm-sans text-wm-small text-wm-muted">{t('noSentences')}</p>
        )}
      </div>
      {dialog?.kind === 'add' && learned[0] && (
        <AddSentenceSheet
          sense={learned[0]}
          senses={learned.length > 1 ? learned : undefined}
          onClose={() => setDialog(null)}
          onSeeAll={(senseId) => setDialog({ kind: 'list', senseId: senseId ?? learned[0].sense_id })}
        />
      )}
      {dialog?.kind === 'list' && <SavedSentencesDialog lemma={data.lemma} senseId={dialog.senseId} onClose={() => setDialog(null)} />}
    </section>
  );
}

/**
 * Figma "Cùng chủ đề" (159:5092): the topic, "trình độ A2 – B1" of the word, up to 8 other words of the topic
 * (`GET /v1/words?topic=`) and a link to the topic page at the lowest level of the word in that topic.
 */
function SameTopic({ topic, lemma, senses }: { topic: PageSense['topics'][number]; lemma: string; senses: PageSense[] }) {
  const t = useTranslations('App.word');
  const locale = useLocale();
  const api = useApi();
  const words = useQuery({
    queryKey: ['words', 'topic', topic.code],
    queryFn: () => api.get<{ items: WordRow[] }>(`/v1/words?page_size=8&topic=${encodeURIComponent(topic.code)}`),
    staleTime: 5 * 60_000,
  });
  const others = (words.data?.items ?? []).filter((w) => w.lemma !== lemma);
  const range = levelRange(senses);
  const inTopic = senses.filter((s) => s.topics.some((x) => x.code === topic.code));
  const level = (levelRange(inTopic) ?? range)?.split(' – ')[0];

  return (
    <section
      id="cung-chu-de"
      aria-label={t('sameTopic', { topic: topic.name })}
      className="flex scroll-mt-24 flex-col gap-4 rounded-wm-xl border border-wm-line bg-wm-surface p-4 shadow-wm-card md:p-6"
    >
      <div className="flex flex-col gap-2">
        <p className="font-wm-mono text-wm-mono text-wm-muted">{t('sameTopicLabel')}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-wm-md bg-wm-accent-soft px-3 py-0.5 font-wm-display text-wm-word text-wm-accent">{topic.name}</span>
          {range && <span className="font-wm-mono text-wm-mono text-wm-muted">{t('levelRange', { range })}</span>}
        </div>
      </div>
      {others.length > 0 && (
        <ul className="grid grid-cols-2 gap-1.5">
          {others.map((w) => (
            <li key={w.lemma} className="min-w-0">
              <Link
                href={wordHref(locale, w.lemma)}
                className="flex items-center justify-between gap-2 rounded-wm-md bg-wm-bg px-3 py-2 outline-none hover:bg-wm-accent-soft focus-visible:outline-3 focus-visible:outline-wm-accent"
              >
                <span className="min-w-0 truncate font-wm-sans text-wm-small-strong text-wm-ink">{w.lemma}</span>
                {w.level && (
                  <>
                    {' '}
                    <span className="shrink-0 font-wm-mono text-wm-mono text-wm-muted">{w.level}</span>
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {level && (
        <Link
          href={`/${locale}/app/topic?code=${encodeURIComponent(topic.code)}&level=${encodeURIComponent(level)}`}
          className="self-start font-wm-sans text-wm-small-strong text-wm-accent outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-wm-accent"
        >
          {t('seeTopic', { topic: topic.name })}
        </Link>
      )}
    </section>
  );
}

function AddThis({ word }: { word: string }) {
  const t = useTranslations('App.word');
  const { open } = useAddWord();
  return <Button onPress={() => open(word)}>{t('addThis')}</Button>;
}
