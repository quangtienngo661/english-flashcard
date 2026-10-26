'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { ENTITLEMENTS_KEY } from '@/app-shell/queries';
import { useApi } from '@/app-shell/session/session-context';

export type Source = 'today' | 'group' | 'weak' | 'priority' | 'all';
/** The three question types without AI (Bước 4); the AI ones come with M5a. */
export const RULE_TYPES = ['mcq_definition', 'true_false_definition', 'type_word'] as const;
export type RuleType = (typeof RULE_TYPES)[number];
/** The AI switch's three question types (Bước 7; Trial and Pro). Its `cloze` is AI-written; the own-sentences switch sends `cloze_source: 'own'` (đợt cải thiện A, C3). */
export const AI_TYPES = ['cloze', 'meaning_in_sentence', 'mcq_sentence'] as const;
export type AiType = (typeof AI_TYPES)[number];
export type QuestionType = RuleType | AiType;

/** Why a start with AI types was refused, shown inside the customise dialog (K/71, K/72, E24). */
export type AiStartProblem =
  | { kind: 'quota'; needed: number; remaining: number; resetsAt: string | null }
  | { kind: 'unavailable' }
  | { kind: 'locked' };
export type GroupFilter = 'all' | 'due' | 'priority' | '0' | '1' | '2' | '3' | '4' | '5';
export const SORTS = ['queue', 'level_asc', 'overdue_first', 'new_first', 'least_practiced', 'most_wrong', 'priority_oldest', 'random'] as const;
export type Sort = (typeof SORTS)[number];
export type PromptStyle = 'meaning' | 'sentence' | 'mixed';

/** Bước 4 design §7.1: the order a source uses unless the learner picks another. */
export const DEFAULT_SORT: Record<Source, Sort> = {
  today: 'queue', group: 'queue', weak: 'level_asc', priority: 'priority_oldest', all: 'least_practiced',
};

/** `POST /v1/practice/sessions` body (Bước 4 §6, API (b) for `group_id` with `weak`). */
export type StartBody = {
  source: Source;
  group_id?: string;
  group_filter?: GroupFilter;
  sort?: Sort;
  types: QuestionType[];
  cloze_source?: 'own';
  prompt_style?: PromptStyle;
  count?: number;
};

/** The session as the API shows it (`SessionView`). */
export type PracticeSessionView = {
  id: string;
  source: Source;
  group_id: string | null;
  group_filter: GroupFilter | null;
  sort: Sort;
  types: QuestionType[];
  prompt_style: string;
  target_count: number;
  status: 'active' | 'waiting_continue' | 'finished' | 'abandoned';
  round: number;
  /** Questions given so far, the one on screen included. */
  asked: number;
  words: number;
  ai_planned: number;
  cloze_source: 'ai' | 'own' | null;
};

export type CurrentItem = { item_id: string; state: 'unanswered' | 'try_again' };
export type CurrentSession = { session: PracticeSessionView; item: CurrentItem | null; preparing: boolean };

export type WeakWord = {
  sense_id: string;
  lemma: string;
  wrong: number;
  counted: number;
  level: number;
  last_wrong_at: string;
  meaning: string | null;
};
export type WeakGroups = { total: number; items: Array<{ group_id: string; name: string; count: number }> };

/** `GET /v1/practice/history` row (Bước 4 §8). `answer`: "0"…"3" for a choice, "true"/"false", or the typed text. */
export type HistoryItem = {
  item_id: string;
  session_id: string;
  sense_id: string;
  lemma: string;
  type: QuestionType;
  prompt_style: string;
  prompt: { kind: string; options?: string[]; meaning?: string; lemma?: string; sentence?: string };
  answer: string | null;
  correct: { lemma: string; text: string; choice_index: number | null; is_true: boolean | null };
  result: 'correct' | 'wrong';
  skipped: boolean;
  tries: number;
  hint_level: number;
  review_action: string | null;
  answered_at: string;
  local_date: string;
  translation: string | null;
};

export const CURRENT_KEY = ['practice', 'current'] as const;

/** The open session, or null when there is none (404). */
export function useCurrentSession() {
  const api = useApi();
  return useQuery({
    queryKey: CURRENT_KEY,
    queryFn: async () => {
      try {
        return await api.get<CurrentSession>('/v1/practice/sessions/current');
      } catch (error) {
        if (error instanceof ApiError && error.problem.status === 404) return null;
        throw error;
      }
    },
  });
}

export function useWeakGroups() {
  const api = useApi();
  return useQuery({ queryKey: ['practice', 'weak-groups'], queryFn: () => api.get<WeakGroups>('/v1/practice/weak-words/groups') });
}

/** The newest weak words (K/51 chips). */
export function useWeakPreview(size: number) {
  const api = useApi();
  return useQuery({
    queryKey: ['practice', 'weak-preview', size],
    queryFn: () => api.get<{ items: WeakWord[]; next_page_token: string | null }>(`/v1/practice/weak-words?page_size=${size}`),
  });
}

export function useRecentHistory(size: number) {
  const api = useApi();
  return useQuery({
    queryKey: ['practice', 'recent', size],
    queryFn: () => api.get<{ items: HistoryItem[]; next_page_token: string | null }>(`/v1/practice/history?page_size=${size}`),
  });
}

/** `POST /v1/practice/sessions` `[I]`; the API closes any open session first. */
export function useStartSession() {
  const api = useApi();
  const client = useQueryClient();
  return useCallback(
    async (body: StartBody, key: string) => {
      try {
        return await api.post<{ session: PracticeSessionView }>('/v1/practice/sessions', body, { idempotencyKey: key });
      } catch (error) {
        // E25: the pools changed under the page; read them again.
        if (error instanceof ApiError && error.problem.slug === 'quota-exhausted') void client.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
        throw error;
      }
    },
    [api, client],
  );
}

/** How many questions of the open session are done: the one on screen does not count until it is answered. */
export function doneCount(current: CurrentSession): number {
  return Math.max(0, current.session.asked - (current.item ? 1 : 0));
}

/** `GET /v1/practice/reports` row (D27 Bước 7): `refunded` says what became of the AI credit. */
export type MyReport = {
  id: string;
  item_id: string;
  sense_id: string;
  reason_label: string;
  status: 'open' | 'no_error' | 'fixed' | 'confirmed';
  refunded: boolean | null;
  created_at: string;
  resolved_at: string | null;
};
