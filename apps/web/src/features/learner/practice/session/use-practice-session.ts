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
  /** The asked word is the learner's own (K/81). Absent from an older API: treated as false. */
  private_word?: boolean;
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
export type AiReason = 'ai-failed' | 'quota-exhausted' | 'plan-required' | 'ai-unavailable';
/** Bước 7 §6.6 fields sent with a question or with `ai_unavailable`. */
type AiFields = { notice?: string; ai_reason?: AiReason; resets_at?: string; sense_id?: string; lemma?: string | null };
type NextResult =
  | ({ state: 'question'; session: PracticeSessionView; item: Item } & AiFields)
  | { state: 'waiting_continue' | 'finished'; session: PracticeSessionView }
  | { state: 'preparing'; session: PracticeSessionView; retry_after_seconds: number }
  | ({ state: 'ai_unavailable'; session: PracticeSessionView; reason: AiReason } & AiFields);

/** The band over a question (K/75, K/75b, K/76): shown once, the API sends it once per session. */
export type SessionNotice =
  | { kind: 'ai-fallback'; reason: AiReason; resetsAt: string | null }
  | { kind: 'word-not-recognized'; senseId: string; lemma: string | null };

export type Outcome = { kind: 'try_again'; tries: number } | { kind: 'final'; result: AnswerResult; chosen: AnswerBody | null };
export type Phase =
  | { kind: 'question'; item: Item; outcome: Outcome | null; notice?: SessionNotice | null }
  /** K/73: the next AI question is still being written. */
  | { kind: 'preparing' }
  /** K/74a–K/74d: no AI question can be made now; the session stays open. */
  | { kind: 'ai_stopped'; reason: AiReason; resetsAt: string | null; lemma: string | null }
  | { kind: 'round' }
  | { kind: 'summary' }
  | { kind: 'advancing' }
  | { kind: 'none' }
  | { kind: 'closed' };

export type SummaryWord = { sense_id: string; lemma: string; meaning: string; item_id: string; action: 'needs_review' | 'known' | null };
export type Summary = { session: PracticeSessionView; asked: number; correct: number; wrong: number; words: SummaryWord[] };

const isSlug = (error: unknown, slug: string) => error instanceof ApiError && error.problem.slug === slug;
/** E29: after this long in "Đang tạo câu…" the learner gets the general error instead of waiting on. */
const PREPARING_LIMIT_SECONDS = 60;

function noticeOf(next: AiFields): SessionNotice | null {
  if (next.notice === 'ai-fallback' && next.ai_reason) return { kind: 'ai-fallback', reason: next.ai_reason, resetsAt: next.resets_at ?? null };
  if (next.notice === 'word-not-recognized' && next.sense_id) return { kind: 'word-not-recognized', senseId: next.sense_id, lemma: next.lemma ?? null };
  return null;
}

/** Whether the session asks AI questions (Bước 7), so it makes them ahead with `prepare`. */
export const asksAi = (session: PracticeSessionView) =>
  session.types.some((type) => type === 'meaning_in_sentence' || type === 'mcq_sentence' || (type === 'cloze' && session.cloze_source === 'ai'));

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

  async function advanceNow(id: string, retryAi = false, waited = 0): Promise<void> {
    const next = await api.post<NextResult>(`/v1/practice/sessions/${id}/next`, retryAi ? { retry_ai: true } : {});
    if (next.state === 'question') set({ kind: 'question', item: next.item, outcome: null, notice: noticeOf(next) }, next.session);
    else if (next.state === 'waiting_continue') set({ kind: 'round' }, next.session);
    else if (next.state === 'finished') toSummary(next.session);
    else if (next.state === 'preparing') {
      if (waited >= PREPARING_LIMIT_SECONDS) {
        set({ kind: 'ai_stopped', reason: 'ai-failed', resetsAt: null, lemma: null }, next.session);
        return;
      }
      set({ kind: 'preparing' }, next.session);
      await new Promise((resolve) => setTimeout(resolve, next.retry_after_seconds * 1000));
      try {
        return await advanceNow(id, false, waited + next.retry_after_seconds);
      } catch (e) {
        // Review I1: a failed poll must not leave "Đang tạo câu…" up for good; the general error has [Thử lại].
        if (isSlug(e, 'session-closed')) throw e;
        set({ kind: 'ai_stopped', reason: 'ai-failed', resetsAt: null, lemma: null });
      }
    } else if (next.state === 'ai_unavailable') {
      set({
        kind: 'ai_stopped', reason: next.reason, resetsAt: next.resets_at ?? null,
        lemma: next.notice === 'word-not-recognized' ? (next.lemma ?? null) : null,
      }, next.session);
    }
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

  // Bước 7 §6.4: once a question is on screen, ask the API to write the next AI questions; never awaited, errors ignored.
  const shownItemId = phase?.kind === 'question' ? phase.item.item_id : null;
  const prepareFor = shownItemId !== null && session && asksAi(session) ? session.id : null;
  useEffect(() => {
    if (shownItemId === null || prepareFor === null) return;
    void api.post(`/v1/practice/sessions/${prepareFor}/prepare`, {}).catch(() => {});
    // One call per question shown: the item id alone decides it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownItemId]);

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
    // The band stays with its question: K/76 names the word and links to it once the answer is shown (review I3).
    const notice = phase?.kind === 'question' ? phase.notice : null;
    set({ kind: 'question', item: { ...item, hint_level: result.hint_level }, outcome: { kind: 'final', result, chosen }, notice });
  }

  async function answer(body: AnswerBody) {
    if (phase?.kind !== 'question' || phase.outcome?.kind === 'final' || answerOnce.busy || busyRef.current) return;
    const item = phase.item;
    chosenRef.current = { itemId: item.item_id, body };
    setError(null);
    try {
      const response = await answerOnce.submit(`${item.item_id}:${JSON.stringify(body)}`);
      if (!response) return;
      if (response.result === 'try_again') {
        set({ kind: 'question', item: { ...item, state: 'try_again', tries: response.tries }, outcome: { kind: 'try_again', tries: response.tries }, notice: phase.notice });
      }
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
    /** K/74a, K/74d [Thử lại]: ask again with `retry_ai` (Bước 7 §6.6). */
    retryAi: () =>
      guarded(async () => {
        if (session) await advanceNow(session.id, true);
      }),
    dismissNotice: () => {
      if (phase?.kind === 'question') set({ ...phase, notice: null });
    },
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
