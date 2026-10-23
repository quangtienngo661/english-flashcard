'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { ENTITLEMENTS_KEY } from '@/app-shell/queries';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { GROUPS_KEY } from '../../groups/groups-api';
import { CURRENT_KEY, type PracticeSessionView, type QuestionType } from '../practice-api';

export type Prompt =
  | { kind: 'mcq'; meaning: string; meaning_language: 'vi' | 'en'; context_label: string | null; options: string[] }
  | { kind: 'true_false'; lemma: string; meaning: string; meaning_language: 'vi' | 'en'; context_label: string | null }
  | { kind: 'type_meaning'; meaning: string; meaning_language: 'vi' | 'en'; context_label: string | null }
  | { kind: 'type_sentence'; sentence: string }
  | { kind: 'cloze'; sentence: string }
  | { kind: 'meaning_in_sentence'; sentence: string; highlight: string; options: string[]; meaning_language: 'vi' | 'en' }
  | { kind: 'mcq_sentence'; sentence: string; options: string[] };

/** `ItemView` of the API: never the answer or the hint texts. */
export type Item = {
  item_id: string;
  round: number;
  position: number;
  type: QuestionType;
  prompt_style: 'meaning' | 'sentence';
  prompt: Prompt;
  hints_available: { level1: boolean; level2: boolean; level3: boolean };
  hint_level: number;
  state: 'unanswered' | 'try_again';
  tries: number;
  reportable: boolean;
};

export type AnswerResult = {
  result: 'correct' | 'wrong';
  skipped: boolean;
  tries: number;
  hint_level: number;
  correct: { lemma: string; text: string; choice_index: number | null; is_true: boolean | null };
  meaning: string;
  definition_en: string | null;
  show_known: boolean;
  highlight_needs_review: boolean;
  translation: string | null;
};

export type AnswerBody = { choice: number } | { is_true: boolean } | { text: string };
type NextResult =
  | { state: 'question'; session: PracticeSessionView; item: Item }
  | { state: 'waiting_continue' | 'finished'; session: PracticeSessionView }
  | { state: 'preparing'; session: PracticeSessionView; retry_after_seconds: number }
  | { state: 'ai_unavailable'; session: PracticeSessionView; reason: string };

export type Outcome = { kind: 'try_again'; tries: number } | { kind: 'final'; result: AnswerResult; chosen: AnswerBody | null };
export type Phase =
  | { kind: 'question'; item: Item; outcome: Outcome | null }
  | { kind: 'round' }
  | { kind: 'summary' }
  | { kind: 'advancing' }
  | { kind: 'none' }
  | { kind: 'closed' };

export type SummaryWord = { sense_id: string; lemma: string; meaning: string; item_id: string; action: 'needs_review' | 'known' | null };
export type Summary = { session: PracticeSessionView; asked: number; correct: number; wrong: number; words: SummaryWord[] };

const isSlug = (error: unknown, slug: string) => error instanceof ApiError && error.problem.slug === slug;

/**
 * One practice session (K/60–K/67). Nothing is kept in the browser: the page reads `GET /practice/sessions/current` once and
 * the API knows where the learner is, so a reload or Back resumes (Review Focus 4). Each answer press is one `[I]` write.
 */
