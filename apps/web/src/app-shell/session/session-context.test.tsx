// @vitest-environment jsdom
// Copied from apps/admin/src/auth/session-context.test.tsx.
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SessionProvider, useSession } from './session-context';
import { SessionStore } from './session-store';
import { BASE, makeFetch, makeMe, tokenResponse } from './test-support';

function Probe() {
  const { state } = useSession();
  return <p data-testid="status">{state.status}</p>;
}

function setup(me = makeMe()) {
  const f = makeFetch({
    'POST /v1/auth/refresh': () => tokenResponse('tok-1'),
    'GET /v1/me': () => Response.json(me),
  });
  const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null });
  render(
    <SessionProvider store={store}>
      <Probe />
    </SessionProvider>,
  );
  return { store, ...f };
}

describe('SessionProvider', () => {
  it('bootstraps on mount and renders the store state', async () => {
    setup();
    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'));
  });

  it('B25#7: focus while signed-in calls GET /v1/me once', async () => {
    const { count } = setup();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'));
    const before = count('GET', '/v1/me');

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => expect(count('GET', '/v1/me')).toBe(before + 1));
    await new Promise((r) => setTimeout(r, 20));
    expect(count('GET', '/v1/me')).toBe(before + 1);
  });

  it('B25#7: focus while signed-out does not call /me', async () => {
    const f = makeFetch({ 'POST /v1/auth/refresh': () => new Response(null, { status: 401 }) });
    const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null });
    render(
      <SessionProvider store={store}>
        <Probe />
      </SessionProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-out'));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(f.count('GET', '/v1/me')).toBe(0);
  });
});
