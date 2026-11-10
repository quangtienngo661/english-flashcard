'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, LoaderCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { hardReplace } from '@/app-shell/navigate';
import { useEntitlements } from '@/app-shell/queries';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button, BUTTON_BASE, BUTTON_VARIANT } from '@/ui/Button';
import { TextButton } from '@/ui/TextButton';
import { GROUPS_KEY } from '../../groups/groups-api';
import { useStartSession, type PracticeSessionView, type StartBody } from '../practice-api';
import { STAGGER } from '../../review/ReviewSummary';
import { ButtonKey } from './QuestionCard';
import type { Summary, SummaryWord } from './use-practice-session';

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
  // Without it the API treats `cloze` as AI-written and spends AI credits (audit 26/10/2026 #2).
  ...(s.cloze_source === 'own' || s.cloze_source === 'own_then_ai' ? { cloze_source: s.cloze_source } : {}),
  ...(s.types.includes('type_word') ? { prompt_style: s.prompt_style as StartBody['prompt_style'] } : {}),
  count: s.target_count,
  // #249: a session opened with an AI count has a placement; ask for as many AI questions as it planned (R101).
  ...(s.ai_placement ? { ai_count: s.ai_planned, ai_placement: s.ai_placement } : {}),
});

/** K/67 (Figma 119:4608): the ring of right answers, the words to mark Cần ôn lại (one by one or all left), then back or another session. */
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

  /** A row is a word, and two words can share an item (an alternative answer): the call names its word, and so does the pending key. */
  async function reviewOne(word: SummaryWord) {
    const key = `${word.item_id}:${word.sense_id}`;
    if (pressing) return;
    setPressing(key);
    setError(null);
    try {
      await api.post(`/v1/practice/items/${word.item_id}/review`, { action: 'needs_review', sense_id: word.sense_id });
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
  const asked = data?.asked ?? session.asked;
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-center gap-8 rounded-wm-xl border border-wm-line bg-wm-surface p-6 shadow-wm-card md:flex-row md:items-start md:p-8">
        {data && (
          <div className={STAGGER[0]}>
            <Ring correct={data.correct} wrong={data.wrong} label={ts('ring', { correct: data.correct, total: data.asked })} caption={ts('ringCaption')} />
          </div>
        )}
        <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
          <div className={`flex flex-col gap-2 ${STAGGER[1]}`}>
            <h1 className="font-wm-display text-wm-card-heading-mobile text-wm-ink md:text-wm-card-heading">{ts('title', { count: asked })}</h1>
            <p className="wrap-anywhere font-wm-sans text-wm-small text-wm-muted">
              {pool && pool.limit > 0
                ? ts('line', { source: sourceLabel, types, remaining: pool.remaining, limit: pool.limit })
                : ts('lineNoPool', { source: sourceLabel, types })}
            </p>
            {/* The alternatives belong to the right answers (UI polish, 07/11/2026). */}
            {data && (data.alternatives ?? 0) > 0 && <p className="font-wm-sans text-wm-small-strong text-wm-ink">{ts('alternatives', { count: data.alternatives ?? 0 })}</p>}
          </div>
          {data && data.words.length > 0 && (
            <div className={`flex flex-col ${STAGGER[2]}`}>
              <h2 id="summary-words" className="font-wm-display text-wm-word text-wm-ink">
                {ts('listTitle', { count: data.words.length })}
              </h2>
              <ul aria-labelledby="summary-words" className="mt-2 flex flex-col">
                {data.words.map((word) => (
                  <li key={word.sense_id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-wm-line py-3">
                    <span className="min-w-0 break-words font-wm-display text-wm-word text-wm-ink">{word.lemma}</span>
                    <span className="min-w-0 flex-1 break-words font-wm-sans text-wm-small text-wm-muted">{word.meaning}</span>
                    {word.action !== null ? (
                      <span className="flex items-center gap-1 font-wm-sans text-wm-small-strong text-wm-pass">
                        <Check aria-hidden className="size-4" />
                        {ts('added')}
                      </span>
                    ) : (
                      <TextButton isDisabled={pressing !== null} onPress={() => void reviewOne(word)}>
                        {pressing === `${word.item_id}:${word.sense_id}` && <LoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" />}
                        {ts('review')}
                      </TextButton>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {error && (
            <p role="alert" className="font-wm-sans text-wm-small text-wm-fail">
              {error}
            </p>
          )}
          <div className={`flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center ${STAGGER[3]}`}>
            <Button variant="primary" isPending={again.busy} onPress={run(again.submit)}>
              {ts('again')}
              <ArrowRight aria-hidden className="size-4" />
            </Button>
            {left > 0 && (
              <TextButton className="justify-center" isDisabled={reviewAll.busy} onPress={run(reviewAll.submit)}>
                {ts('reviewAll', { count: left })}
              </TextButton>
            )}
            {/* Owner 10/11/2026: a boxed button, so the way back reads as an action (was a grey text link). */}
            <Link href={`/${locale}/app/practice`} className={`${BUTTON_BASE} ${BUTTON_VARIANT.secondary} md:ml-auto`}>
              {ts('home')}
              <ButtonKey>Enter</ButtonKey>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Figma 119:4608: a 220 px ring, green for the right answers and red for the wrong ones; the count in its middle. */
function Ring({ correct, wrong, label, caption }: { correct: number; wrong: number; label: string; caption: string }) {
  const total = correct + wrong;
  const r = 96;
  const length = 2 * Math.PI * r;
  const wrongLength = total > 0 ? (wrong / total) * length : 0;
  return (
    <div role="img" aria-label={label} className="relative flex size-44 items-center justify-center md:size-55">
      <svg aria-hidden viewBox="0 0 220 220" className="absolute inset-0 size-full -rotate-90">
        <circle cx="110" cy="110" r={r} fill="none" strokeWidth="14" className={total > 0 ? 'stroke-wm-pass' : 'stroke-wm-line'} />
        {wrongLength > 0 && (
          <circle cx="110" cy="110" r={r} fill="none" strokeWidth="14" className="stroke-wm-fail" strokeDasharray={`${wrongLength} ${length}`} />
        )}
      </svg>
      <span aria-hidden className="flex flex-col items-center">
        <span className="flex items-baseline font-wm-display text-wm-ink">
          <span className="text-wm-section">{correct}</span>
          <span className="text-wm-card-title text-wm-muted">/{total}</span>
        </span>
        <span className="font-wm-mono text-wm-mono text-wm-muted">{caption}</span>
      </span>
    </div>
  );
}
