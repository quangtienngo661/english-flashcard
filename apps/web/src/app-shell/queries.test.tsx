// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useAppConfig, useEntitlements } from './queries';
import { SessionProvider } from './session/session-context';
import { SessionStore } from './session/session-store';
import { BASE, makeFetch, makeMe, tokenResponse } from './session/test-support';

function wrapperFor(routes: Parameters<typeof makeFetch>[0]) {
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

describe('shared queries', () => {
  it('useEntitlements reads GET /v1/me/entitlements under ["me","entitlements"]', async () => {
    const { wrapper, client } = wrapperFor({ 'GET /v1/me/entitlements': () => Response.json({ plan: 'free' }) });
    const { result } = renderHook(() => useEntitlements(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ plan: 'free' }));
    expect(client.getQueryData(['me', 'entitlements'])).toEqual({ plan: 'free' });
  });

  it('useAppConfig reads GET /v1/me/app-config under ["me","app-config"]', async () => {
    const config = { practice: { max_questions_per_session: 20 } };
    const { wrapper, client } = wrapperFor({ 'GET /v1/me/app-config': () => Response.json(config) });
    const { result } = renderHook(() => useAppConfig(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(config));
    expect(client.getQueryData(['me', 'app-config'])).toEqual(config);
  });
});
