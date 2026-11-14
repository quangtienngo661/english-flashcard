'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { BackLink } from '@/app-chrome/BackLink';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useFormat } from '@/app-shell/format';
import { useApi } from '@/app-shell/session/session-context';
import { cn } from '@/lib/cn';
import { groupTone } from '@/lib/group-color';
import { shownPos } from '@/lib/pos';
import { Button } from '@/ui/Button';
import { Checkbox } from '@/ui/Checkbox';
import { Select } from '@/ui/Select';
import { Skeleton } from '@/ui/Skeleton';
import { ErrorState } from '@/ui/States';
import { TextButton } from '@/ui/TextButton';
import { showToast } from '@/ui/Toast';
import { FloatingBar } from './FloatingBar';
import { GROUP_NAME_MAX } from './group-name';
import { groupError, isId, useGroups } from './groups-api';
import { TOPIC_LEVELS, topicPageKey, topicPageOptions, useTopicPage, useTopicSummary, type TopicScope } from './topic-picker-api';
import { useTopicAdd } from './use-topic-add';

const NEW_DECK = 'new';

export function TopicPickerPage() {
  const t = useTranslations('App.topic');
  const locale = useLocale();
  const params = useSearchParams();
  const topic = params.get('code') ?? '';
  const level = TOPIC_LEVELS.find((value) => value === params.get('level'));
  const group = params.get('group');
  return (
    <>
      <BackLink href={`/${locale}/app/groups`} label={t('back')} />
      {level && /^[a-z0-9-]+$/.test(topic) ? (
        <Picker key={`${locale}:${topic}:${level}`} scope={{ topic, level }} requestedGroup={group} />
      ) : (
        <h1 className="rounded-wm-card bg-wm-surface p-6 font-wm-display text-wm-card-title text-wm-ink shadow-wm-card">{t('notFound')}</h1>
      )}
    </>
  );
}

type Cursor = string | null;
type PageError = { tokens: Cursor[]; message: string };
type Selection = Map<string, { page: number; row: number }>;

