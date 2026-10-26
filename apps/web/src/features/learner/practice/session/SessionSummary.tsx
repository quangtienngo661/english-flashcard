'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { hardReplace } from '@/app-shell/navigate';
import { useEntitlements } from '@/app-shell/queries';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { GROUPS_KEY } from '../../groups/groups-api';
import { useStartSession, type PracticeSessionView, type StartBody } from '../practice-api';
import { KBD } from './QuestionCard';
import type { Summary } from './use-practice-session';

export function useSummary(sessionId: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['practice', 'summary', sessionId],
    queryFn: () => api.get<Summary>(`/v1/practice/sessions/${sessionId}/summary`),
  });
}

/** The same choices as the session that just ended ([Luyện thêm một phiên]). */
export const againBody = (s: PracticeSessionView): StartBody => ({
  source: s.source,
  ...(s.group_id ? { group_id: s.group_id } : {}),
  ...(s.source === 'group' && s.group_filter ? { group_filter: s.group_filter } : {}),
  sort: s.sort,
  types: s.types,
  ...(s.types.includes('type_word') ? { prompt_style: s.prompt_style as StartBody['prompt_style'] } : {}),
  count: s.target_count,
});

/** K/67: right and wrong counts, the words to mark Cần ôn lại (one by one or all left), then back or another session. */
export function SessionSummary({ session, sourceLabel }: { session: PracticeSessionView; sourceLabel: string }) {
  const t = useTranslations('App.practice');
  const ts = useTranslations('App.practice.session.summary');
  const locale = useLocale();
  const api = useApi();
  const client = useQueryClient();
  const errorText = useErrorMessage();
  const summary = useSummary(session.id);
  const pool = useEntitlements().data?.pools.practice_sessions;
  const start = useStartSession();
  const [error, setError] = useState<string | null>(null);
  const [pressing, setPressing] = useState<string | null>(null);
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['practice', 'summary', session.id] });
    void client.invalidateQueries({ queryKey: GROUPS_KEY });
  };
  const reviewAll = useSubmitOnce(async (key) => {
    await api.post(`/v1/practice/sessions/${session.id}/review-all`, undefined, { idempotencyKey: key });
    refresh();
    return true;
  });
  const again = useSubmitOnce(async (key) => {
    await start(againBody(session), key);
    hardReplace(`/${locale}/app/practice/session`);
    return true;
  });

  async function reviewOne(itemId: string) {
    if (pressing) return;
    setPressing(itemId);
    setError(null);
    try {
      await api.post(`/v1/practice/items/${itemId}/review`, { action: 'needs_review' });
      refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setPressing(null);
    }
  }
  const run = (fn: () => Promise<unknown>) => async () => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    }
  };

  const data = summary.data;
  const types = session.types.length > 1 ? ts('mixed', { count: session.types.length }) : t(`types.${session.types[0]}`);
  const left = data?.words.filter((w) => w.action === null).length ?? 0;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-display font-extrabold text-ink">{ts('title', { count: data?.asked ?? session.asked })}</h1>
        <p className="text-ui text-muted">
          {pool && pool.limit > 0
            ? ts('line', { source: sourceLabel, types, remaining: pool.remaining, limit: pool.limit })
            : ts('lineNoPool', { source: sourceLabel, types })}
        </p>
      </div>
      {data && (
        <dl className="grid grid-cols-2 gap-3">
          <div className="flex flex-col-reverse rounded-card bg-surface p-4">
            <dt className="text-caption text-muted">{ts('correct')}</dt>
            <dd className="text-h3 font-extrabold text-success">{data.correct}</dd>
          </div>
          <div className="flex flex-col-reverse rounded-card bg-surface p-4">
            <dt className="text-caption text-muted">{ts('wrong')}</dt>
            <dd className="text-h3 font-extrabold text-danger">{data.wrong}</dd>
          </div>
        </dl>
      )}
      {data && data.words.length > 0 && (
        <section className="flex flex-col gap-2 rounded-card bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="summary-words" className="text-title font-semibold text-ink">
              {ts('listTitle', { count: data.words.length })}
            </h2>
            {left > 0 && (
              <Button variant="ink" isPending={reviewAll.busy} onPress={run(reviewAll.submit)}>
                {ts('reviewAll', { count: left })}
              </Button>
            )}
          </div>
          <ul aria-labelledby="summary-words" className="flex flex-col divide-y divide-border">
            {data.words.map((word) => (
              <li key={word.sense_id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <span className="min-w-0 break-words text-ui font-semibold text-ink sm:w-32">{word.lemma}</span>
                <span className="min-w-0 flex-1 break-words text-caption text-muted">{word.meaning}</span>
                {word.action !== null ? (
                  <span className="flex items-center gap-1 text-caption font-semibold text-success">
                    <Check aria-hidden className="size-4" />
                    {ts('added')}
                  </span>
                ) : (
                  <Button variant="quiet" isPending={pressing === word.item_id} onPress={() => void reviewOne(word.item_id)}>
                    {ts('review')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {error && (
        <p role="alert" className="text-ui text-danger">
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={`/${locale}/app/practice`}
          className="flex min-h-control-touch items-center justify-between gap-2 rounded-inner bg-accent px-4.5 text-body font-semibold text-on-accent shadow-ledge-accent outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {ts('home')}
          <kbd className={`${KBD} border-on-accent`}>Enter</kbd>
        </Link>
        <Button variant="quiet" size="lg" isPending={again.busy} onPress={run(again.submit)}>
          {ts('again')}
        </Button>
      </div>
    </div>
  );
}
