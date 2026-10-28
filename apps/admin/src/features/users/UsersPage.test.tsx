import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem, type Call } from '../../auth/test-support';
import { ME_ADMIN, renderApp } from '../staff/test-utils';

const t = vi.users;
const LAN_ID = '6b1f0000-0000-4000-8000-00000000e42a';
const ADMIN_ID = '7c2f0000-0000-4000-8000-00000000a001';
const LIST = 'GET /v1/admin/users?page_size=20';
const ONE = `GET /v1/admin/users/${LAN_ID}`;
const LOCK = `POST /v1/admin/users/${LAN_ID}/lock`;
const UNLOCK = `POST /v1/admin/users/${LAN_ID}/unlock`;
const json = (body: unknown, status = 200) => Response.json(body, { status });
const EDITOR = makeMe({ staff_role: 'editor', permissions: ['content.edit'] });

const user = (over: Record<string, unknown> = {}) => ({
  id: LAN_ID, email: 'lan@example.com', given_name: 'Lan', family_name: 'Nguyễn', email_verified: true, staff_role: null,
  status: 'active', created_at: '2026-10-10T03:00:00.000Z', last_seen_at: '2026-10-20T08:15:00.000Z', ...over,
});
const detail = (over: Record<string, unknown> = {}) => ({
  ...user(), birth_date: '2008-05-14', terms_accepted_at: '2026-10-18T02:00:00.000Z', terms_version: '2026-10-01',
  locked_at: null, locked_by: null, lock_reason: null, ...over,
});
const locked = {
  status: 'locked', locked_at: '2026-10-18T03:20:00.000Z', locked_by: { id: ADMIN_ID, email: 'an.admin@wordmet.com' }, lock_reason: 'Gửi báo lỗi rác nhiều lần.',
};
const page = (items: unknown[], next: string | null = null) => ({ items, next_page_token: next });
const posts = (calls: Call[]) => calls.filter((c) => c.method === 'POST' && c.path.startsWith('/v1/admin/'));

