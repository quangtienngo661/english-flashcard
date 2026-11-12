'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { BackLink } from '@/app-chrome/BackLink';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useAppConfig } from '@/app-shell/queries';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import Link from 'next/link';
import { useFormat } from '@/app-shell/format';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/Button';
import { Checkbox } from '@/ui/Checkbox';
import { Dialog } from '@/ui/Dialog';
import { Skeleton } from '@/ui/Skeleton';
import { TextButton } from '@/ui/TextButton';
import { showToast } from '@/ui/Toast';
import { FloatingBar } from './FloatingBar';
import { GROUPS_KEY, groupKey, isId, useGroup } from './groups-api';

type BacklogItem = {
  item_id: string;
  sense_id: string;
  level: number;
  due_date: string;
  days_overdue: number;
  content: { lemma: string; pos: string; meaning: { text: string } };
};

const BATCH = 100;
const FIRST_ROWS = 6;
const chunks = <T,>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

/** K/15 `/app/group/backlog?id=`: words of a deck over `backlog_after_days` overdue; relearn all, some, or stop learning them. */
export function BacklogPage() {
  const t = useTranslations('App');
  const locale = useLocale();
  const raw = useSearchParams().get('id');
  const id = isId(raw) ? raw.toLowerCase() : null;
  const group = useGroup(id);
  const notFound = id === null || (group.error instanceof ApiError && group.error.problem.status === 404);
  const back = { href: id ? `/${locale}/app/group?id=${id}` : `/${locale}/app/groups`, label: t('backlog.back', { name: group.data?.name ?? '' }) };

  return (
    <>
      <BackLink {...back} />
      {notFound ? (
        <div className="flex flex-col items-start gap-3 rounded-wm-xl bg-wm-surface p-6 shadow-wm-card">
          <h1 className="font-wm-display text-wm-card-title text-wm-ink">{t('group.notFound')}</h1>
          <Link href={`/${locale}/app/groups`} className="text-wm-small-strong text-wm-accent">
            {t('group.toList')}
          </Link>
        </div>
      ) : group.data ? (
        <BacklogBody groupId={group.data.id} name={group.data.name} />
      ) : (
        <ListSkeleton label={t('common.loading')} />
      )}
    </>
  );
}

