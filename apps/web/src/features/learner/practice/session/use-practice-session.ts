'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { ENTITLEMENTS_KEY } from '@/app-shell/queries';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { showStreak } from '@/ui/StreakToast';
import { writeStreak } from '../../calendar/calendar-api';
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
  /** The question was written by AI (cloze-own-then-ai): the "câu AI" chip and the AI report reasons follow it. */
  ai?: boolean;
};

/** One word of an alternative answer (API `AlternativeRow`): the word typed (credited) or the word asked, each with its own button state. */
export type AlternativeRow = {
  sense_id: string; lemma: string; meaning: string; role: 'typed' | 'asked'; show_known: boolean; action: 'needs_review' | 'known' | null;
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
  /** Set for an AI fill-in answered with a declared session word: the two rows of the card. Absent from an older API. */
  alternative?: { typed: string; rows: AlternativeRow[] } | null;
  /** Đợt C (H6): what the answer did to the schedule, in an Ôn session only. */
  schedule?: { level: number; due_date: string; outcome: 'leveled_up' | 'kept' } | null;
  /** Đợt C (H6): the study streak, on the first study of the learner's day only. */
  streak?: { days: number } | null;
  /** M5.1: the word's stage (0–5) after the answer; null once it left the schedule. Absent from an older API. */
  level?: number | null;
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

/** `reason: 'session_word'`: the typed word is another word of this session (session synonyms); an older API sends none. */
export type TryAgainReason = 'session_word' | null;
/** `typed`: the wrong word just typed, shown in the sentence's blank with "lần N" (Figma 178:5326). */
export type Outcome =
  | { kind: 'try_again'; tries: number; reason: TryAgainReason; typed: string | null }
  | { kind: 'final'; result: AnswerResult; chosen: AnswerBody | null };
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
  /** Đợt C: an Ôn session of a deck with no learned word (409 `practice-no-words`, reason `nothing-learned`). */
  | { kind: 'nothing_learned' }
  | { kind: 'closed' };

export type SummaryWord = { sense_id: string; lemma: string; meaning: string; item_id: string; action: 'needs_review' | 'known' | null };
/** `alternatives`: how many of the right answers were alternative answers; absent from an older API. */
export type Summary = {
  session: PracticeSessionView; asked: number; correct: number; wrong: number; alternatives?: number; words: SummaryWord[];
  /** Đợt C (H7): an Ôn session only. */
  recall?: { leveled_up: number; correct_kept: number } | null;
};

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
  session.types.some((type) => type === 'meaning_in_sentence' || type === 'mcq_sentence'
    || (type === 'cloze' && (session.cloze_source === 'ai' || session.cloze_source === 'own_then_ai')));

/**
 * One practice session (K/60–K/67). Nothing is kept in the browser: the page reads `GET /practice/sessions/current` once and
 * the API knows where the learner is, so a reload or Back resumes (Review Focus 4). Each answer press is one `[I]` write.
 * Đợt C: with `recall`, the page starts an Ôn session of that deck instead (one key per page, so a double mount starts one);
 * a reload starts a new one, which closes the old Ôn session but never the open practice session.
 */
export function usePracticeSession(recall?: { groupId: string }) {
  const api = useApi();
  const client = useQueryClient();
  // Read once (as the review queue): a refetch must not swap the question under the learner.
  const [loaded, setLoaded] = useState(false);
  const [startKey] = useState(() => crypto.randomUUID());
  const load = useQuery({
    queryKey: ['practice', 'session-load', recall?.groupId ?? null],
    queryFn: async (): Promise<{ session: PracticeSessionView; item: Item | null; preparing: boolean } | null | 'nothing_learned'> => {
      if (recall) {
        try {
          const started = await api.post<{ session: PracticeSessionView }>(
            '/v1/practice/sessions', { kind: 'recall', source: 'group', group_id: recall.groupId }, { idempotencyKey: startKey });
          setLoaded(true);
          return { session: started.session, item: null, preparing: false };
        } catch (error) {
          if (isSlug(error, 'practice-no-words') && (error as ApiError).problem.extensions?.reason === 'nothing-learned') {
            setLoaded(true);
            return 'nothing_learned';
          }
          throw error;
        }
      }
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
  // The bar's ✓/✗ (M5.4): the last session view's counts plus the answers graded on this page since that view.
  const [graded, setGraded] = useState({ correct: 0, wrong: 0 });
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const advanceStarted = useRef(false);

  let phase: Phase | null = own?.phase ?? null;
  let session = own?.session ?? null;
  if (!own && load.data !== undefined) {
    const data = load.data === 'nothing_learned' ? null : load.data;
    session = data?.session ?? null;
    phase = load.data === 'nothing_learned' ? { kind: 'nothing_learned' } : data === null ? { kind: 'none' }
      : data.item ? { kind: 'question', item: data.item, outcome: null }
        : data.session.status === 'waiting_continue' ? { kind: 'round' } : { kind: 'advancing' };
  }

  const set = (next: Phase, view?: PracticeSessionView) => {
    // A new view counts every graded answer itself (M5.1).
    if (view) setGraded({ correct: 0, wrong: 0 });
    setOwn((prev) => ({ phase: next, session: view ?? prev?.session ?? session }));
  };

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
      return await api.post<AnswerResult | { result: 'try_again'; tries: number; reason?: TryAgainReason }>(`/v1/practice/items/${itemId}/answer`, body, { idempotencyKey: key });
    } catch (e) {
      // E36: answered in another tab; the API sends the result.
      const other = e instanceof ApiError && e.problem.slug === 'already-answered' ? e.problem.extensions?.result : undefined;
      if (other) return other as AnswerResult;
      throw e;
    }
  });

  function recordFinal(item: Item, result: AnswerResult, chosen: AnswerBody | null) {
    // Đợt C DC9: only the first study of the learner's day carries it (an answer from another tab carries none).
    if (result.streak) {
      showStreak(result.streak.days);
      writeStreak(client, result.streak.days);
    }
    setGraded((g) => ({ ...g, [result.result]: g[result.result] + 1 }));
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
        const typed = 'text' in body ? body.text : null;
        set({ kind: 'question', item: { ...item, state: 'try_again', tries: response.tries }, outcome: { kind: 'try_again', tries: response.tries, reason: response.reason ?? null, typed }, notice: phase.notice });
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
    counts: { correct: (session?.correct ?? 0) + graded.correct, wrong: (session?.wrong ?? 0) + graded.wrong },
    error,
    busy: busy || answerOnce.busy,
    reported,
    markReported: (itemId: string) => setReported((s) => new Set(s).add(itemId)),
    answer,
    skip: () =>
      guarded(async () => {
        if (phase?.kind !== 'question') return;
        const item = phase.item;
        // M5.9: the word typed before "Xem đáp án" stays, so the sentence and Ôn's compare line can show it against the answer.
        const typedBefore = phase.outcome?.kind === 'try_again' ? phase.outcome.typed : null;
        recordFinal(item, await api.post<AnswerResult>(`/v1/practice/items/${item.item_id}/skip`, {}), typedBefore ? { text: typedBefore } : null);
      }),
    /** Cần ôn lại / Đã biết on one row of an alternative card: reviews that word only and stays on the card (session synonyms design §3.2). */
    reviewWord: (senseId: string, action: 'needs_review' | 'known') =>
      guarded(async () => {
        if (phase?.kind !== 'question' || phase.outcome?.kind !== 'final') return;
        const { item, outcome } = phase;
        const alternative = outcome.result.alternative;
        if (!alternative) return;
        await api.post(`/v1/practice/items/${item.item_id}/review`, { action, sense_id: senseId });
        void client.invalidateQueries({ queryKey: GROUPS_KEY });
        const rows = alternative.rows.map((row) => (row.sense_id === senseId ? { ...row, action } : row));
        set({ ...phase, outcome: { ...outcome, result: { ...outcome.result, alternative: { ...alternative, rows } } } });
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
