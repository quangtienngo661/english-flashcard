import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';

// Bước 8 (D17, D18, D31): an admin deletes another account; an editor cannot; a deleting account offers nothing else.
const t = vi.users;
const LAN_ID = '6b1f0000-0000-4000-8000-00000000e42a';
const LIST = 'GET /v1/admin/users?page_size=20';
const ONE = `GET /v1/admin/users/${LAN_ID}`;
const DELETE = `POST /v1/admin/users/${LAN_ID}/delete`;
const json = (body: unknown, status = 200) => Response.json(body, { status });
const EDITOR = makeMe({ staff_role: 'editor', permissions: ['content.edit', 'entitlements.grant', 'users.read'] });

const user = (over: Record<string, unknown> = {}) => ({
  id: LAN_ID, email: 'lan@example.com', given_name: 'Lan', family_name: 'Nguyễn', email_verified: true, staff_role: null,
  status: 'active', created_at: '2026-10-10T03:00:00.000Z', last_seen_at: null, sign_in_methods: ['password'], ...over,
});
const detail = (over: Record<string, unknown> = {}) => ({
  ...user(), birth_date: null, terms_accepted_at: null, terms_version: null, locked_at: null, locked_by: null, lock_reason: null,
  timezone: 'Asia/Saigon', auto_renewing: false, ...over,
});
const page = (items: unknown[]) => ({ items, next_page_token: null });

async function openDialog() {
  await userEvent.click(await screen.findByRole('button', { name: t.detail.deleteAction }));
  return screen.findByRole('dialog');
}

describe('users: delete an account (Bước 8)', { timeout: 20_000 }, () => {
  it('shows the sign-in methods of the account', async () => {
    renderApp(`/users/${LAN_ID}`, { [LIST]: () => json(page([user()])), [ONE]: () => json(detail({ sign_in_methods: ['password', 'google'] })) });
    expect(await screen.findByText('Mật khẩu · Google')).toBeInTheDocument();
  });

  it('an editor has no [Xóa tài khoản]', async () => {
    renderApp(`/users/${LAN_ID}`, { [LIST]: () => json(page([user()])), [ONE]: () => json(detail()) }, EDITOR);
    expect(await screen.findByText('Asia/Saigon')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.detail.deleteAction })).not.toBeInTheDocument();
  });

  it('the button is hidden for the admin\'s own account', async () => {
    const me = makeMe({ id: LAN_ID, staff_role: 'admin', permissions: ['roles.manage', 'users.read'] });
    renderApp(`/users/${LAN_ID}`, { [LIST]: () => json(page([user()])), [ONE]: () => json(detail({ staff_role: 'admin' })) }, me);
    expect(await screen.findByText('Asia/Saigon')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.detail.deleteAction })).not.toBeInTheDocument();
  });

  it('final review M6: the button is hidden when the API says this admin is the last one, and shown for another admin', async () => {
    const first = renderApp(`/users/${LAN_ID}`, { [LIST]: () => json(page([user()])), [ONE]: () => json(detail({ staff_role: 'admin', last_admin: true })) });
    expect(await screen.findByText('Asia/Saigon')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.detail.deleteAction })).not.toBeInTheDocument();
    first.unmount();
    renderApp(`/users/${LAN_ID}`, { [LIST]: () => json(page([user()])), [ONE]: () => json(detail({ staff_role: 'admin', last_admin: false })) });
    expect(await screen.findByRole('button', { name: t.detail.deleteAction })).toBeInTheDocument();
  });

  it('the dialog names the person, the confirm button waits for the typed email, 204 closes it, says so and goes back to the list', async () => {
    const r = renderApp(`/users/${LAN_ID}`, {
      [LIST]: () => json(page([user()])), [ONE]: () => json(detail()), [DELETE]: () => new Response(null, { status: 204 }),
    });
    const dialog = await openDialog();
    expect(within(dialog).getByText('Nguyễn Lan')).toBeInTheDocument();
    expect(within(dialog).queryByText(t.delete.renewing)).not.toBeInTheDocument();
    const confirm = within(dialog).getByRole('button', { name: t.delete.confirm });
    expect(confirm).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText(t.delete.typeEmail), ' lan@example.com ');
    await userEvent.click(confirm);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Đã xóa tài khoản lan@example.com.')).toBeInTheDocument();
    expect(r.calls.find((c) => c.path === `/v1/admin/users/${LAN_ID}/delete`)!.body).toEqual({ confirm_email: 'lan@example.com' });
  });

  it('D31: a renewing plan is announced in the dialog ("Gói tự gia hạn sẽ được tắt")', async () => {
    renderApp(`/users/${LAN_ID}`, { [LIST]: () => json(page([user()])), [ONE]: () => json(detail({ auto_renewing: true })) });
    expect(within(await openDialog()).getByText(t.delete.renewing)).toBeInTheDocument();
  });

  it('B8E47 / mismatch: an error from the API keeps the dialog open with its text', async () => {
    let answer = problem(400, 'confirm-email-mismatch');
    renderApp(`/users/${LAN_ID}`, { [LIST]: () => json(page([user()])), [ONE]: () => json(detail()), [DELETE]: () => answer });
    const dialog = await openDialog();
    await userEvent.type(within(dialog).getByLabelText(t.delete.typeEmail), 'other@example.com');
    await userEvent.click(within(dialog).getByRole('button', { name: t.delete.confirm }));
    expect(await within(dialog).findByText(vi.errors['confirm-email-mismatch'])).toBeInTheDocument();
    answer = problem(409, 'renewal-not-cancelled');
    await userEvent.click(within(dialog).getByRole('button', { name: t.delete.confirm }));
    expect(await within(dialog).findByText(vi.errors['renewal-not-cancelled'])).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('202 pending: the dialog closes with "Đang hoàn tất việc xóa" and the user stays on screen', async () => {
    renderApp(`/users/${LAN_ID}`, {
      [LIST]: () => json(page([user()])), [ONE]: () => json(detail()), [DELETE]: () => json({ status: 'pending' }, 202),
    });
    const dialog = await openDialog();
    await userEvent.type(within(dialog).getByLabelText(t.delete.typeEmail), 'lan@example.com');
    await userEvent.click(within(dialog).getByRole('button', { name: t.delete.confirm }));
    expect(await screen.findByText('Đang hoàn tất việc xóa lan@example.com.')).toBeInTheDocument();
  });

  it('a deleting account shows the "Đang xóa" badge and hides edit, reset, lock and unlock; the delete button stays to run it again (B8E43)', async () => {
    renderApp(`/users/${LAN_ID}`, { [LIST]: () => json(page([user({ status: 'deleting' })])), [ONE]: () => json(detail({ status: 'deleting' })) });
    // The detail has loaded once its footer button is there (the list row already carries the badge).
    expect(await screen.findByRole('button', { name: t.detail.deleteAction })).toBeInTheDocument();
    expect(screen.getAllByText(t.statuses.deleting).length).toBeGreaterThan(0);
    for (const name of [t.detail.edit, t.detail.resetPassword, t.detail.lock, t.detail.unlock]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });
});
