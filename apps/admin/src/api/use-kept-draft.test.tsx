import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Navigate, Route, createRoutesFromElements, useLocation } from 'react-router';
import { IntlProvider } from 'use-intl';
import { afterEach, beforeEach, describe, expect, it, vi as vitest } from 'vitest';
import en from '../../messages/en.json';
import vi from '../../messages/vi.json';
import { useDirtyForm } from '../app/dirty-form';
import { RequireSession } from '../app/RequireSession';
import { Shell } from '../app/Shell';
import { renderRouteTree } from '../app/test-router';
import { SessionProvider, useSession } from '../auth/session-context';
import { SessionStore } from '../auth/session-store';
import { BASE, makeFetch, tokenResponse } from '../auth/test-support';
import { ME_ADMIN } from '../features/staff/test-utils';
import { RestoreDraftBanner } from '../ui/RestoreDraftBanner';
import { useKeptDraft } from './use-kept-draft';

const STORED = 'wordmet-admin.draft.ai-prompt:cloze';

beforeEach(() => sessionStorage.clear());
afterEach(() => vitest.restoreAllMocks());

describe('useKeptDraft', () => {
  it('writes the value on each change while dirty, and clear() removes it', () => {
    const { rerender, result } = renderHook(({ value, dirty }) => useKeptDraft('ai-prompt:cloze', value, dirty), {
      initialProps: { value: 'a', dirty: false },
    });
    expect(sessionStorage.getItem(STORED)).toBeNull();

    rerender({ value: 'ab', dirty: true });
    expect(JSON.parse(sessionStorage.getItem(STORED)!)).toBe('ab');
    rerender({ value: 'abc', dirty: true });
    expect(JSON.parse(sessionStorage.getItem(STORED)!)).toBe('abc');

    act(() => result.current.clear());
    expect(sessionStorage.getItem(STORED)).toBeNull();
  });

  it('a form edited back to clean removes its draft', () => {
    const { rerender } = renderHook(({ value, dirty }) => useKeptDraft('ai-prompt:cloze', value, dirty), {
      initialProps: { value: 'ab', dirty: true },
    });
    expect(sessionStorage.getItem(STORED)).not.toBeNull();
    rerender({ value: 'a', dirty: false });
    expect(sessionStorage.getItem(STORED)).toBeNull();
  });

  it('a second mount with a stored draft returns it as `kept` and does not overwrite it while clean', () => {
    sessionStorage.setItem(STORED, JSON.stringify({ text: 'from last time' }));
    const { result } = renderHook(() => useKeptDraft('ai-prompt:cloze', { text: 'server' }, false));
    expect(result.current.kept).toEqual({ text: 'from last time' });
    expect(JSON.parse(sessionStorage.getItem(STORED)!)).toEqual({ text: 'from last time' });
  });

  it('another key has its own draft', () => {
    sessionStorage.setItem(STORED, JSON.stringify('x'));
    const { result } = renderHook(() => useKeptDraft('ai-prompt:lookup', 'y', false));
    expect(result.current.kept).toBeNull();
  });

  it('moving to another key while dirty keeps the stored draft of the new key, offers it, and writes nothing of the old key under it', () => {
    sessionStorage.setItem('wordmet-admin.draft.sense:b', JSON.stringify('B from last time'));
    const { rerender, result } = renderHook(({ k, value, dirty }) => useKeptDraft(k, value, dirty), {
      initialProps: { k: 'sense:a', value: 'A text', dirty: true },
    });
    expect(JSON.parse(sessionStorage.getItem('wordmet-admin.draft.sense:a')!)).toBe('A text');

    // the render in which the key changes still carries A's value and dirty flag
    rerender({ k: 'sense:b', value: 'A text', dirty: true });
    expect(result.current.kept).toBe('B from last time');
    expect(JSON.parse(sessionStorage.getItem('wordmet-admin.draft.sense:b')!)).toBe('B from last time');

    // B's form resets to clean: still no deletion of B's draft
    rerender({ k: 'sense:b', value: 'B server', dirty: false });
    expect(JSON.parse(sessionStorage.getItem('wordmet-admin.draft.sense:b')!)).toBe('B from last time');

    // editing B writes B
    rerender({ k: 'sense:b', value: 'B edited', dirty: true });
    expect(JSON.parse(sessionStorage.getItem('wordmet-admin.draft.sense:b')!)).toBe('B edited');
  });

  it('discard() removes the draft and clears `kept`', () => {
    sessionStorage.setItem(STORED, JSON.stringify('x'));
    const { result } = renderHook(() => useKeptDraft('ai-prompt:cloze', 'y', false));
    expect(result.current.kept).toBe('x');
    act(() => result.current.discard());
    expect(result.current.kept).toBeNull();
    expect(sessionStorage.getItem(STORED)).toBeNull();
  });

  it('a stored value that is not JSON counts as no draft and is removed', () => {
    sessionStorage.setItem(STORED, '{not json');
    const { result } = renderHook(() => useKeptDraft('ai-prompt:cloze', 'y', false));
    expect(result.current.kept).toBeNull();
    expect(sessionStorage.getItem(STORED)).toBeNull();
  });

  it('a throwing sessionStorage gives kept: null without an error', () => {
    for (const method of ['getItem', 'setItem', 'removeItem'] as const) {
      vitest.spyOn(Storage.prototype, method).mockImplementation(() => {
        throw new Error('blocked');
      });
    }
    const { result, rerender } = renderHook(({ dirty }) => useKeptDraft('ai-prompt:cloze', 'y', dirty), { initialProps: { dirty: false } });
    expect(result.current.kept).toBeNull();
    rerender({ dirty: true });
    expect(() => act(() => result.current.clear())).not.toThrow();
    expect(() => act(() => result.current.discard())).not.toThrow();
  });
});