describe('users list', { timeout: 20_000 }, () => {
  it('§6.10: the list asks for 20 people, newest first, and shows the name, role and status columns', async () => {
    const r = renderApp('/users', { [LIST]: () => json(page([user(), user({ id: 'x', email: 'minh@example.com', staff_role: 'editor', status: 'locked' })])) });
    expect((await screen.findAllByText('lan@example.com')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Nguyễn Lan').length).toBeGreaterThan(0);
    expect(screen.getAllByText(t.roles.editor).length).toBeGreaterThan(0);
    expect(screen.getAllByText(t.statuses.locked).length).toBeGreaterThan(0);
    expect(r.count('GET', '/v1/admin/users?page_size=20')).toBe(1);
  });

  it('§6.10: one character sends no request and the line under the box says "Gõ từ 2 ký tự"', async () => {
    const r = renderApp('/users', { [LIST]: () => json(page([user()])) });
    await screen.findAllByText('lan@example.com');
    await userEvent.type(screen.getByLabelText(t.search), 'n');
    expect(await screen.findByText(t.searchShort)).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(r.calls.filter((c) => c.path.includes('q='))).toHaveLength(0);
  });

  it('§6.10: two characters search by q and write q and status in the URL', async () => {
    const r = renderApp('/users', {
      [LIST]: () => json(page([user()])),
      'GET /v1/admin/users?q=ng&page_size=20': () => json(page([user()])),
      'GET /v1/admin/users?q=ng&status=locked&page_size=20': () => json(page([])),
    });
    await screen.findAllByText('lan@example.com');
    await userEvent.type(screen.getByLabelText(t.search), 'ng');
    await waitFor(() => expect(r.count('GET', '/v1/admin/users?q=ng&page_size=20')).toBe(1));
    expect(r.router.state.location.search).toBe('?q=ng');
    await userEvent.click(screen.getByRole('button', { name: new RegExp(t.filters.status) }));
    await userEvent.click(await screen.findByRole('option', { name: t.filters.locked }));
    await waitFor(() => expect(r.count('GET', '/v1/admin/users?q=ng&status=locked&page_size=20')).toBe(1));
    expect(r.router.state.location.search).toBe('?q=ng&status=locked');
    expect(await screen.findByText(t.emptySearch.replace('{q}', 'ng'))).toBeInTheDocument();
  });

  it('§6.10: "Tải thêm" sends the page_token of the first page', async () => {
    const r = renderApp('/users', {
      [LIST]: () => json(page([user()], 'tok-2')),
      'GET /v1/admin/users?page_size=20&page_token=tok-2': () => json(page([user({ id: 'y', email: 'binh@example.com' })])),
    });
    await userEvent.click(await screen.findByRole('button', { name: vi.common.loadMore }));
    expect((await screen.findAllByText('binh@example.com')).length).toBeGreaterThan(0);
    expect(r.count('GET', '/v1/admin/users?page_size=20&page_token=tok-2')).toBe(1);
  });

  it('A/71e: Minh at /users sees the no-access card and no request goes out', async () => {
    const r = renderApp('/users', {}, EDITOR);
    expect(await screen.findByText(vi.noAccess.title)).toBeInTheDocument();
    expect(r.calls.filter((c) => c.path.startsWith('/v1/admin/users'))).toHaveLength(0);
  });
});

describe('user detail', { timeout: 20_000 }, () => {
  const open = (routes: Record<string, (c: Call) => Response | Promise<Response>>) =>
    renderApp(`/users/${LAN_ID}`, { [LIST]: () => json(page([user()])), ...routes });

  it('§6.10: the panel shows the birth date, the terms acceptance and an active account offers [Khóa tài khoản]', async () => {
    open({ [ONE]: () => json(detail()) });
    expect(await screen.findByText('14/5/2008')).toBeInTheDocument();
    expect(screen.getByText('18/10/2026 09:00 · bản 2026-10-01')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.detail.lock })).toBeInTheDocument();
  });

  it('§6.10: a locked account shows "Đang khóa từ … · bởi <email>", the reason and [Mở khóa]', async () => {
    open({ [ONE]: () => json(detail(locked)) });
    expect(await screen.findByText('Đang khóa từ 18/10/2026 10:20 · bởi an.admin@wordmet.com')).toBeInTheDocument();
    expect(screen.getByText('Lý do: Gửi báo lỗi rác nhiều lần.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.detail.lock })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.detail.unlock })).toBeInTheDocument();
  });

  it('§6.10: [Mở khóa] posts the unlock and the panel shows the account active again', async () => {
    const r = open({ [ONE]: () => json(detail(locked)), [UNLOCK]: () => json(detail()) });
    await userEvent.click(await screen.findByRole('button', { name: t.detail.unlock }));
    expect(await screen.findByRole('button', { name: t.detail.lock })).toBeInTheDocument();
    expect(posts(r.calls).map((c) => c.path)).toEqual([`/v1/admin/users/${LAN_ID}/unlock`]);
  });

  it('§6.10: [Khóa tài khoản] is hidden for an admin', async () => {
    renderApp(`/users/${ADMIN_ID}`, {
      [LIST]: () => json(page([])),
      [`GET /v1/admin/users/${ADMIN_ID}`]: () => json(detail({ id: ADMIN_ID, email: 'an.admin@wordmet.com', staff_role: 'admin' })),
    });
    expect(await screen.findByText('14/5/2008')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.detail.lock })).not.toBeInTheDocument();
  });

  it('§6.10: [Khóa tài khoản] is hidden on your own account', async () => {
    renderApp(`/users/${LAN_ID}`, { [LIST]: () => json(page([])), [ONE]: () => json(detail()) }, { ...ME_ADMIN, id: LAN_ID });
    expect(await screen.findByText('14/5/2008')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.detail.lock })).not.toBeInTheDocument();
  });

  it('§6.10: the lock dialog has a one-line reason (1–500), sends it and shows the new lock line', async () => {
    const r = open({ [ONE]: () => json(detail()), [LOCK]: () => json(detail({ ...locked, locked_by: { id: 'me-1', email: 'admin@wordmet.com' } })) });
    await userEvent.click(await screen.findByRole('button', { name: t.detail.lock }));
    const dialog = await screen.findByRole('dialog', { name: t.lock.title.replace('{email}', 'lan@example.com') });
    const reason = within(dialog).getByLabelText(t.lock.reason);
    expect(reason.tagName).toBe('INPUT');
    await userEvent.click(within(dialog).getByRole('button', { name: t.lock.confirm }));
    expect(await within(dialog).findByText(t.lock.reasonInvalid)).toBeInTheDocument();
    expect(posts(r.calls)).toHaveLength(0);
    await userEvent.type(reason, 'Gửi báo lỗi rác nhiều lần.');
    await userEvent.click(within(dialog).getByRole('button', { name: t.lock.confirm }));
    expect(await screen.findByText(/Đang khóa từ .* · bởi admin@wordmet\.com/)).toBeInTheDocument();
    expect(posts(r.calls).map((c) => c.body)).toEqual([{ reason: 'Gửi báo lỗi rác nhiều lần.' }]);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Khóa tài khoản/ })).not.toBeInTheDocument());
  });

  it('§6.10: when the API still refuses with lock-rule the dialog says "Không khóa được chính bạn hoặc một admin."', async () => {
    open({ [ONE]: () => json(detail()), [LOCK]: () => problem(409, 'lock-rule') });
    await userEvent.click(await screen.findByRole('button', { name: t.detail.lock }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(t.lock.reason), 'x');
    await userEvent.click(within(dialog).getByRole('button', { name: t.lock.confirm }));
    expect(await within(dialog).findByText(vi.errors['lock-rule'])).toBeInTheDocument();
  });

  it('§6.10: closing the lock dialog with a typed reason asks "Bỏ thay đổi?" first', async () => {
    open({ [ONE]: () => json(detail()) });
    await userEvent.click(await screen.findByRole('button', { name: t.detail.lock }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(t.lock.reason), 'spam');
    await userEvent.click(within(dialog).getByRole('button', { name: t.lock.keep }));
    expect(await screen.findByText(vi.leave.discardTitle)).toBeInTheDocument();
  });

  it('§6.10: an id that does not exist shows "Không tìm thấy người dùng này."', async () => {
    open({ [ONE]: () => problem(404, 'not-found') });
    expect(await screen.findByText(t.detail.notFound)).toBeInTheDocument();
  });

  it('§6.10: an id that is no UUID shows the same text without calling the API', async () => {
    const r = renderApp('/users/abc', { [LIST]: () => json(page([user()])) });
    expect(await screen.findByText(t.detail.notFound)).toBeInTheDocument();
    expect(r.calls.filter((c) => c.path.startsWith('/v1/admin/users/'))).toHaveLength(0);
  });
});
