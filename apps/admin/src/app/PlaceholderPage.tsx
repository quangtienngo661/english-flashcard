import { useQuery } from '@tanstack/react-query';
import { useApi } from '../auth/session-context';

/**
 * Stand-in for the screens of Tasks 12–16: it only counts the items its endpoint returns, which is enough
 * for the shell to show data and for the offline banner to have a query to retry. Each task replaces its route.
 */
export function PlaceholderPage({ endpoint }: { endpoint?: string }) {
  const api = useApi();
  const query = useQuery({
    queryKey: ['placeholder', endpoint],
    queryFn: () => api.get<{ items: unknown[] }>(endpoint!),
    enabled: endpoint !== undefined,
  });
  if (query.data === undefined) return null;
  return <p data-testid="placeholder-count">{query.data.items.length}</p>;
}
