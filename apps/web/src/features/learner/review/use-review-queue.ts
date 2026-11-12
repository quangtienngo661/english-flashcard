'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { NetworkError } from '@/app-shell/api/problem';
import { useApi } from '@/app-shell/session/session-context';
import { showStreak } from '@/ui/StreakToast';
import { writeStreak } from '../calendar/calendar-api';
import { GROUPS_KEY, groupKey, type Card } from '../groups/groups-api';

export type Answer = 'known' | 'review';
export type QueueMode = 'due' | 'new' | 'all';
/** One answered card: its place in the deck, its answer and the review_id its save uses. */
type Result = { index: number; card: Card; answer: Answer; reviewId: string };

/**
 * One Học session over a deck's queue, read once when the page opens; nothing is kept in the browser, so a reload starts again from
 * the queue (Review Focus 4).
 *
 * QM5-2 = (a) (owner 11/11/2026): an answer moves on at once and its `POST /reviews` runs behind, one at a time in answer order, so a
 * second press acts on the next card. When a save is lost the session steps back to that card, turned over, with the error; any
 * later answer not yet sent is undone with it. A network loss keeps the card's review_id, so pressing the same answer again cannot
 * count twice (E19); another answer, or another kind of failure, gets a new id.
 */
export function useReviewQueue(groupId: string | null, mode: QueueMode) {
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
  const [results, setResults] = useState<Result[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [ended, setEnded] = useState(false);
  const [saving, setSaving] = useState(0);
  const [error, setError] = useState<unknown>(null);
  /** The answers not yet saved, in order; the first one is in flight. */
  const unsaved = useRef<Result[]>([]);
  const sending = useRef(false);
  /** After a lost connection: the card and answer whose id a retry must reuse. */
  const kept = useRef<{ itemId: string; answer: Answer; reviewId: string } | null>(null);

  const index = results.length;
  const card = cards[index] as Card | undefined;
  // R107: the summary waits for every save; Esc or the last card while one is open shows "finishing" instead.
  const over = ended || (queue.isSuccess && cards.length > 0 && index >= cards.length);
  const done = over && saving === 0;
  const finishing = over && saving > 0;
  const counts = {
    known: results.filter((r) => r.answer === 'known').length,
    review: results.filter((r) => r.answer === 'review').length,
  };

  async function drain() {
    if (sending.current) return;
    sending.current = true;
    try {
      while (unsaved.current.length > 0) {
        const next = unsaved.current[0];
        try {
          const saved = await api.post<{ streak?: { days: number } | null }>('/v1/reviews', {
            item_id: next.card.item_id, group_id: groupId, answer: next.answer, review_id: next.reviewId,
          });
          unsaved.current.shift();
          setSaving(unsaved.current.length);
          if (kept.current?.itemId === next.card.item_id) kept.current = null;
          // Đợt C DC9: only the first study of the learner's day carries it.
          if (saved?.streak) {
            showStreak(saved.streak.days);
            writeStreak(client, saved.streak.days);
          }
          if (groupId) void client.invalidateQueries({ queryKey: groupKey(groupId) });
          void client.invalidateQueries({ queryKey: GROUPS_KEY });
        } catch (e) {
          // Step back to the lost card and undo the answers behind it; only an unanswered request may still have landed.
          kept.current = e instanceof NetworkError ? { itemId: next.card.item_id, answer: next.answer, reviewId: next.reviewId } : null;
          unsaved.current = [];
          setSaving(0);
          setResults((list) => list.slice(0, next.index));
          setFlipped(true);
          setEnded(false);
          setError(e);
          break;
        }
      }
    } finally {
      sending.current = false;
    }
  }

  /** Returns false when the card is not turned over yet (the caller shows why). */
  function answer(value: Answer): boolean {
    if (!card || over) return true;
    if (!flipped) return false;
    const keep = kept.current;
    const reviewId = keep && keep.itemId === card.item_id && keep.answer === value ? keep.reviewId : crypto.randomUUID();
    const result: Result = { index, card, answer: value, reviewId };
    setResults((list) => [...list, result]);
    setFlipped(false);
    setError(null);
    unsaved.current.push(result);
    setSaving(unsaved.current.length);
    void drain();
    return true;
  }

  return {
    queue,
    cards,
    card,
    index,
    flipped,
    /** Space turns the card both ways (prototype chong-the-mo.html:274-280). */
    flip: () => card && !over && setFlipped((f) => !f),
    answer,
    results,
    saving: saving > 0,
    error,
    counts,
    done,
    finishing,
    end: () => setEnded(true),
  };
}
