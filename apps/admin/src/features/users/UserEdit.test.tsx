import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';

// AD18: admins create learners, edit users and reset passwords; editors only read.
const t = vi.users;
const LAN_ID = '6b1f0000-0000-4000-8000-00000000e42a';
const LIST = 'GET /v1/admin/users?page_size=20';
const ONE = `GET /v1/admin/users/${LAN_ID}`;
const json = (body: unknown, status = 200) => Response.json(body, { status });
const EDITOR = makeMe({ staff_role: 'editor', permissions: ['content.edit', 'entitlements.grant', 'users.read'] });

const user = (over: Record<string, unknown> = {}) => ({
  id: LAN_ID, email: 'lan@example.com', given_name: 'Lan', family_name: 'Nguyễn', email_verified: true, staff_role: null,
  status: 'active', created_at: '2026-10-10T03:00:00.000Z', last_seen_at: null, ...over,
});
const detail = (over: Record<string, unknown> = {}) => ({
  ...user(), birth_date: null, terms_accepted_at: null, terms_version: null, locked_at: null, locked_by: null, lock_reason: null,
  timezone: 'Asia/Saigon', ...over,
});
const page = (items: unknown[]) => ({ items, next_page_token: null });

describe('users: create, edit, reset (AD18)', { timeout: 20_000 }, () => {
  it('an editor sees the list and the detail but no [Tạo người dùng], [Sửa], [Đặt lại mật khẩu] or [Khóa tài khoản]', async () => {
    renderApp(`/users/${LAN_ID}`, { [LIST]: () => json(page([user()])), [ONE]: () => json(detail()) }, EDITOR);
    expect(await screen.findByText('Asia/Saigon')).toBeInTheDocument();
    for (const name of [t.create, t.detail.edit, t.detail.resetPassword, t.detail.lock]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('[Tạo người dùng] defaults to a learner and posts staff_role null with a generated password', async () => {
    const r = renderApp('/users', {
      [LIST]: () => json(page([user()])),
      'POST /v1/admin/users': () => json({ id: 'n1', email: 'mai@example.com', email_verified: true, staff_role: null }, 201),
    });
    await userEvent.click(await screen.findByRole('button', { name: t.create }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(vi.staff.create.email), 'mai@example.com');
    await userEvent.click(within(dialog).getByRole('button', { name: vi.staff.create.continue }));
    await userEvent.click(await screen.findByRole('button', { name: vi.staff.create.submit }));
    expect(await screen.findByText(vi.staff.create.doneBodyLearner.replace('{email}', 'mai@example.com'))).toBeInTheDocument();
    const post = r.calls.find((c) => c.method === 'POST' && c.path === '/v1/admin/users');
    expect(post?.body).toMatchObject({ email: 'mai@example.com', staff_role: null, must_change_password: true });
    expect(post?.body).not.toHaveProperty('password');
  });

  it('[Sửa] sends only the changed fields and shows the saved user', async () => {
    const r = renderApp(`/users/${LAN_ID}`, {
      [LIST]: () => json(page([user()])), [ONE]: () => json(detail()),
      [`PATCH /v1/admin/users/${LAN_ID}`]: () => json(detail({ given_name: 'Mai', birth_date: '2000-01-02' })),
    });
    await userEvent.click(await screen.findByRole('button', { name: t.detail.edit }));
    const dialog = await screen.findByRole('dialog');
    const given = within(dialog).getByLabelText(t.detail.givenName);
    await userEvent.clear(given);
    await userEvent.type(given, 'Mai');
    await userEvent.type(within(dialog).getByLabelText(t.detail.birthDate), '2000-01-02');
    await userEvent.click(within(dialog).getByRole('button', { name: t.edit.save }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const patch = r.calls.find((c) => c.method === 'PATCH');
    expect(patch?.body).toEqual({ given_name: 'Mai', birth_date: '2000-01-02' });
  });

  it('[Sửa] shows email-taken and age-below-minimum next to their fields', async () => {
    let answer = problem(409, 'email-taken');
    renderApp(`/users/${LAN_ID}`, {
      [LIST]: () => json(page([user()])), [ONE]: () => json(detail()),
      [`PATCH /v1/admin/users/${LAN_ID}`]: () => answer,
    });
    await userEvent.click(await screen.findByRole('button', { name: t.detail.edit }));
    const dialog = await screen.findByRole('dialog');
    const email = within(dialog).getByLabelText(t.detail.email);
    await userEvent.clear(email);
    await userEvent.type(email, 'taken@example.com');
    await userEvent.click(within(dialog).getByRole('button', { name: t.edit.save }));
    expect(await within(dialog).findByText(t.edit.emailTaken)).toBeInTheDocument();
    answer = problem(400, 'age-below-minimum');
    await userEvent.type(within(dialog).getByLabelText(t.detail.birthDate), '2020-01-01');
    await userEvent.click(within(dialog).getByRole('button', { name: t.edit.save }));
    expect(await within(dialog).findByText(t.edit.tooYoung)).toBeInTheDocument();
  });

  it('[Đặt lại mật khẩu] posts must_change_password and no password when generated', async () => {
    const r = renderApp(`/users/${LAN_ID}`, {
      [LIST]: () => json(page([user()])), [ONE]: () => json(detail()),
      [`POST /v1/admin/users/${LAN_ID}/password`]: () => json(detail()),
    });
    await userEvent.click(await screen.findByRole('button', { name: t.detail.resetPassword }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: t.reset.confirm }));
    expect(await screen.findByText(t.reset.done.replace('{email}', 'lan@example.com'))).toBeInTheDocument();
    const post = r.calls.find((c) => c.path.endsWith('/password'));
    expect(post?.body).toEqual({ must_change_password: true });
  });
});
