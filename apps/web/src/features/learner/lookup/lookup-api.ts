'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useApi } from '@/app-shell/session/session-context';

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
/** The parts of speech `GET /v1/words?pos=` accepts (API `VALID_POS`), in the order the filter lists them. */
export const POS = [
  'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'determiner', 'conjunction', 'number', 'modal auxiliary',
  'be-verb', 'do-verb', 'have-verb', 'infinitive-to', 'interjection',
] as const;

export type LookupParams = { q?: string; level?: string; topic?: string; pos?: string; mine?: boolean };
/** `GET /v1/words` item. */
export type WordRow = { lemma: string; pos_list: string[]; level: string | null; meaning_preview: string; has_private: boolean };

/** The lookup state lives in the URL (`/app/lookup?q=&level=&topic=&pos=&mine=`); values the API would refuse are dropped. */
export function parseLookup(params: URLSearchParams): LookupParams {
  const q = params.get('q')?.trim() || undefined;
  const level = params.get('level') ?? '';
  const topic = params.get('topic') ?? '';
  const pos = params.get('pos') ?? '';
  return {
    ...(q ? { q } : {}),
    ...((LEVELS as readonly string[]).includes(level) ? { level } : {}),
    ...(/^[a-z0-9-]+$/.test(topic) ? { topic } : {}),
    ...((POS as readonly string[]).includes(pos) ? { pos } : {}),
    ...(params.get('mine') === 'true' ? { mine: true } : {}),
  };
}

/** Query string in one fixed order: q, level, topic, pos, mine. */
export function lookupQuery(p: LookupParams): string {
  const entries: Array<[string, string]> = [];
  if (p.q) entries.push(['q', p.q]);
  if (p.level) entries.push(['level', p.level]);
  if (p.topic) entries.push(['topic', p.topic]);
  if (p.pos) entries.push(['pos', p.pos]);
  if (p.mine) entries.push(['mine', 'true']);
  return new URLSearchParams(entries).toString();
}

export const lookupHref = (locale: string, p: LookupParams) => {
  const query = lookupQuery(p);
  return `/${locale}/app/lookup${query ? `?${query}` : ''}`;
};

const PAGE_SIZE = 20;

export function useWordSearch(p: LookupParams) {
  const api = useApi();
  const query = lookupQuery(p);
  return useInfiniteQuery({
    queryKey: ['words', query],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api.get<{ items: WordRow[]; next_page_token: string | null }>(
        `/v1/words?page_size=${PAGE_SIZE}${query ? `&${query}` : ''}${pageParam ? `&page_token=${encodeURIComponent(pageParam)}` : ''}`,
      ),
    getNextPageParam: (last) => last.next_page_token,
  });
}

export function useTopics() {
  const api = useApi();
  return useQuery({
    queryKey: ['topics'],
    queryFn: () => api.get<{ items: Array<{ code: string; name: string }> }>('/v1/topics'),
    staleTime: 10 * 60_000,
  });
}
