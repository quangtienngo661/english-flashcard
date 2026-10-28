import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '../../api/problem';
import type { JobStatus } from '../content/content-api';

export type { JobStatus };

/** Spec §6.3: batch and publish-job pages refresh every 2 s until the job ends. */
export const POLL_INTERVAL_MS = 2000;
/** After this long in `queued` the page asks whether the worker is running (spec §8, B25E8). `ASSUMPTION`: 30 s. */
export const QUEUED_HINT_AFTER_S = 30;

export const isTerminal = (status: string | undefined): boolean => status === 'succeeded' || status === 'partial' || status === 'failed';

/**
 * `refetchInterval` as a function ends polling by returning `false`. A hidden tab is not polled (TanStack's default
 * `refetchIntervalInBackground: false`); showing it again refetches at once because the data is stale; a 404 (unknown id) also ends it. `done` says which
 * status ends polling: batch and publish jobs by default; another resource (an eval run ends at `finished`) passes its own.
 * `enabled: false` asks the API nothing (an id that cannot exist).
 */
export function usePollingStatus<T extends { status: string }>(
  key: readonly unknown[],
  fetcher: () => Promise<T>,
  done: (status: string) => boolean = isTerminal,
  enabled = true,
): UseQueryResult<T> {
  return useQuery({
    queryKey: key,
    queryFn: fetcher,
    enabled,
    refetchInterval: (query) => {
      // An unknown id stays unknown: reading it again every 2 s would only repeat the 404.
      const { error } = query.state;
      if (error instanceof ApiError && error.problem.status === 404) return false;
      const status = query.state.data?.status;
      return status !== undefined && done(status) ? false : POLL_INTERVAL_MS;
    },
    refetchOnWindowFocus: true,
  });
}

/** Pure: the caller supplies `now` (ms) so it can tick once a second while the page is open. */
export function useQueuedTooLong(status: string, createdAt: string, now: number): boolean {
  return status === 'queued' && now - Date.parse(createdAt) > QUEUED_HINT_AFTER_S * 1000;
}
