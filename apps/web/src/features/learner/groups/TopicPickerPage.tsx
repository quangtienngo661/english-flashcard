'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { BackLink } from '@/app-chrome/BackLink';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { useFormat } from '@/app-shell/format';
import { cn } from '@/lib/cn';
import { groupTone } from '@/lib/group-color';
import { Button } from '@/ui/Button';
import { Checkbox } from '@/ui/Checkbox';
import { Select } from '@/ui/Select';
import { Skeleton } from '@/ui/Skeleton';
import { TextButton } from '@/ui/TextButton';
import { showToast } from '@/ui/Toast';
import { FloatingBar } from './FloatingBar';
import { isId, useGroupMutations, useGroups, type BulkResult } from './groups-api';

type Sense = {
  sense_id: string;
  lemma: string;
  pos: string;
  level: string | null;
  meaning: { text: string };
  topics: Array<{ code: string; name: string }>;
};
type ItemState = { sense_id: string; group_ids: string[] };

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const PAGE = 100;
const NEW_DECK = 'new';
const FIRST_ROWS = 8;

/** K/18 `/app/topic?code=&level=`: every word of a topic at a level; add the ticked ones or the whole set (design §8.3). */
export function TopicPickerPage() {
  const t = useTranslations('App.topic');
  const locale = useLocale();
  const params = useSearchParams();
  const code = params.get('code') ?? '';
  const level = params.get('level') ?? '';
  const rawGroup = params.get('group');
  const groupId = isId(rawGroup) ? rawGroup.toLowerCase() : undefined;
  const valid = /^[a-z0-9-]+$/.test(code) && LEVELS.includes(level);
  return (
    <>
      <BackLink href={`/${locale}/app/groups`} label={t('back')} />
      {valid ? (
        <Picker code={code} level={level} groupId={groupId} />
      ) : (
        <h1 className="rounded-wm-card bg-wm-surface p-6 font-wm-display text-wm-card-title text-wm-ink shadow-wm-card">{t('notFound')}</h1>
      )}
    </>
  );
}