function Picker({ scope, requestedGroup }: { scope: TopicScope; requestedGroup: string | null }) {
  const t = useTranslations('App.topic');
  const tCommon = useTranslations('App.common');
  const tLookup = useTranslations('App.lookup');
  const format = useFormat();
  const errorText = useErrorMessage();
  const api = useApi();
  const client = useQueryClient();
  const [tokens, setTokens] = useState<Cursor[]>([null]);
  const [paging, setPaging] = useState(false);
  const moving = useRef(false);
  const [pageError, setPageError] = useState<PageError | null>(null);
  const [selected, setSelected] = useState<Selection>(new Map());
  const [targetChoice, setTargetChoice] = useState<{ requested: string | null; id: string; createdName?: string }>();
  const [rejected, setRejected] = useState<{ requested: string | null; id: string; message: string }>();
  const [lastLearning, setLastLearning] = useState<Map<string, string[]>>();

  const page = useTopicPage(scope, tokens.at(-1) ?? null);
  const summary = useTopicSummary(scope);
  const groupsQuery = useGroups();
  const groups = groupsQuery.data?.items ?? [];
  const senses = page.data?.items ?? [];
  const learning = page.data?.learning;
  if (learning && learning !== lastLearning) {
    setLastLearning(learning);
    if ([...learning.keys()].some((sid) => selected.has(sid))) {
      setSelected(new Map([...selected].filter(([sid]) => !learning.has(sid))));
    }
  }

  const topicName = senses[0]?.topics.find((topic) => topic.code === scope.topic)?.name ?? scope.topic;
  const title = t('title', { topic: topicName, level: scope.level });
  const newGroupName = t('title', {
    topic: [...topicName.trim().normalize('NFC')].slice(0, GROUP_NAME_MAX - [...scope.level].length - 3).join('').trimEnd(),
    level: scope.level,
  });
  const matchedGroup = groups.find((group) => group.name.toLowerCase() === newGroupName.toLowerCase());
  const fromURL = isId(requestedGroup) ? requestedGroup.toLowerCase() : undefined;
  const choice = targetChoice?.requested === requestedGroup ? targetChoice : undefined;
  const desiredTarget = choice?.id ?? (requestedGroup === null ? (matchedGroup?.id ?? NEW_DECK) : fromURL);
  const rejection = rejected?.requested === requestedGroup && rejected.id === (desiredTarget ?? '') ? rejected.message : undefined;
  const targetGroup = groups.find((group) => group.id === desiredTarget);
  const targetMissing = groupsQuery.isSuccess && (desiredTarget === undefined || (desiredTarget !== NEW_DECK && !targetGroup && !choice?.createdName));
  const targetError = rejection ?? (targetMissing ? t('targetMissing') : undefined);
  const target = groupsQuery.isSuccess && !targetError ? desiredTarget : undefined;
  const targetOptions = [
    { id: NEW_DECK, label: t('newGroup', { name: newGroupName }) },
    ...groups.map((group) => ({ id: group.id, label: group.name })),
  ];
  if (choice?.createdName && target && !targetGroup) targetOptions.push({ id: target, label: choice.createdName });

  const add = useTopicAdd({
    onGroup: (id, createdName) => setTargetChoice({ requested: requestedGroup, id, createdName }),
    onReconcile: (ids) => setSelected((current) => {
      const next = new Map(current);
      for (const id of ids) next.delete(id);
      return next;
    }),
    onComplete: ({ mode, name, confirmed: { added, full, already, missing } }) => {
      if (mode === 'all_unlearned' && added > 0) setSelected(new Map());
      const result = mode === 'all_unlearned' && added + full === 0
        ? t('noLongerEligible')
        : t('result', { added, name });
      const skipped = mode === 'all_unlearned'
        ? full > 0 && t('resultAllSkipped', { eligible: added + full, full })
        : already + full + missing > 0 && t('resultSkipped', { already, full, missing });
      showToast(skipped ? `${result} ${skipped}` : result, 'success');
    },
    onInvalidTarget: (failed, error) => {
      const id = 'group_id' in failed ? failed.group_id : NEW_DECK;
      const kind = groupError(error)?.kind;
      setTargetChoice({ requested: requestedGroup, id });
      setRejected({ requested: requestedGroup, id, message: kind === 'limit' || kind === 'name-taken' ? errorText(error) : t('targetMissing') });
      void groupsQuery.refetch();
    },
    onError: (error) => showToast(errorText(error), 'danger'),
  });

  async function goTo(nextTokens: Cursor[]) {
    if (moving.current) return;
    moving.current = true;
    setPaging(true);
    setPageError(null);
    try {
      const token = nextTokens.at(-1) ?? null;
      const next = await client.fetchQuery(topicPageOptions(api, scope, token));
      if (token !== null && next.items.length === 0) {
        // Do not stash an empty cursor as a valid visited page. Retry must ask the API again.
        client.removeQueries({ queryKey: topicPageKey(scope, token), exact: true });
        if (nextTokens.length < tokens.length) {
          moving.current = false;
          await goTo(nextTokens.slice(0, -1));
        } else {
          setPageError({ tokens: nextTokens, message: t('pageGone') });
        }
        return;
      }
      setTokens(nextTokens);
    } catch (error) {
      setPageError({ tokens: nextTokens, message: errorText(error) });
    } finally {
      moving.current = false;
      setPaging(false);
    }
  }

  // An active cursor can also become empty when a write refreshes it. Recover the most recent page still in the cache.
  if (tokens.length > 1 && page.data && senses.length === 0) {
    const previous = tokens.slice(0, -1);
    while (previous.length > 1 && !client.getQueryData<NonNullable<typeof page.data>>(topicPageKey(scope, previous.at(-1) ?? null))?.items.length) {
      previous.pop();
    }
    const retry = pageError?.tokens ?? tokens;
    setTokens(previous);
    setPageError({ tokens: retry, message: t('pageGone') });
  }

  const frozen = add.busy || Boolean(add.paused);
  const canAdd = Boolean(target && !paging && !frozen && !page.isError && !groupsQuery.isFetching);
  const addAll = () => submit('all_unlearned');
  function submit(mode: 'all_unlearned' | 'selected') {
    if (!canAdd || !target) return;
    if (mode === 'all_unlearned' ? !summary.isSuccess || !summary.data.unlearned || summary.isFetching : !selected.size) return;
    const ids = mode === 'selected' ? [...selected].sort(([, a], [, b]) => a.page - b.page || a.row - b.row).map(([id]) => id) : [];
    const name = targetGroup?.name ?? choice?.createdName ?? newGroupName;
    void add.run({ mode, scope, ids, target: target === NEW_DECK ? { new_group_name: newGroupName } : { group_id: target }, name });
  }

  const unlearned = senses.flatMap((sense, row) => learning?.has(sense.sense_id) ? [] : [{ id: sense.sense_id, row }]);
  const ticked = unlearned.filter(({ id }) => selected.has(id)).length;
  function toggle(rows: typeof unlearned, on: boolean) {
    setSelected((current) => {
      const next = new Map(current);
      for (const { id, row } of rows) {
        if (on) {
          if (!next.has(id)) next.set(id, { page: tokens.length, row });
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  }

  if (page.isPending && !page.data) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <span className="sr-only">{tCommon('loading')}</span>
        <Skeleton className="h-11 w-64" />
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-wm-row" />)}
      </div>
    );
  }
  const targetPicker = (
    <Select
      label={t('addTo')}
      value={target ?? ''}
      onChange={(id) => {
        setTargetChoice({ requested: requestedGroup, id });
        setRejected(undefined);
      }}
      items={targetOptions}
      isDisabled={frozen || !groupsQuery.isSuccess || groupsQuery.isFetching}
      placeholder={groupsQuery.isPending ? tCommon('loading') : t('chooseGroup')}
    />
  );
  const progress = add.paused?.attempt ?? add.interrupted;
  const navAvailable = tokens.length > 1 || Boolean(page.data?.next_page_token);
  return (
    <div className="flex flex-col gap-5 pb-72 md:pb-24">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-5">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-wm-meta text-wm-muted">{t('eyebrow')}</p>
          <h1 className="font-wm-display text-3xl font-extrabold leading-tight tracking-tight text-wm-ink wrap-anywhere md:text-5xl">{title}</h1>
          {summary.data && <p className="text-wm-base text-wm-muted">{t('intro', { count: summary.data.total })}</p>}
        </div>
        {summary.data && (
          <div className="flex shrink-0 flex-col md:items-end">
            <span className="font-wm-display text-5xl font-extrabold leading-none tracking-tight text-wm-ink md:text-6xl">{format.number(summary.data.unlearned)}</span>
            <span className="text-wm-meta text-wm-muted">{t('countCaption', { learning: summary.data.learning })}</span>
          </div>
        )}
      </div>
      {summary.isError && <ErrorState message={errorText(summary.error)} onRetry={() => void summary.refetch()} />}
      {groupsQuery.isError && <ErrorState message={errorText(groupsQuery.error)} onRetry={() => void groupsQuery.refetch()} />}
      {targetError && <p role="alert" className="text-wm-small text-wm-fail">{targetError}</p>}
      {summary.data && summary.data.unlearned > 0 && (
        <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
          {!selected.size && !add.paused && (
            <div className="w-full min-w-0 md:w-72">{targetPicker}</div>
          )}
          <TextButton
            tone="normal"
            className="w-fit text-wm-button"
            isDisabled={!canAdd || !summary.isSuccess || summary.isFetching}
            onPress={addAll}
          >
            {t('addAll', { count: summary.data.unlearned })}
          </TextButton>
        </div>
      )}
      {add.interrupted && progress && (
        <p role="status" className="text-wm-small text-wm-muted">{t('confirmed', progress.confirmed)}</p>
      )}
      {page.isError && <ErrorState message={errorText(page.error)} onRetry={() => void page.refetch()} />}
      {pageError && <ErrorState message={pageError.message} onRetry={() => void goTo(pageError.tokens)} />}
      {!senses.length && !page.isError ? (
        <p className="text-wm-base text-wm-muted">{t('none')}</p>
      ) : senses.length > 0 && (
        <section className="rounded-wm-card border border-wm-line bg-wm-surface p-2 shadow-wm-card" aria-busy={paging || undefined}>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Checkbox
              isSelected={unlearned.length > 0 && ticked === unlearned.length}
              isIndeterminate={ticked > 0 && ticked < unlearned.length}
              isDisabled={!unlearned.length || frozen}
              onChange={(on) => toggle(unlearned, on)}
            >
              <span className="text-wm-button">{t('selectAll', { count: unlearned.length })}</span>
            </Checkbox>
            {selected.size > 0 && <span className="shrink-0 text-wm-meta text-wm-muted">{t('selected', { count: selected.size })}</span>}
          </div>
          <ul className="flex flex-col">
            {senses.map((s, row) => {
              const decks = learning?.get(s.sense_id);
              const deckList = decks?.flatMap((gid) => groups.find((g) => g.id === gid) ?? []) ?? [];
              const first = deckList[0];
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
                    <Checkbox isSelected={selected.has(s.sense_id)} isDisabled={frozen} onChange={(on) => toggle([{ id: s.sense_id, row }], on)}>
                      <span className="sr-only">{t('select', { word: s.lemma })}</span>
                    </Checkbox>
                  )}
                  <span className={cn('min-w-0 flex-1', decks && 'opacity-50')}>
                    <span className="mr-2 font-wm-display text-wm-word text-wm-ink wrap-anywhere">{s.lemma}</span>
                    <span className="text-wm-meta text-wm-muted">{shownPos(s.pos)}</span>
                    <span className="block text-wm-small text-wm-muted wrap-anywhere">{s.meaning.text}</span>
                  </span>
                  {decks && (
                    <span className="flex w-full min-w-0 items-center gap-2 pl-9 text-wm-caption text-wm-muted md:w-auto md:max-w-1/2 md:pl-0">
                      {first && <span aria-hidden className={cn('size-2.25 shrink-0 rounded-wm-key', groupTone(first.id, first.total).bg)} />}
                      <span className="min-w-0 wrap-anywhere">{first ? t('learning', { groups: deckList.map((deck) => deck.name).join(', ') }) : t('learningNoGroup')}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {navAvailable && (
            <footer className="mt-3 flex items-center justify-between gap-3 px-4 pb-2 text-wm-meta">
              <TextButton
                className="scroll-mb-64"
                isDisabled={paging || tokens.length === 1}
                onPress={() => void goTo(tokens.slice(0, -1))}
              >
                {tLookup('prev')}
              </TextButton>
              <span role="status" className="text-wm-muted">{paging ? tCommon('loading') : tLookup('pageFoot', { n: tokens.length })}</span>
              <TextButton
                className="scroll-mb-64"
                isDisabled={paging || !page.data?.next_page_token}
                onPress={() => void goTo([...tokens, page.data!.next_page_token])}
              >
                {tLookup('next')}
                <ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />
              </TextButton>
            </footer>
          )}
        </section>
      )}
      {add.paused ? (
        <FloatingBar label={t('paused')}>
          <div className="min-w-0 text-wm-small text-wm-muted">
            <p role="alert">{add.expired ? t('retryExpired') : errorText(add.paused.error)}</p>
            <p>{t('confirmed', add.paused.attempt.confirmed)}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button isDisabled={add.waiting || add.expired} onPress={() => void add.run()}>{t('continueAdd')}</Button>
            <TextButton tone="muted" onPress={add.leave}>{t('leaveAttempt')}</TextButton>
          </div>
        </FloatingBar>
      ) : selected.size > 0 && (
        <FloatingBar label={t('selected', { count: selected.size })}>
          <div className="w-full min-w-0 md:w-72">{targetPicker}</div>
          <Button isPending={add.busy} isDisabled={!canAdd && !add.busy} onPress={() => submit('selected')}>
            {t('addSelected', { count: selected.size })}
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        </FloatingBar>
      )}
    </div>
  );
}
