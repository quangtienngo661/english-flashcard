'use client';

import { useQuery } from '@tanstack/react-query';
import type { ApiClient } from '@/app-shell/api/client';
import { useApi } from '@/app-shell/session/session-context';

export const TOPIC_PICKER_KEY = ['topic-picker'] as const;
export const TOPIC_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export type TopicScope = { topic: string; level: (typeof TOPIC_LEVELS)[number] };
export type TopicTarget = { group_id: string } | { new_group_name: string };
export type TopicAddBody = TopicScope & { target: TopicTarget } & (
  | { mode: 'all_unlearned' }
  | { mode: 'selected'; sense_ids: string[] }
);
export type TopicAddReceipt = { group_id: string | null; added: number; eligible: number; skipped_group_full: number } & (
  | { mode: 'all_unlearned' }
  | {
      mode: 'selected';
      added_ids: string[];
      already_learning_ids: string[];
      unavailable_ids: string[];
      group_full_ids: string[];
    }
);
type TopicSummary = { total: number; learning: number; unlearned: number };
type TopicSense = {
  sense_id: string;
  lemma: string;
  pos: string;
  meaning: { text: string };
  topics: Array<{ code: string; name: string }>;
};
type BrowsePage = { items: TopicSense[]; next_page_token: string | null };
type LearningItem = { sense_id: string; group_ids: string[] };

const PAGE_SIZE = 20;
const STALE_MS = 60_000;

export const topicPageKey = (scope: TopicScope, token: string | null) =>
  [...TOPIC_PICKER_KEY, scope.topic, scope.level, 'page', token] as const;

export function topicPageOptions(api: ApiClient, scope: TopicScope, token: string | null) {
  return {
    queryKey: topicPageKey(scope, token),
    staleTime: STALE_MS,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const params = new URLSearchParams({
        ...scope, exclude_function_words: 'true', page_size: String(PAGE_SIZE),
      });
      if (token) params.set('page_token', token);
      const page = await api.get<BrowsePage>(`/v1/senses?${params}`);
      const learning = new Map<string, string[]>();
      if (page.items.length) {
        const ids = page.items.map((sense) => sense.sense_id);
        const { items } = await api.get<{ items: LearningItem[] }>(`/v1/items?sense_ids=${ids.join(',')}`);
        for (const item of items) learning.set(item.sense_id, item.group_ids);
      }
      return { ...page, learning };
    },
  };
}

export function useTopicPage(scope: TopicScope, token: string | null) {
  const api = useApi();
  return useQuery(topicPageOptions(api, scope, token));
}

export function useTopicSummary(scope: TopicScope) {
  const api = useApi();
  return useQuery({
    queryKey: [...TOPIC_PICKER_KEY, scope.topic, scope.level, 'summary'],
    queryFn: () => api.get<TopicSummary>(`/v1/items/topic-summary?${new URLSearchParams(scope)}`),
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
