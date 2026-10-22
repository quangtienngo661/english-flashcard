'use client';

import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { useApi } from '@/app-shell/session/session-context';

export type Cell = 'priority' | 0 | 1 | 2 | 3 | 4 | 5;

/** `GET /v1/groups` item (Learning QueueService.list). */
export type GroupSummary = {
  id: string;
  name: string;
  version: number;
  total: number;
  today: { priority: number; due: number; new: number };
  cells: Array<{ level: number; total: number; due: number }>;
  backlog: number;
};

/** `GET /v1/groups/{id}`. */
export type GroupDetail = {
  id: string;
  name: string;
  version: number;
  item_count: number;
  removable_items: number;
  created_at: string;
  updated_at: string;
};

export type GroupItem = {
  item_id: string;
  sense_id: string;
  level: number;
  due_date: string;
  priority: boolean;
  group_count: number;
  sense_changed: boolean;
  added_at: string;
};

export type TopicSuggestion = {
  topic: { code: string; name: string };
  level: string;
  count: number;
  samples: Array<{ sense_id: string; lemma: string; pos: string; meaning: string | null }>;
};

export type BulkBody = { sense_ids: string[] } | { topic?: string; level?: string; pos?: string };
export type BulkResult = {
  added: number;
  already_in_group: number;
  skipped_function_words: number;
  skipped_group_full: number;
  skipped_not_found: number;
};

export const GROUPS_KEY = ['groups'] as const;
export const groupKey = (id: string) => ['group', id] as const;
const ITEMS_PAGE = 50;

export function useGroups() {
  const api = useApi();
  return useQuery({ queryKey: GROUPS_KEY, queryFn: () => api.get<{ items: GroupSummary[] }>('/v1/groups') });
}

export function useGroup(id: string | null) {
  const api = useApi();
  return useQuery({
    queryKey: groupKey(id ?? ''),
    queryFn: () => api.get<GroupDetail>(`/v1/groups/${id}`),
    enabled: id !== null,
  });
}

export function useGroupItems(id: string, cell: Cell | null) {
  const api = useApi();
  return useInfiniteQuery({
    queryKey: [...groupKey(id), 'items', cell ?? 'all'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (cell !== null) params.set('cell', String(cell));
      params.set('page_size', String(ITEMS_PAGE));
      if (pageParam) params.set('page_token', pageParam);
      return api.get<{ items: GroupItem[]; next_page_token: string | null }>(`/v1/groups/${id}/items?${params}`);
    },
    getNextPageParam: (last) => last.next_page_token,
  });
}

export function useTopicSuggestions() {
  const api = useApi();
  return useQuery({
    queryKey: ['topics', 'suggestions'],
    queryFn: () => api.get<{ items: TopicSuggestion[] }>('/v1/topics/suggestions'),
  });
}

/** Deck writes (all `[I]`: the caller passes the key of the press). Each refreshes the deck list and the deck. */
export function useGroupMutations() {
  const api = useApi();
  const client = useQueryClient();
  return useMemo(() => {
    const refresh = (id?: string) => {
      void client.invalidateQueries({ queryKey: GROUPS_KEY });
      if (id) void client.invalidateQueries({ queryKey: groupKey(id) });
    };
    const keyed = (idempotencyKey: string) => ({ idempotencyKey });
    return {
      async createGroup(name: string, key: string) {
        const group = await api.post<GroupDetail>('/v1/groups', { name }, keyed(key));
        refresh();
        return group;
      },
      async renameGroup(id: string, name: string, version: number, key: string) {
        try {
          const group = await api.patch<GroupDetail>(`/v1/groups/${id}`, { name, version }, keyed(key));
          refresh(id);
          return group;
        } catch (error) {
          // E18: someone renamed it elsewhere; show the stored name before the learner tries again.
          if (groupError(error)?.kind === 'conflict') refresh(id);
          throw error;
        }
      },
      async deleteGroup(id: string, key: string) {
        await api.delete(`/v1/groups/${id}`, keyed(key));
        client.removeQueries({ queryKey: groupKey(id) });
        refresh();
      },
      async removeItem(groupId: string, itemId: string, key: string) {
        const result = await api.delete<{ removed_from_learning: boolean }>(`/v1/groups/${groupId}/items/${itemId}`, keyed(key));
        refresh(groupId);
        return result;
      },
      async bulkAdd(groupId: string, body: BulkBody, key: string) {
        const result = await api.post<BulkResult>(`/v1/groups/${groupId}/items/bulk`, body, keyed(key));
        refresh(groupId);
        return result;
      },
    };
  }, [api, client]);
}

export type GroupErrorKind = { kind: 'name-taken' } | { kind: 'limit' } | { kind: 'conflict' } | { kind: 'not-found' };

/** The deck errors a screen answers in its own words (field error, limit line, reload); null for the generic text. */
export function groupError(error: unknown): GroupErrorKind | null {
  if (!(error instanceof ApiError)) return null;
  switch (error.problem.slug) {
    case 'group-name-taken':
      return { kind: 'name-taken' };
    case 'group-limit-reached':
      return { kind: 'limit' };
    case 'version-conflict':
      return { kind: 'conflict' };
    case 'not-found':
      return { kind: 'not-found' };
    default:
      return null;
  }
}