function BacklogBody({ groupId, name }: { groupId: string; name: string }) {
  const t = useTranslations('App.backlog');
  const api = useApi();
  const client = useQueryClient();
  const errorText = useErrorMessage();
  const tCommon = useTranslations('App.common');
  const format = useFormat();
  const days = useAppConfig().data?.learning.backlog_after_days;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [confirmForget, setConfirmForget] = useState(false);
  const key = [...groupKey(groupId), 'backlog'];
  const list = useQuery({
    queryKey: key,
    queryFn: async () => {
      const items: BacklogItem[] = [];
      let token: string | null = null;
      do {
        const page: { items: BacklogItem[]; next_page_token: string | null } = await api.get(
          `/v1/groups/${groupId}/backlog?page_size=${BATCH}${token ? `&page_token=${encodeURIComponent(token)}` : ''}`,
        );
        items.push(...page.items);
        token = page.next_page_token;
      } while (token);
      return items;
    },
  });
  const items = list.data ?? [];
  const done = () => {
    setSelected(new Set());
    void client.invalidateQueries({ queryKey: key });
    void client.invalidateQueries({ queryKey: GROUPS_KEY });
  };

  // One press, one key; a batch of 100 ids per request, each with its own key derived from the press.
  const relearn = useSubmitOnce(async (pressKey) => {
    const ids = selected.size > 0 ? [...selected] : items.map((i) => i.item_id);
    for (const [i, batch] of chunks(ids, BATCH).entries()) {
      await api.post('/v1/items/relearn', { item_ids: batch }, { idempotencyKey: `${pressKey}:${i}` });
    }
    return ids.length;
  });
  // One DELETE per word. A 404 means the word already left (an earlier press got through); a failure halfway keeps only the
  // words not removed yet ticked and reloads the list, so the next press does not start again from the first word.
  const forget = useSubmitOnce(async (pressKey) => {
    const ids = [...selected];
    const removed: string[] = [];
    try {
      for (const [i, itemId] of ids.entries()) {
        try {
          await api.delete(`/v1/items/${itemId}`, { idempotencyKey: `${pressKey}:${i}` });
        } catch (error) {
          if (!(error instanceof ApiError && error.problem.status === 404)) throw error;
        }
        removed.push(itemId);
      }
    } catch (error) {
      if (removed.length > 0) {
        setSelected((current) => new Set([...current].filter((itemId) => !removed.includes(itemId))));
        void client.invalidateQueries({ queryKey: key });
        void client.invalidateQueries({ queryKey: GROUPS_KEY });
      }
      throw error;
    }
    return ids.length;
  });

  async function run(press: typeof relearn, message: 'relearned' | 'forgotten') {
    try {
      const count = await press.submit();
      if (count === undefined) return;
      showToast(t(message, { count }), 'success');
      setConfirmForget(false);
      done();
    } catch (error) {
      showToast(errorText(error), 'danger');
    }
  }

  const toggle = (itemId: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  const rows = showAll ? items : items.slice(0, FIRST_ROWS);
  const longest = Math.max(1, ...items.map((i) => i.days_overdue));
  const allTicked = items.length > 0 && items.every((i) => selected.has(i.item_id));

  return (
    <div className="flex flex-col gap-5 pb-36 md:pb-24">
      <div className="flex items-end justify-between gap-5">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="font-wm-display text-3xl font-extrabold leading-tight tracking-tight text-wm-ink md:text-5xl">{t('title')}</h1>
          {days !== undefined && <p className="text-wm-base text-wm-muted wrap-anywhere">{t('line', { name, count: items.length, days })}</p>}
        </div>
        <p className="flex shrink-0 flex-col items-end">
          <span className="font-wm-display text-6xl font-extrabold leading-none tracking-tight text-wm-fail md:text-8xl">{format.number(items.length)}</span>
          <span className="text-wm-meta text-wm-muted">{t('countCaption')}</span>
        </p>
      </div>
      {days !== undefined && (
        <p className="max-w-195 text-wm-small leading-relaxed text-wm-muted md:text-wm-base">
          {t.rich('explain', { days, b: (chunks) => <b className="font-semibold text-wm-ink">{chunks}</b> })}
        </p>
      )}
      {items.length > 0 && (
        <Button
          size="lg"
          className="w-fit"
          isPending={relearn.busy && selected.size === 0}
          onPress={() => selected.size === 0 && void run(relearn, 'relearned')}
          isDisabled={selected.size > 0}
        >
          {t('relearnAll', { count: items.length })}
        </Button>
      )}
      <section aria-label={t('list')} className="rounded-wm-xl border border-wm-line bg-wm-surface p-4 shadow-wm-card md:p-6">
        {list.isPending ? (
          <ListSkeleton label={tCommon('loading')} />
        ) : items.length === 0 ? (
          <p className="text-wm-base text-wm-muted">{t('empty')}</p>
        ) : (
          <>
            <div className="flex items-center gap-4 px-4 pb-1.5 text-wm-meta text-wm-muted">
              <Checkbox isSelected={allTicked} onChange={(on) => setSelected(on ? new Set(items.map((i) => i.item_id)) : new Set())}>
                <span className="sr-only">{t('selectAll', { count: items.length })}</span>
              </Checkbox>
              <span className="min-w-0 flex-1 md:w-47.5 md:flex-none">{t('colWord')}</span>
              <span className="hidden min-w-0 flex-1 md:block">{t('colMeaning')}</span>
              <span className="shrink-0 text-right">{t('colOverdue')}</span>
            </div>
            <ul className="flex flex-col">
              {rows.map((item) => (
                <li
                  key={item.item_id}
                  className={cn('flex items-center gap-4 rounded-wm-md border-t border-wm-line px-4 py-3', selected.has(item.item_id) && 'bg-wm-accent/5')}
                >
                  <Checkbox isSelected={selected.has(item.item_id)} onChange={(on) => toggle(item.item_id, on)}>
                    <span className="sr-only">{t('select', { word: item.content.lemma })}</span>
                  </Checkbox>
                  <span className="min-w-0 flex-1 font-wm-display text-wm-word text-wm-ink wrap-anywhere md:w-47.5 md:flex-none">{item.content.lemma}</span>
                  <span className="hidden min-w-0 flex-1 text-wm-base text-wm-muted wrap-anywhere md:block">{item.content.meaning.text}</span>
                  <span aria-hidden className="hidden h-1.5 w-37.5 shrink-0 overflow-hidden rounded-wm-sm bg-wm-line md:block">
                    <span
                      className="block h-full bg-wm-muted"
                      // raw-ok: the bar is this word's overdue days against the longest in the list
                      style={{ width: `${Math.round((item.days_overdue / longest) * 100)}%` }}
                    />
                  </span>
                  <span className="w-19 shrink-0 text-right text-wm-base-strong text-wm-muted">{t('overdueDays', { count: item.days_overdue })}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-5 pt-4 text-wm-meta text-wm-muted">
              {t('showing', { shown: rows.length, total: items.length })}
              {!showAll && items.length > FIRST_ROWS && (
                <TextButton onPress={() => setShowAll(true)}>{t('more', { count: items.length - FIRST_ROWS })}</TextButton>
              )}
            </div>
          </>
        )}
      </section>
      {selected.size > 0 && (
        <FloatingBar label={t('selected', { count: selected.size })}>
          <div className="flex items-center justify-between gap-4">
            <span className="text-wm-button text-wm-ink">{t('selected', { count: selected.size })}</span>
            <TextButton tone="delete" onPress={() => setConfirmForget(true)}>
              {t('forget')}
            </TextButton>
          </div>
          <Button isPending={relearn.busy} onPress={() => void run(relearn, 'relearned')}>
            {t('relearnSelected', { count: selected.size })}
          </Button>
        </FloatingBar>
      )}
      <Dialog
        isOpen={confirmForget}
        onOpenChange={(open) => !open && setConfirmForget(false)}
        title={t('forgetTitle', { count: selected.size })}
        isDismissable={!forget.busy}
        footer={
          <>
            <Button variant="secondary" onPress={() => setConfirmForget(false)}>
              {t('keep')}
            </Button>
            <Button variant="danger" isPending={forget.busy} onPress={() => void run(forget, 'forgotten')}>
              {t('forgetConfirm', { count: selected.size })}
            </Button>
          </>
        }
      >
        <p role="note" className="rounded-wm-lg bg-wm-fail-soft p-4 text-wm-small-strong text-wm-fail">
          {t('forgetBody')}
        </p>
      </Dialog>
    </div>
  );
}

function ListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-12 w-full rounded-wm-md" />
      ))}
    </div>
  );
}
