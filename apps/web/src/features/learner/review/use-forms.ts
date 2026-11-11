'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/app-shell/session/session-context';

type WordPage = { inflections: Array<{ kind: string; form: string }> };

/** The forms of a lemma come from its word page (the queue does not carry them); the card shows none until they arrive. */
export function useForms(lemma: string | undefined) {
  const api = useApi();
  const word = useQuery({
    queryKey: ['word', lemma],
    queryFn: () => api.get<WordPage>(`/v1/words/${encodeURIComponent(lemma!)}`),
    enabled: lemma !== undefined,
    staleTime: Infinity,
    retry: false,
  });
  return [...new Set((word.data?.inflections ?? []).map((i) => i.form))];
}
