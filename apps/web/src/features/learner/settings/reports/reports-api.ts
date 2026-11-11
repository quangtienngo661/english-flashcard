'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useApi } from '@/app-shell/session/session-context';
import type { QuestionType } from '../../practice/practice-api';

/**
 * `GET /v1/practice/reports` row (D27 Bước 7; M6.1 adds `lemma`, `question_type`, `ai`). `refunded`: true returned, null not tried yet,
 * false not returnable. `lemma` is null when the sense is no longer visible.
 */
export type MyReport = {
  id: string;
  item_id: string | null;
  sense_id: string;
  reason_label: string;
  status: 'open' | 'no_error' | 'fixed' | 'confirmed';
  refunded: boolean | null;
  created_at: string;
  resolved_at: string | null;
  lemma: string | null;
  question_type: QuestionType | null;
  ai: boolean;
};

export const MY_REPORTS_KEY = ['practice', 'my-reports'] as const;

/** The learner's reports, newest first, 20 a page; one request gives the words too (no `GET /v1/senses/{id}` per row any more). */
export function useMyReports() {
  const api = useApi();
  return useInfiniteQuery({
    queryKey: MY_REPORTS_KEY,
    queryFn: ({ pageParam }) =>
      api.get<{ items: MyReport[]; next_page_token: string | null }>(
        `/v1/practice/reports?page_size=20${pageParam ? `&page_token=${encodeURIComponent(pageParam)}` : ''}`,
      ),
    initialPageParam: '',
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
}
