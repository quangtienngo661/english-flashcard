'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { NetworkError } from '@/app-shell/api/problem';
import { useApi } from '@/app-shell/session/session-context';
import { GROUPS_KEY, groupKey, type Card } from '../groups/groups-api';

export type Answer = 'known' | 'review';
type Pending = { itemId: string; answer: Answer; reviewId: string };

/**
 * One review session over a deck's queue, read once when the page opens; nothing is kept in the browser, so a reload starts
 * again from the queue (Review Focus 4). Each press is one `POST /reviews` with a new `review_id` (the API's dedupe key);
 * after a lost connection the same press keeps its id, so a retry cannot count twice (E19).
 */
export function useReviewQueue(groupId: string | null, mode: 'due' | 'all') {
  const api = useApi();
  const client = useQueryClient();
  // The cards are read once: after that the query is disabled, so "Thử lại" on the offline band (refetch of every active
  // query) cannot swap the deck under the learner's position.
  const [loaded, setLoaded] = useState(false);
  const queue = useQuery({
    queryKey: ['review-session', groupId, mode],
    queryFn: async () => {
      const result = await api.get<{ cards: Card[] }>(`/v1/groups/${groupId}/queue?mode=${mode}`);
      setLoaded(true);
      return result;
    },
    enabled: groupId !== null && !loaded,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const cards = queue.data?.cards ?? [];
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [counts, setCounts] = useState({ known: 0, review: 0 });
  const [ended, setEnded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const busyRef = useRef(false);
  const pendingRef = useRef<Pending | null>(null);

  const card = cards[index] as Card | undefined;
  const done = ended || (queue.isSuccess && index >= cards.length && cards.length > 0);

  async function answer(value: Answer) {
    if (!card || !flipped || busyRef.current || done) return;
    const kept = pendingRef.current;
    const pending = kept && kept.itemId === card.item_id && kept.answer === value ? kept : { itemId: card.item_id, answer: value, reviewId: crypto.randomUUID() };
    pendingRef.current = pending;
    busyRef.current = true;
    setBusy(true);
    try {
      await api.post('/v1/reviews', { item_id: card.item_id, group_id: groupId, answer: value, review_id: pending.reviewId });
      pendingRef.current = null;
      setError(null);
      setCounts((c) => ({ ...c, [value]: c[value] + 1 }));
      setIndex((i) => i + 1);
      setFlipped(false);
      if (groupId) void client.invalidateQueries({ queryKey: groupKey(groupId) });
      void client.invalidateQueries({ queryKey: GROUPS_KEY });
    } catch (e) {
      // Only an unanswered request may still have landed; any other failure makes the next press a new one.
      if (!(e instanceof NetworkError)) pendingRef.current = null;
      setError(e);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return {
    queue,
    cards,
    card,
    index,
    flipped,
    flip: () => card && !done && setFlipped(true),
    answer,
    busy,
    error,
    counts,
    done,
    end: () => setEnded(true),
  };
}
