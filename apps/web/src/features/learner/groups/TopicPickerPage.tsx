'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AppShell } from '@/app-chrome/AppShell';
import { PageTitle } from '@/app-chrome/PageTitle';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { Checkbox } from '@/app-ui/Checkbox';
import { Select } from '@/app-ui/Select';
import { FullScreenSpinner, NotFoundState } from '@/app-ui/States';
import { showToast } from '@/app-ui/Toast';
import { useGroupMutations, useGroups, type BulkBody } from './groups-api';

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

/** K/18 `/app/topic?code=&level=`: every word of a topic at a level; add the ticked ones or the whole set (design §8.3). */
export function TopicPickerPage() {
  const t = useTranslations('App.topic');
  const locale = useLocale();
  const params = useSearchParams();
  const code = params.get('code') ?? '';
  const level = params.get('level') ?? '';
  const valid = /^[a-z0-9-]+$/.test(code) && LEVELS.includes(level);
  return (
    <AppShell variant="sub" back={{ href: `/${locale}/app/groups`, label: t('back') }}>
      {valid ? <Picker code={code} level={level} /> : <NotFoundState title={t('notFound')} />}
    </AppShell>
  );
}

function Picker({ code, level }: { code: string; level: string }) {
  const t = useTranslations('App.topic');
  const api = useApi();
  const errorText = useErrorMessage();
  const groups = useGroups().data?.items ?? [];
  const { createGroup, bulkAdd } = useGroupMutations();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState(NEW_DECK);

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

  const add = useSubmitOnce(async (key) => {
    const body: BulkBody =
      selected.size > 0
        ? { sense_ids: unlearned.filter((s) => selected.has(s.sense_id)).map((s) => s.sense_id) }
        : unlearned.length <= PAGE
          ? { sense_ids: unlearned.map((s) => s.sense_id) }
          : { topic: code, level };
    let deckId = target;
    let name = groups.find((g) => g.id === target)?.name ?? title;
    if (target === NEW_DECK) {
      const deck = await createGroup(title, `${key}:deck`);
      deckId = deck.id;
      name = deck.name;
    }
    return { result: await bulkAdd(deckId, body, `${key}:add`), name };
  });

  async function onAdd(all: boolean) {
    if (all) setSelected(new Set());
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

  if (data.isPending) return <FullScreenSpinner />;
  return (
    <div className="flex flex-col gap-4 pb-28">
      <PageTitle>{title}</PageTitle>
      <p className="-mt-3 text-body text-muted">{t('intro', { count: senses.length })}</p>
      {senses.length === 0 ? (
        <p className="text-body text-muted">{t('none')}</p>
      ) : (
        <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <Checkbox isSelected={allTicked} onChange={(on) => setSelected(on ? new Set(unlearned.map((s) => s.sense_id)) : new Set())}>
              {t('selectAll', { count: unlearned.length })}
            </Checkbox>
            {selected.size > 0 && <span className="text-ui font-semibold text-primary">{t('selected', { count: selected.size })}</span>}
          </div>
          <ul className="divide-y divide-border">
            {senses.map((s) => {
              const decks = learning.get(s.sense_id);
              return (
                <li key={s.sense_id} aria-label={s.lemma} className="flex items-center gap-3 py-2.5">
                  {decks ? (
                    <span className="w-5 shrink-0" />
                  ) : (
                    <Checkbox isSelected={selected.has(s.sense_id)} onChange={(on) => toggle(s.sense_id, on)}>
                      <span className="sr-only">{t('select', { word: s.lemma })}</span>
                    </Checkbox>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="mr-2 break-all text-ui font-semibold text-ink">{s.lemma}</span>
                    <span className="text-caption text-muted">{s.pos}</span>
                    <span className="block break-words text-caption text-ink">{s.meaning.text}</span>
                  </span>
                  {decks ? (
                    <span className="min-w-0 max-w-1/2 break-words rounded-inner bg-neutral-soft px-2 py-0.5 text-right text-caption text-muted">
                      {deckName(decks) ? t('learning', { groups: deckName(decks) }) : t('learningNoGroup')}
                    </span>
                  ) : (
                    <span className="shrink-0 text-caption text-muted">{s.level}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {unlearned.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface md:bottom-0">
          <div className="mx-auto flex max-w-360 flex-wrap items-end gap-3 px-4 py-3 lg:px-8">
            <div className="w-full min-w-0 sm:w-72">
              <Select
                label={t('addTo')}
                value={target}
                onChange={setTarget}
                items={[{ id: NEW_DECK, label: t('newGroup', { name: title }) }, ...groups.map((g) => ({ id: g.id, label: g.name }))]}
              />
            </div>
            <Button variant="quiet" size="lg" isPending={add.busy && selected.size === 0} onPress={() => void onAdd(true)}>
              {t('addAll', { count: unlearned.length })}
            </Button>
            <Button variant="sticker" size="lg" isPending={add.busy && selected.size > 0} isDisabled={selected.size === 0} onPress={() => void onAdd(false)}>
              {t('addSelected', { count: selected.size })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
