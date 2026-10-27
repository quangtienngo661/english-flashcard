import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Route, createRoutesFromElements, useLocation, useMatch, useNavigate } from 'react-router';
import { IntlProvider } from 'use-intl';
import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import vi from '../../messages/vi.json';
import { SessionProvider } from '../auth/session-context';
import { SessionStore } from '../auth/session-store';
import { BASE, makeFetch, tokenResponse } from '../auth/test-support';
import { ME_ADMIN } from '../features/staff/test-utils';
import { Dialog } from '../ui/Dialog';
import { useDialogDirtyClose, useDirtyForm } from './dirty-form';
import { RequireSession } from './RequireSession';
import { Shell } from './Shell';
import { renderRouteTree } from './test-router';

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{`${pathname}${search}`}</p>;
}

/** A page form: dirty once its field has text. */
function PageForm() {
  const [value, setValue] = useState('');
  const { release } = useDirtyForm(value !== '');
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const routeDialog = useMatch('/settings/new');
  return (
    <div>
      <Where />
      <label>
        Page field
        <input value={value} onChange={(e) => setValue(e.target.value)} />
      </label>
      <button type="button" onClick={() => navigate('/settings?tab=ai')}>
        Tab AI
      </button>
      <button
        type="button"
        onClick={() => {
          release();
          navigate('/sources');
        }}
      >
        Save and go
      </button>
      <button type="button" onClick={() => setDialogOpen(true)}>
        Open dialog
      </button>
      {dialogOpen && <DialogForm onClose={() => setDialogOpen(false)} />}
      {routeDialog && <DialogForm onClose={() => navigate('/settings')} />}
    </div>
  );
}

/** A dialog with a form: [Hủy], ✕ and Esc all go through `useDialogDirtyClose`. */
function DialogForm({ onClose }: { onClose: () => void }) {
  const [value, setValue] = useState('');
  const close = useDialogDirtyClose(value !== '', onClose);
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && close()}
      title="Form dialog"
      actions={
        <button type="button" onClick={close}>
          {vi.common.cancel}
        </button>
      }
    >
      <label>
        Dialog field
        <input value={value} onChange={(e) => setValue(e.target.value)} />
      </label>
    </Dialog>
  );
}

const routes = createRoutesFromElements(
  <Route element={<RequireSession />}>
    <Route element={<Shell />}>
      <Route path="settings" element={<PageForm />}>
        <Route path="new" element={null} />
      </Route>
      <Route path="sources" element={<Where />} />
    </Route>
  </Route>,
);

function renderForm(entries: string[] = ['/settings']) {
  const f = makeFetch({ 'POST /v1/auth/refresh': () => tokenResponse('tok-1'), 'GET /v1/me': () => Response.json(ME_ADMIN) });
  const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderRouteTree(routes, { initialEntries: entries, initialIndex: entries.length - 1 }, (node) => (
    <IntlProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
      <QueryClientProvider client={client}>
        <SessionProvider store={store}>{node}</SessionProvider>
      </QueryClientProvider>
    </IntlProvider>
  ));
}

const where = () => screen.getByTestId('where').textContent;
const makeDirty = async (label = 'Page field') => userEvent.type(await screen.findByLabelText(label, {}, { timeout: 5000 }), 'x');
const leaveDialog = () => screen.queryByRole('dialog', { name: vi.leave.title });

