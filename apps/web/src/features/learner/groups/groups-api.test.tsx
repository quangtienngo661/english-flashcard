// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { SessionProvider } from '@/app-shell/session/session-context';
import { SessionStore } from '@/app-shell/session/session-store';
import { BASE, makeFetch, makeMe, problem, tokenResponse, type Route } from '@/app-shell/session/test-support';
import { groupError, useGroup, useGroupItems, useGroupMutations, useGroups, useTopicSuggestions } from './groups-api';

function wrapperFor(routes: Record<string, Route>) {
  const f = makeFetch({ 'POST /v1/auth/refresh': () => tokenResponse('t'), 'GET /v1/me': () => Response.json(makeMe()), ...routes });
  const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <SessionProvider store={store}>{children}</SessionProvider>
    </QueryClientProvider>
  );
  return { wrapper, client, ...f };
}

const apiError = (status: number, slug: string) =>
  new ApiError({ type: `http://api.test/problems/${slug}`, slug, status, title: slug }, null);

describe('deck queries', () => {
  it('useGroups reads GET /v1/groups', async () => {
    const { wrapper } = wrapperFor({ 'GET /v1/groups': () => Response.json({ items: [{ id: 'g1' }] }) });
    const { result } = renderHook(() => useGroups(), { wrapper });
    await waitFor(() => expect(result.current.data?.items).toEqual([{ id: 'g1' }]));
  });

  it('useGroup reads GET /v1/groups/{id}', async () => {
    const { wrapper } = wrapperFor({ 'GET /v1/groups/g1': () => Response.json({ id: 'g1', removable_items: 3 }) });
    const { result } = renderHook(() => useGroup('g1'), { wrapper });
    await waitFor(() => expect(result.current.data?.removable_items).toBe(3));
  });

  it('useGroupItems pages GET /v1/groups/{id}/items with the cell filter', async () => {
    const { wrapper, calls } = wrapperFor({
      'GET /v1/groups/g1/items?cell=priority&page_size=50': () => Response.json({ items: [{ item_id: 'i1' }], next_page_token: null }),
    });
    const { result } = renderHook(() => useGroupItems('g1', 'priority'), { wrapper });
    await waitFor(() => expect(result.current.data?.pages[0].items).toEqual([{ item_id: 'i1' }]));
    expect(calls.some((c) => c.path === '/v1/groups/g1/items?cell=priority&page_size=50')).toBe(true);
  });

  it('useTopicSuggestions reads GET /v1/topics/suggestions', async () => {
    const { wrapper } = wrapperFor({ 'GET /v1/topics/suggestions': () => Response.json({ items: [] }) });
    const { result } = renderHook(() => useTopicSuggestions(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ items: [] }));
  });
});

describe('deck writes', () => {
  it('create, rename, delete, remove an item and bulk add send the right request with the press key', async () => {
    const { wrapper, calls } = wrapperFor({
      'POST /v1/groups': () => Response.json({ id: 'g2' }, { status: 201 }),
      'PATCH /v1/groups/g1': () => Response.json({ id: 'g1' }),
      'DELETE /v1/groups/g1': () => new Response(null, { status: 204 }),
      'DELETE /v1/groups/g1/items/i1': () => Response.json({ removed_from_learning: false }),
      'POST /v1/groups/g1/items/bulk': () => Response.json({ added: 2 }),
    });
    const { result } = renderHook(() => useGroupMutations(), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    await act(async () => {
      await result.current.createGroup('Du lịch', 'k1');
      await result.current.renameGroup('g1', 'Du lịch Nhật', 3, 'k2');
      await result.current.deleteGroup('g1', 'k3');
      await result.current.removeItem('g1', 'i1', 'k4');
      await result.current.bulkAdd('g1', { sense_ids: ['s1', 's2'] }, 'k5');
    });
    const sent = calls.filter((c) => c.method !== 'GET' && !c.path.startsWith('/v1/auth') );
    expect(sent.map((c) => [c.method, c.path, c.body, c.headers['Idempotency-Key']])).toEqual([
      ['POST', '/v1/groups', { name: 'Du lịch' }, 'k1'],
      ['PATCH', '/v1/groups/g1', { name: 'Du lịch Nhật', version: 3 }, 'k2'],
      ['DELETE', '/v1/groups/g1', undefined, 'k3'],
      ['DELETE', '/v1/groups/g1/items/i1', undefined, 'k4'],
      ['POST', '/v1/groups/g1/items/bulk', { sense_ids: ['s1', 's2'] }, 'k5'],
    ]);
  });

  it('E18: a rename refused with version-conflict reloads the deck', async () => {
    let version = 3;
    const { wrapper, count } = wrapperFor({
      'GET /v1/groups/g1': () => Response.json({ id: 'g1', name: 'Mới', version }),
      'PATCH /v1/groups/g1': () => {
        version = 4;
        return problem(409, 'version-conflict');
      },
    });
    const { result } = renderHook(() => ({ group: useGroup('g1'), m: useGroupMutations() }), { wrapper });
    await waitFor(() => expect(result.current.group.data?.version).toBe(3));
    await act(async () => {
      await expect(result.current.m.renameGroup('g1', 'X', 3, 'k')).rejects.toBeInstanceOf(ApiError);
    });
    await waitFor(() => expect(result.current.group.data?.version).toBe(4));
    expect(count('GET', '/v1/groups/g1')).toBe(2);
  });
});

describe('groupError', () => {
  it('name taken → a field error; deck limit → the limit with its number; version conflict → conflict', () => {
    expect(groupError(apiError(409, 'group-name-taken'))).toEqual({ kind: 'name-taken' });
    expect(groupError(apiError(409, 'group-limit-reached'))).toEqual({ kind: 'limit' });
    expect(groupError(apiError(409, 'version-conflict'))).toEqual({ kind: 'conflict' });
    expect(groupError(new Error('x'))).toBeNull();
  });
});