describe('RestoreDraftBanner', () => {
  it('shows the copy and both actions', async () => {
    const onRestore = vitest.fn();
    const onDiscard = vitest.fn();
    render(
      <IntlProvider locale="vi" messages={vi}>
        <RestoreDraftBanner onRestore={onRestore} onDiscard={onDiscard} />
      </IntlProvider>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Bạn có thay đổi chưa lưu từ lần trước.');
    await userEvent.click(screen.getByRole('button', { name: 'Khôi phục' }));
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ' }));
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('both languages have the copy', () => {
    expect(vi.draft).toEqual({ message: 'Bạn có thay đổi chưa lưu từ lần trước.', restore: 'Khôi phục', discard: 'Bỏ' });
    expect(en.draft).toEqual({ message: 'You have unsaved changes from last time.', restore: 'Restore', discard: 'Discard' });
  });
});

/** A test-only page (no real screen uses the hook yet): a dirty form that keeps its text. */
function DraftPage() {
  const [text, setText] = useState('');
  useDirtyForm(text !== '');
  const { kept, discard } = useKeptDraft<string>('settings', text, text !== '');
  const { store } = useSession();
  return (
    <div>
      {kept !== null && (
        <RestoreDraftBanner
          onRestore={() => {
            setText(kept);
            discard();
          }}
          onDiscard={discard}
        />
      )}
      <label>
        Draft field
        <input value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <button type="button" onClick={() => void store.logout('expired')}>
        Expire session
      </button>
    </div>
  );
}

function TestLogin() {
  const { state, store } = useSession();
  const from = (useLocation().state as { from?: string } | null)?.from;
  if (state.status === 'signed-in') return <Navigate to={from ?? '/'} replace />;
  return (
    <button type="button" onClick={() => void store.login('a@b.c', 'pw')}>
      Sign in again
    </button>
  );
}

const routes = createRoutesFromElements(
  <>
    <Route path="login" element={<TestLogin />} />
    <Route element={<RequireSession />}>
      <Route element={<Shell />}>
        <Route path="settings" element={<DraftPage />} />
      </Route>
    </Route>
  </>,
);

describe('a session that ends mid-edit (Review Focus 1)', () => {
  it('§4.6: dirty form + sign-out lands on /login with no "Rời trang?"; signing back in shows the banner and [Khôi phục] puts the text back', async () => {
    const f = makeFetch({
      'POST /v1/auth/refresh': () => tokenResponse('tok-1'),
      'GET /v1/me': () => Response.json(ME_ADMIN),
      'POST /v1/auth/logout': () => new Response(null, { status: 204 }),
      'POST /v1/auth/login': () => tokenResponse('tok-2'),
    });
    const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { router } = renderRouteTree(routes, { initialEntries: ['/settings'] }, (node) => (
      <IntlProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
        <QueryClientProvider client={client}>
          <SessionProvider store={store}>{node}</SessionProvider>
        </QueryClientProvider>
      </IntlProvider>
    ));

    await userEvent.type(await screen.findByLabelText('Draft field', {}, { timeout: 5000 }), 'my unsaved text');
    expect(screen.queryByRole('status')).toBeNull();
    expect(JSON.parse(sessionStorage.getItem('wordmet-admin.draft.settings')!)).toBe('my unsaved text');

    await userEvent.click(screen.getByRole('button', { name: 'Expire session' }));
    await screen.findByRole('button', { name: 'Sign in again' });
    expect(router.state.location.pathname).toBe('/login');
    expect(screen.queryByRole('dialog', { name: vi.leave.title, hidden: true })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Sign in again' }));
    const field = await screen.findByLabelText('Draft field', {}, { timeout: 5000 });
    await waitFor(() => expect(router.state.location.pathname).toBe('/settings'));
    expect(field).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent(vi.draft.message);

    await userEvent.click(screen.getByRole('button', { name: vi.draft.restore }));
    expect(screen.getByLabelText('Draft field')).toHaveValue('my unsaved text');
    expect(screen.queryByRole('status')).toBeNull();
  });
});

/** Dirty page form with a kept draft whose `clear` runs on a confirmed leave, and a way to leave. */
function LeavePage() {
  const [text, setText] = useState('');
  const { clear } = useKeptDraft<string>('settings', text, text !== '');
  useDirtyForm(text !== '', { onLeave: clear });
  return (
    <div>
      <label>
        Draft field
        <input value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <a href="/sources">Go to sources</a>
    </div>
  );
}

describe('a confirmed leave drops the kept draft', () => {
  it('[Ở lại] keeps it, [Rời trang] removes it', async () => {
    const f = makeFetch({ 'POST /v1/auth/refresh': () => tokenResponse('tok-1'), 'GET /v1/me': () => Response.json(ME_ADMIN) });
    const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const leaveRoutes = createRoutesFromElements(
      <Route element={<RequireSession />}>
        <Route element={<Shell />}>
          <Route path="settings" element={<LeavePage />} />
          <Route path="sources" element={<p>Sources page</p>} />
        </Route>
      </Route>,
    );
    renderRouteTree(leaveRoutes, { initialEntries: ['/settings'] }, (node) => (
      <IntlProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
        <QueryClientProvider client={client}>
          <SessionProvider store={store}>{node}</SessionProvider>
        </QueryClientProvider>
      </IntlProvider>
    ));
    const key = 'wordmet-admin.draft.settings';
    await userEvent.type(await screen.findByLabelText('Draft field', {}, { timeout: 5000 }), 'abc');
    expect(sessionStorage.getItem(key)).not.toBeNull();

    await userEvent.click(screen.getByRole('link', { name: vi.nav.sources }));
    const dialog = await screen.findByRole('dialog', { name: vi.leave.title });
    await userEvent.click(within(dialog).getByRole('button', { name: vi.leave.stay }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: vi.leave.title })).toBeNull());
    expect(JSON.parse(sessionStorage.getItem(key)!)).toBe('abc');

    await userEvent.click(screen.getByRole('link', { name: vi.nav.sources }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: vi.leave.title })).getByRole('button', { name: vi.leave.leave }));
    await screen.findByText('Sources page');
    expect(sessionStorage.getItem(key)).toBeNull();
  });
});
