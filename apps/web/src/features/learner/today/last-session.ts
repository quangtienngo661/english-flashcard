'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/app-shell/session/session-context';

/** `GET /v1/practice/sessions/last` (Practice LastSessionService): the practice session with the newest graded answer. */
export type LastSessionView = {
  id: string;
  group_id: string | null;
  /** The learner's day of that answer, `YYYY-MM-DD`. */
  local_date: string;
  last_answer_at: string;
  finished: boolean;
  questions: number;
  correct: number;
  wrong_count: number;
  /** Distinct lemmas answered wrong, in answer order, at most 4. */
  wrong_lemmas: string[];
};

export const LAST_SESSION_KEY = ['practice', 'sessions', 'last'] as const;

/** The last practice session, or `null` when the learner has none yet (204). */
export function useLastSession() {
  const api = useApi();
  return useQuery({
    queryKey: LAST_SESSION_KEY,
    queryFn: async () => (await api.get<LastSessionView | undefined>('/v1/practice/sessions/last')) ?? null,
  });
}
