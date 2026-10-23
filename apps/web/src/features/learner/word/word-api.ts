'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/app-shell/session/session-context';

export type FormOf = { entry_id: string; lemma: string; pos: string; kind: string };
/** `GET /v1/words/{lemma}` sense (API `WordPageSense`). */
export type PageSense = {
  sense_id: string;
  entry_id: string;
  scope: 'catalog' | 'private';
  lemma: string;
  pos: string;
  level: string | null;
  context_label: string | null;
  meaning: { text: string; language: 'vi' | 'en'; translation_missing: boolean };
  definition_en: string | null;
  examples: string[];
  topics: Array<{ code: string; name: string }>;
  form_of: FormOf | null;
  ai_suggested: boolean;
  sentence_count: number;
};
export type Inflection = { kind: string; form: string; has_page: boolean };
export type WordPageData = { lemma: string; inflections: Inflection[]; sections: Array<{ pos: string; senses: PageSense[] }> };
/** `GET /v1/items?sense_ids=` row. */
export type ItemState = { sense_id: string; item_id: string; level: number; due_date: string; priority: boolean; group_ids: string[] };
export type Sentence = { id: string; text: string; created_at: string };

export const wordKey = (lemma: string) => ['word', lemma] as const;
export const sentencesKey = (senseId: string) => ['sentences', senseId] as const;
export const wordHref = (locale: string, lemma: string) => `/${locale}/app/word?w=${encodeURIComponent(lemma)}`;

/** The word page matches the lemma exactly (D42): "Go" and "go" are two pages. */
export function useWordPage(lemma: string | null) {
  const api = useApi();
  return useQuery({
    queryKey: wordKey(lemma ?? ''),
    queryFn: () => api.get<WordPageData>(`/v1/words/${encodeURIComponent(lemma!)}`),
    enabled: lemma !== null,
  });
}

/** Which of the page's senses the learner already learns, and in which decks (≤ 100 ids; a word has far fewer senses). */
export function useSenseItems(senseIds: string[]) {
  const api = useApi();
  return useQuery({
    queryKey: ['items', 'by-sense', senseIds.join(',')],
    queryFn: async () => {
      const { items } = await api.get<{ items: ItemState[] }>(`/v1/items?sense_ids=${senseIds.join(',')}`);
      return new Map(items.map((item) => [item.sense_id, item]));
    },
    enabled: senseIds.length > 0,
  });
}

export function useSentences(senseId: string | null) {
  const api = useApi();
  return useQuery({
    queryKey: sentencesKey(senseId ?? ''),
    queryFn: () => api.get<{ items: Sentence[] }>(`/v1/senses/${senseId}/sentences`),
    enabled: senseId !== null,
  });
}

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** "A1 – A2" from the senses' levels; one level alone, or null when none has a level. */
export function levelRange(senses: PageSense[]): string | null {
  const ranks = senses.map((s) => LEVELS.indexOf(s.level ?? '')).filter((r) => r >= 0);
  if (ranks.length === 0) return null;
  const low = LEVELS[Math.min(...ranks)];
  const high = LEVELS[Math.max(...ranks)];
  return low === high ? low : `${low} – ${high}`;
}

/** Days between reviews at each stage (TV9): level 0 is "new", 1..5 → 1, 3, 7, 14, 30 days. */
export const STAGE_DAYS = [0, 1, 3, 7, 14, 30] as const;
