'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/app-shell/session/session-context';
import type { PageSense } from '../word/word-api';

export type LookupSense = Omit<PageSense, 'sentence_count'>;
/** `GET /v1/lookup?q=`: the word's own senses, and the bases it is a form of (`senses` may be empty: the base has no meaning yet). */
export type LookupResult = {
  senses: LookupSense[];
  via_inflection: Array<{ kind: string; base: { entry_id: string; lemma: string; pos: string }; senses: LookupSense[] }>;
};
export type QuickAddBody = {
  group_id: string;
  sense_id?: string;
  new_word?: { lemma: string; meaning: string; form_of?: { entry_id: string; kind: string } };
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
