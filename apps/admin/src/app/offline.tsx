import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import { NetworkError } from '../api/problem';

type OfflineValue = { offline: boolean; retry: () => void };

export const OfflineContext = createContext<OfflineValue>({ offline: false, retry: () => {} });
export const useOffline = () => useContext(OfflineContext);

/**
 * Spec §8: a `NetworkError` from any query or mutation raises the offline banner; the next successful query
 * lowers it. Data already on screen stays (a failed refetch keeps the cached result). No automatic retries:
 * the banner's "Thử lại" is the retry.
 */
export function createQueryClient(setOffline: (offline: boolean) => void): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
    queryCache: new QueryCache({
      onError: (error) => error instanceof NetworkError && setOffline(true),
      onSuccess: () => setOffline(false),
    }),
    mutationCache: new MutationCache({ onError: (error) => error instanceof NetworkError && setOffline(true) }),
  });
}
