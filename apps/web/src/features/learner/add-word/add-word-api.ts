'use client';

import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/app-shell/api/problem';
import { useApi } from '@/app-shell/session/session-context';
import type { PageSense } from '../word/word-api';

export type LookupSense = Omit<PageSense, 'sentence_count'>;
/** `GET /v1/lookup?q=`: the word's own senses, and the bases it is a form of (`senses` may be empty: the base has no meaning yet). */
export type LookupResult = {
  senses: LookupSense[];
  via_inflection: Array<{ kind: string; base: { entry_id: string; lemma: string; pos: string }; senses: LookupSense[] }>;
};
export type QuickAddBody = {
  /** QP1: every group the word joins, in one transaction (1 to 10). */
  group_ids: string[];
  sense_id?: string;
  new_word?: {
    lemma: string;
    meaning: string;
    pos?: string;
    level?: string;
    topics?: string[];
    form_of?: { entry_id: string; kind: string };
    /** Bước 7 §11.2: the AI suggestion's examples as edited (≤ 2), and that the word came from AI. */
    examples?: string[];
    /** Đợt C (H10): the learner's own IPA, without slashes. */
    ipa?: string;
    ai_suggestion?: boolean;
  };
  sentence?: string;
};
export type QuickAddResult = { item_id: string; sense_id: string; created_item: boolean; created_word: boolean; sentence_id: string | null };

export function useLookup(q: string) {
  const api = useApi();
  const word = q.trim().toLowerCase();
  return useQuery({
    queryKey: ['lookup', word],
    queryFn: () => api.get<LookupResult>(`/v1/lookup?q=${encodeURIComponent(word)}`),
    enabled: word.length > 0 && word.length <= 100,
    staleTime: 60_000,
  });
}

/** The most groups one quick add can name (the API refuses more). */
export const QUICK_ADD_GROUPS_MAX = 10;

/** A 409 `group-full` from quick add names the full group in its `group_id` extension; null when the error is something else. */
export function fullGroupId(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.problem.slug !== 'group-full') return null;
  const id = error.problem.extensions?.group_id;
  return typeof id === 'string' ? id : null;
}