function Picker({ code, level, groupId }: { code: string; level: string; groupId?: string }) {
  const t = useTranslations('App.topic');
  const api = useApi();
  const errorText = useErrorMessage();
  const groups = useGroups().data?.items ?? [];
  const { createGroup, bulkAdd } = useGroupMutations();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [chosen, setChosen] = useState<string | null>(null);
  // Which button the press came from, read when the press runs (state set in the same handler is not visible yet).
  const addAll = useRef(false);
  const [pressedAll, setPressedAll] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const tCommon = useTranslations('App.common');
  const format = useFormat();

  // Every page of the topic (the API returns no total), then which of them the learner already learns, 100 ids a call.
  const data = useQuery({
    queryKey: ['topic-picker', code, level],
    queryFn: async () => {
      const senses: Sense[] = [];
      let token: string | null = null;
      do {
        const page: { items: Sense[]; next_page_token: string | null } = await api.get(
          `/v1/senses?topic=${encodeURIComponent(code)}&level=${level}&exclude_function_words=true&page_size=${PAGE}${token ? `&page_token=${encodeURIComponent(token)}` : ''}`,
        );
        senses.push(...page.items);
        token = page.next_page_token;
      } while (token);
      const learning = new Map<string, string[]>();
      for (let i = 0; i < senses.length; i += PAGE) {
        const ids = senses.slice(i, i + PAGE).map((s) => s.sense_id);
        const { items } = await api.get<{ items: ItemState[] }>(`/v1/items?sense_ids=${ids.join(',')}`);
        for (const item of items) learning.set(item.sense_id, item.group_ids);
      }
      return { senses, learning };
    },
  });

  const senses = data.data?.senses ?? [];
  const learning = data.data?.learning ?? new Map<string, string[]>();
  const topicName = senses[0]?.topics.find((tp) => tp.code === code)?.name ?? code;
  const title = t('title', { topic: topicName, level });
  const unlearned = senses.filter((s) => !learning.has(s.sense_id));
  const deckName = (ids: string[]) => ids.map((gid) => groups.find((g) => g.id === gid)?.name).filter(Boolean).join(', ');
  // A14-7–A14-8: prefer the requested deck when it exists, otherwise keep the topic default.
  const target = chosen ?? groups.find((g) => g.id === groupId)?.id ?? groups.find((g) => g.name === title)?.id ?? NEW_DECK;

  // Exactly the unlearned (or ticked) ids, 100 a request; each batch has its own key derived from the press.
  const add = useSubmitOnce(async (key) => {
    const ids = unlearned.filter((s) => addAll.current || selected.has(s.sense_id)).map((s) => s.sense_id);
    let deckId = target;
    let name = groups.find((g) => g.id === target)?.name ?? title;
    if (target === NEW_DECK) {
      const deck = await createGroup(title, `${key}:deck`);
      deckId = deck.id;
      name = deck.name;
      setChosen(deck.id);
    }
    const total: BulkResult = { added: 0, already_in_group: 0, skipped_function_words: 0, skipped_group_full: 0, skipped_not_found: 0 };
    for (let i = 0; i < ids.length; i += PAGE) {
      const result = await bulkAdd(deckId, { sense_ids: ids.slice(i, i + PAGE) }, `${key}:add:${i / PAGE}`);
      for (const field of Object.keys(total) as Array<keyof BulkResult>) total[field] += result[field];
    }
    return { result: total, name };
  });

  async function onAdd(all: boolean) {
    addAll.current = all;
    setPressedAll(all);
    try {
      const done = await add.submit();
      if (!done) return;
      const { result, name } = done;
      const skipped = result.already_in_group + result.skipped_group_full + result.skipped_not_found > 0;
      showToast(
        `${t('result', { added: result.added, name })}${skipped ? ` ${t('resultSkipped', { already: result.already_in_group, full: result.skipped_group_full, missing: result.skipped_not_found })}` : ''}`,
        'success',
      );
      setSelected(new Set());
      void data.refetch();
    } catch (error) {
      showToast(errorText(error), 'danger');
    }
  }

  const toggle = (senseId: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(senseId);
      else next.delete(senseId);
      return next;
    });
  const allTicked = unlearned.length > 0 && unlearned.every((s) => selected.has(s.sense_id));
  const rows = showAll ? senses : senses.slice(0, FIRST_ROWS);

  if (data.isPending) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <span className="sr-only">{tCommon('loading')}</span>
        <Skeleton className="h-11 w-64" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-wm-row" />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5 pb-48 md:pb-24">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-5">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-wm-meta text-wm-muted">{t('eyebrow')}</p>
          <h1 className="font-wm-display text-3xl font-extrabold leading-tight tracking-tight text-wm-ink wrap-anywhere md:text-5xl">{title}</h1>
          <p className="text-wm-base text-wm-muted">{t('intro', { count: senses.length })}</p>
        </div>
        <div className="flex shrink-0 flex-col md:items-end">
          <span className="font-wm-display text-5xl font-extrabold leading-none tracking-tight text-wm-ink md:text-6xl">{format.number(unlearned.length)}</span>
          <span className="text-wm-meta text-wm-muted">{t('countCaption', { learning: senses.length - unlearned.length })}</span>
        </div>
      </div>
      {unlearned.length > 0 && (
        <TextButton tone="normal" className="w-fit text-wm-button" isDisabled={add.busy} onPress={() => void onAdd(true)}>
          {t('addAll', { count: unlearned.length })}
        </TextButton>
      )}
      {senses.length === 0 ? (
        <p className="text-wm-base text-wm-muted">{t('none')}</p>
      ) : (
        <section className="rounded-wm-card border border-wm-line bg-wm-surface p-2 shadow-wm-card">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Checkbox isSelected={allTicked} onChange={(on) => setSelected(on ? new Set(unlearned.map((s) => s.sense_id)) : new Set())}>
              <span className="text-wm-button">{t('selectAll', { count: unlearned.length })}</span>
            </Checkbox>
            {selected.size > 0 && <span className="shrink-0 text-wm-meta text-wm-muted">{t('selected', { count: selected.size })}</span>}
          </div>
          <ul className="flex flex-col">
            {rows.map((s) => {
              const decks = learning.get(s.sense_id);
              const first = decks?.map((gid) => groups.find((g) => g.id === gid)).find(Boolean);
              return (
                <li
                  key={s.sense_id}
                  aria-label={s.lemma}
                  className={cn(
                    'flex flex-wrap items-center gap-x-4 gap-y-1 rounded-wm-row border-t border-wm-line px-4 py-3',
                    selected.has(s.sense_id) && 'bg-wm-accent/5',
                  )}
                >
                  {decks ? (
                    <span aria-hidden className="size-5 shrink-0 rounded-wm-key border-2 border-wm-ghost opacity-40" />
                  ) : (
                    <Checkbox isSelected={selected.has(s.sense_id)} onChange={(on) => toggle(s.sense_id, on)}>
                      <span className="sr-only">{t('select', { word: s.lemma })}</span>
                    </Checkbox>
                  )}
                  <span className={cn('min-w-0 flex-1', decks && 'opacity-50')}>
                    <span className="mr-2 font-wm-display text-wm-word text-wm-ink wrap-anywhere">{s.lemma}</span>
                    <span className="text-wm-meta text-wm-muted">{s.pos}</span>
                    <span className="block text-wm-small text-wm-muted wrap-anywhere">{s.meaning.text}</span>
                  </span>
                  {decks && (
                    <span className="flex w-full min-w-0 items-center gap-2 pl-9 text-wm-caption text-wm-muted md:w-auto md:max-w-1/2 md:pl-0">
                      {first && <span aria-hidden className={cn('size-2.25 shrink-0 rounded-wm-key', groupTone(first.id, first.total).bg)} />}
                      <span className="min-w-0 wrap-anywhere">{deckName(decks) ? t('learning', { groups: deckName(decks) }) : t('learningNoGroup')}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {!showAll && senses.length > FIRST_ROWS && (
            <TextButton className="mx-4 mb-1 mt-3" onPress={() => setShowAll(true)}>
              {t('more', { count: senses.length - FIRST_ROWS })}
            </TextButton>
          )}
        </section>
      )}
      {selected.size > 0 && (
        <FloatingBar label={t('selected', { count: selected.size })}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-full min-w-0 md:w-72">
              <Select
                label={t('addTo')}
                value={target}
                onChange={setChosen}
                items={[{ id: NEW_DECK, label: t('newGroup', { name: title }) }, ...groups.map((g) => ({ id: g.id, label: g.name }))]}
              />
            </div>
          </div>
          <Button isPending={add.busy && !pressedAll} onPress={() => void onAdd(false)}>
            {t('addSelected', { count: selected.size })}
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        </FloatingBar>
      )}
    </div>
  );
}
