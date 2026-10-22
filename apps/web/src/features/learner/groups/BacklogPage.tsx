'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AppShell } from '@/app-chrome/AppShell';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useAppConfig } from '@/app-shell/queries';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { Checkbox } from '@/app-ui/Checkbox';
import { Dialog } from '@/app-ui/Dialog';
import { FullScreenSpinner, NotFoundState } from '@/app-ui/States';
import { showToast } from '@/app-ui/Toast';
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
const FIRST_ROWS = 5;
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
    <AppShell variant="sub" back={back}>
      {notFound ? (
        <NotFoundState title={t('group.notFound')} back={{ href: `/${locale}/app/groups`, label: t('group.toList') }} />
      ) : group.data ? (
        <BacklogBody groupId={group.data.id} name={group.data.name} />
      ) : (
        <FullScreenSpinner />
      )}
    </AppShell>
  );
}

function BacklogBody({ groupId, name }: { groupId: string; name: string }) {
  const t = useTranslations('App.backlog');
  const api = useApi();
  const client = useQueryClient();
  const errorText = useErrorMessage();
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

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-accent-soft p-5 shadow-ledge-accent md:p-7">
        <div className="min-w-0">
          <h1 className="text-h2 font-extrabold text-ink">{t('title')}</h1>
          {days !== undefined && <p className="text-ui text-muted">{t('line', { name, count: items.length, days })}</p>}
        </div>
        {items.length > 0 && (
          <Button variant="sticker" size="lg" isPending={relearn.busy && selected.size === 0} onPress={() => selected.size === 0 && void run(relearn, 'relearned')} isDisabled={selected.size > 0}>
            {t('relearnAll', { count: items.length })}
          </Button>
        )}
      </section>
      <div className="grid gap-6 xl:grid-cols-3">
        <section className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface p-4 xl:col-span-2">
          {list.isPending ? (
            <FullScreenSpinner />
          ) : items.length === 0 ? (
            <p className="text-body text-muted">{t('empty')}</p>
          ) : (
            <>
              {selected.size > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-inner bg-primary-soft px-3 py-2">
                  <span className="text-ui font-semibold text-primary">{t('selected', { count: selected.size })}</span>
                  <div className="flex gap-2">
                    <Button variant="quiet" isPending={relearn.busy} onPress={() => void run(relearn, 'relearned')}>
                      {t('relearnSelected', { count: selected.size })}
                    </Button>
                    <Button variant="danger" onPress={() => setConfirmForget(true)}>
                      {t('forget')}
                    </Button>
                  </div>
                </div>
              )}
              <table className="w-full table-fixed text-left text-ui">
                <thead className="text-caption text-muted">
                  <tr>
                    <th className="w-10" />
                    <th className="py-2 font-medium">{t('colWord')}</th>
                    <th className="py-2 font-medium">{t('colMeaning')}</th>
                    <th className="w-24 py-2 text-right font-medium">{t('colOverdue')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((item) => (
                    <tr key={item.item_id}>
                      <td className="py-2.5">
                        <Checkbox isSelected={selected.has(item.item_id)} onChange={(on) => toggle(item.item_id, on)}>
                          <span className="sr-only">{t('select', { word: item.content.lemma })}</span>
                        </Checkbox>
                      </td>
                      <td className="break-words py-2.5 font-semibold text-ink">{item.content.lemma}</td>
                      <td className="break-words py-2.5 text-ink">{item.content.meaning.text}</td>
                      <td className="py-2.5 text-right text-caption text-muted">{t('overdueDays', { count: item.days_overdue })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-caption text-muted">
                {t('showing', { shown: rows.length, total: items.length })}
                {!showAll && items.length > FIRST_ROWS && (
                  <>
                    {' · '}
                    <button type="button" onClick={() => setShowAll(true)} className="font-semibold text-primary underline underline-offset-2">
                      {t('more')}
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </section>
        <aside className="flex flex-col gap-4">
          {days !== undefined && (
            <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5">
              <h2 className="text-body font-semibold text-ink">{t('whyTitle')}</h2>
              <p className="text-caption text-muted">{t('whyBody', { days })}</p>
            </section>
          )}
          <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
            <h2 className="text-title font-semibold text-ink">{t('waysTitle')}</h2>
            {(
              [
                ['wayRelearn', 'wayRelearnBody', 'text-primary'],
                ['wayForget', 'wayForgetBody', 'text-danger'],
                ['wayKeep', 'wayKeepBody', 'text-ink'],
              ] as const
            ).map(([title, body, tone]) => (
              <div key={title} className="rounded-inner bg-canvas p-3">
                <p className={`text-ui font-semibold ${tone}`}>{t(title)}</p>
                <p className="text-caption text-muted">{t(body)}</p>
              </div>
            ))}
          </section>
        </aside>
      </div>
      {confirmForget && (
        <Dialog
          isOpen
          onOpenChange={(open) => !open && setConfirmForget(false)}
          title={t('forgetTitle', { count: selected.size })}
          isDismissable={!forget.busy}
          footer={
            <>
              <Button variant="quiet" onPress={() => setConfirmForget(false)}>
                {t('keep')}
              </Button>
              <Button variant="danger" isPending={forget.busy} onPress={() => void run(forget, 'forgotten')}>
                {t('forgetConfirm', { count: selected.size })}
              </Button>
            </>
          }
        >
          <p className="text-body text-ink">{t('forgetBody')}</p>
        </Dialog>
      )}
    </div>
  );
}