export function usePracticeSession() {
  const api = useApi();
  const client = useQueryClient();
  // Read once (as the review queue): a refetch must not swap the question under the learner.
  const [loaded, setLoaded] = useState(false);
  const load = useQuery({
    queryKey: ['practice', 'session-load'],
    queryFn: async () => {
      try {
        const current = await api.get<{ session: PracticeSessionView; item: Item | null; preparing: boolean }>('/v1/practice/sessions/current');
        setLoaded(true);
        return current;
      } catch (error) {
        if (error instanceof ApiError && error.problem.status === 404) {
          setLoaded(true);
          return null;
        }
        throw error;
      }
    },
    enabled: !loaded,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const [own, setOwn] = useState<{ phase: Phase; session: PracticeSessionView | null } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [reported, setReported] = useState<Set<string>>(() => new Set());
  // Final results seen on this page, by question number, for the progress bar.
  const [results, setResults] = useState<Record<number, 'correct' | 'wrong'>>({});
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const advanceStarted = useRef(false);

  let phase: Phase | null = own?.phase ?? null;
  let session = own?.session ?? null;
  if (!own && load.data !== undefined) {
    const data = load.data;
    session = data?.session ?? null;
    phase = data === null ? { kind: 'none' }
      : data.item ? { kind: 'question', item: data.item, outcome: null }
        : data.session.status === 'waiting_continue' ? { kind: 'round' } : { kind: 'advancing' };
  }

  const set = (next: Phase, view?: PracticeSessionView) => setOwn((prev) => ({ phase: next, session: view ?? prev?.session ?? session }));

  function fail(e: unknown): boolean {
    if (isSlug(e, 'session-closed')) {
      set({ kind: 'closed' });
      return true;
    }
    setError(e);
    return false;
  }

  /** Guards every non-keyed write: one at a time, presses while busy are ignored. */
  async function guarded(work: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (e) {
      fail(e);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function advanceNow(id: string, retries = 0): Promise<void> {
    const next = await api.post<NextResult>(`/v1/practice/sessions/${id}/next`, {});
    if (next.state === 'question') set({ kind: 'question', item: next.item, outcome: null }, next.session);
    else if (next.state === 'waiting_continue') set({ kind: 'round' }, next.session);
    else if (next.state === 'finished') toSummary(next.session);
    else if (next.state === 'preparing' && retries < 10) {
      // AI questions arrive in M5a; a rule-only session does not prepare, but waiting is harmless.
      await new Promise((resolve) => setTimeout(resolve, next.retry_after_seconds * 1000));
      return advanceNow(id, retries + 1);
    } else throw new Error('practice-next-unavailable');
  }

  function toSummary(view: PracticeSessionView) {
    set({ kind: 'summary' }, view);
    void client.invalidateQueries({ queryKey: CURRENT_KEY });
    void client.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
    void client.invalidateQueries({ queryKey: GROUPS_KEY });
    void client.invalidateQueries({ queryKey: ['practice'] });
  }

  // The first question after a load whose slot was empty (a page left between questions).
  const advanceId = phase?.kind === 'advancing' && !own ? session?.id ?? null : null;
  useEffect(() => {
    if (advanceId === null || advanceStarted.current) return;
    advanceStarted.current = true;
    void Promise.resolve().then(() => guarded(() => advanceNow(advanceId)));
    // guarded/advanceNow are recreated each render; the id alone decides the one call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanceId]);

  const chosenRef = useRef<{ itemId: string; body: AnswerBody } | null>(null);
  const answerOnce = useSubmitOnce(async (key) => {
    const { itemId, body } = chosenRef.current!;
    try {
      return await api.post<AnswerResult | { result: 'try_again'; tries: number }>(`/v1/practice/items/${itemId}/answer`, body, { idempotencyKey: key });
    } catch (e) {
      // E36: answered in another tab; the API sends the result.
      const other = e instanceof ApiError && e.problem.slug === 'already-answered' ? e.problem.extensions?.result : undefined;
      if (other) return other as AnswerResult;
      throw e;
    }
  });

  function recordFinal(item: Item, result: AnswerResult, chosen: AnswerBody | null) {
    if (session) setResults((r) => ({ ...r, [session!.asked]: result.result }));
    set({ kind: 'question', item: { ...item, hint_level: result.hint_level }, outcome: { kind: 'final', result, chosen } });
  }

  async function answer(body: AnswerBody) {
    if (phase?.kind !== 'question' || phase.outcome?.kind === 'final' || answerOnce.busy || busyRef.current) return;
    const item = phase.item;
    chosenRef.current = { itemId: item.item_id, body };
    setError(null);
    try {
      const response = await answerOnce.submit();
      if (!response) return;
      if (response.result === 'try_again') set({ kind: 'question', item: { ...item, state: 'try_again', tries: response.tries }, outcome: { kind: 'try_again', tries: response.tries } });
      else recordFinal(item, response, body);
    } catch (e) {
      fail(e);
    }
  }

  return {
    load,
    phase,
    session,
    results,
    error,
    busy: busy || answerOnce.busy,
    reported,
    markReported: (itemId: string) => setReported((s) => new Set(s).add(itemId)),
    answer,
    skip: () =>
      guarded(async () => {
        if (phase?.kind !== 'question') return;
        const item = phase.item;
        recordFinal(item, await api.post<AnswerResult>(`/v1/practice/items/${item.item_id}/skip`, {}), null);
      }),
    /** Cần ôn lại / Đã biết on a result, then the next question (K/61, K/62). */
    review: (action: 'needs_review' | 'known') =>
      guarded(async () => {
        if (phase?.kind !== 'question' || !session) return;
        await api.post(`/v1/practice/items/${phase.item.item_id}/review`, { action });
        void client.invalidateQueries({ queryKey: GROUPS_KEY });
        await advanceNow(session.id);
      }),
    next: () =>
      guarded(async () => {
        if (session) await advanceNow(session.id);
      }),
    continueRound: (go: boolean) =>
      guarded(async () => {
        if (!session) return;
        const { session: view } = await api.post<{ session: PracticeSessionView }>(`/v1/practice/sessions/${session.id}/continue`, { continue: go });
        if (go) await advanceNow(view.id);
        else toSummary(view);
      }),
    /** Esc / ×: ends the session into the summary. */
    stop: () =>
      guarded(async () => {
        if (!session) return;
        const { session: view } = await api.post<{ session: PracticeSessionView }>(`/v1/practice/sessions/${session.id}/finish`, {});
        toSummary(view);
      }),
    setHintLevel: (level: number) => {
      if (phase?.kind === 'question' && level > phase.item.hint_level) set({ ...phase, item: { ...phase.item, hint_level: level } });
    },
  };
}

export type PracticeSessionState = ReturnType<typeof usePracticeSession>;