describe('dirty forms (T6)', () => {
  it('a clean form leaves without a question', async () => {
    renderForm();
    await screen.findByLabelText('Page field', {}, { timeout: 5000 });
    await userEvent.click(screen.getByRole('link', { name: vi.nav.sources }));
    await waitFor(() => expect(where()).toBe('/sources'));
    expect(leaveDialog()).toBeNull();
  });

  it('dirty on /settings, a nav link asks first: [Ở lại] stays with the text kept, [Rời trang] goes', async () => {
    renderForm();
    await makeDirty();
    await userEvent.click(screen.getByRole('link', { name: vi.nav.sources }));
    const dialog = await screen.findByRole('dialog', { name: vi.leave.title });
    expect(dialog).toHaveTextContent(vi.leave.body);

    await userEvent.click(within(dialog).getByRole('button', { name: vi.leave.stay }));
    await waitFor(() => expect(leaveDialog()).toBeNull());
    expect(where()).toBe('/settings');
    expect(screen.getByLabelText('Page field')).toHaveValue('x');

    await userEvent.click(screen.getByRole('link', { name: vi.nav.sources }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: vi.leave.title })).getByRole('button', { name: vi.leave.leave }));
    await waitFor(() => expect(where()).toBe('/sources'));
    await waitFor(() => expect(leaveDialog()).toBeNull());
  });

  it('changing only the search on the same page (?tab=) does not ask (design §4.3)', async () => {
    renderForm();
    await makeDirty();
    await userEvent.click(screen.getByRole('button', { name: 'Tab AI' }));
    await waitFor(() => expect(where()).toBe('/settings?tab=ai'));
    expect(leaveDialog()).toBeNull();
    expect(screen.getByLabelText('Page field')).toHaveValue('x');
  });

  it('release() right before navigate lets the save leave without a question', async () => {
    renderForm();
    await makeDirty();
    await userEvent.click(screen.getByRole('button', { name: 'Save and go' }));
    await waitFor(() => expect(where()).toBe('/sources'));
    expect(leaveDialog()).toBeNull();
  });

  it('history back while dirty asks too', async () => {
    const { router } = renderForm(['/sources', '/settings']);
    await makeDirty();
    await act(() => router.navigate(-1));
    expect(await screen.findByRole('dialog', { name: vi.leave.title })).toBeInTheDocument();
    expect(where()).toBe('/settings');
    await userEvent.click(screen.getByRole('button', { name: vi.leave.leave }));
    await waitFor(() => expect(where()).toBe('/sources'));
  });

  it('two dirty forms (page + dialog) still raise one question', async () => {
    const { router } = renderForm(['/sources', '/settings']);
    await makeDirty();
    await userEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
    await makeDirty('Dialog field');
    await act(() => router.navigate(-1));
    await screen.findByRole('dialog', { name: vi.leave.title });
    expect(screen.getAllByRole('heading', { name: vi.leave.title, hidden: true })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: vi.leave.leave }));
    await waitFor(() => expect(where()).toBe('/sources'));
  });

  it('beforeunload is cancelled only while a form is dirty', async () => {
    renderForm();
    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    await screen.findByLabelText('Page field', {}, { timeout: 5000 });
    expect(unload()).toBe(false);
    await makeDirty();
    expect(unload()).toBe(true);
    await userEvent.clear(screen.getByLabelText('Page field'));
    expect(unload()).toBe(false);
  });
});

describe('dialog close with a dirty form (useDialogDirtyClose)', () => {
  it('a clean dialog closes at once', async () => {
    renderForm(['/settings/new']);
    await screen.findByRole('dialog', { name: 'Form dialog' }, { timeout: 5000 });
    await userEvent.click(screen.getByRole('button', { name: vi.common.cancel }));
    await waitFor(() => expect(where()).toBe('/settings'));
    expect(screen.queryByRole('dialog', { name: vi.leave.discardTitle })).toBeNull();
    expect(leaveDialog()).toBeNull();
  });

  it('dirty: Esc asks "Bỏ thay đổi?"; [Tiếp tục sửa] keeps the text; [Hủy] then [Bỏ thay đổi] closes with no leave question', async () => {
    renderForm(['/settings/new']);
    await makeDirty('Dialog field');
    await userEvent.keyboard('{Escape}');
    const discard = await screen.findByRole('dialog', { name: vi.leave.discardTitle });
    await userEvent.click(within(discard).getByRole('button', { name: vi.leave.keepEditing }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: vi.leave.discardTitle })).toBeNull());
    expect(screen.getByLabelText('Dialog field')).toHaveValue('x');
    expect(where()).toBe('/settings/new');

    await userEvent.click(screen.getByRole('button', { name: vi.common.cancel }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: vi.leave.discardTitle })).getByRole('button', { name: vi.leave.discard }));
    await waitFor(() => expect(where()).toBe('/settings'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Form dialog' })).toBeNull());
    expect(leaveDialog()).toBeNull();
  });
});

describe('leave copy', () => {
  it('both languages have it', () => {
    expect(vi.leave).toEqual({
      title: 'Rời trang?',
      body: 'Thay đổi chưa lưu sẽ mất.',
      stay: 'Ở lại',
      leave: 'Rời trang',
      discardTitle: 'Bỏ thay đổi?',
      discard: 'Bỏ thay đổi',
      keepEditing: 'Tiếp tục sửa',
    });
    expect(en.leave).toEqual({
      title: 'Leave this page?',
      body: 'Unsaved changes will be lost.',
      stay: 'Stay',
      leave: 'Leave',
      discardTitle: 'Discard changes?',
      discard: 'Discard',
      keepEditing: 'Keep editing',
    });
  });
});
