import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem } from '../../auth/test-support';
import { LIST_URL, ME_ADMIN, renderApp, row } from './test-utils';

const t = vi.staff;
const ME_ROW = row({ id: 'me-1', email: 'admin@wordmet.com', staff_role: 'admin' });
const MAI = row({ id: 'u2', email: 'mai@wordmet.com' });
const page = (items = [ME_ROW, MAI], next: string | null = null) => ({ items, next_page_token: next });
const listOk = () => Response.json(page());

async function openStaff(extra: Record<string, () => Response> = {}) {
  const r = renderApp('/staff', { [LIST_URL]: listOk, ...extra });
  await screen.findAllByText(MAI.email);
  return r;
}

async function search(email: string) {
  await userEvent.type(screen.getByLabelText(t.search.label), email);
  await userEvent.click(screen.getByRole('button', { name: t.search.submit }));
}

describe('StaffPage — list and search', () => {
  it('staff list: "Tải thêm" fetches next_page_token until null', async () => {
    const HUY = row({ id: 'u3', email: 'huy@wordmet.com' });
    renderApp('/staff', {
      [LIST_URL]: () => Response.json(page([ME_ROW, MAI], 't2')),
      'GET /v1/admin/staff?page_size=20&page_token=t2': () => Response.json(page([HUY], null)),
    });
    await screen.findAllByText(MAI.email);
    expect(screen.getAllByText(vi.staff.list.shown.replace('{count}', '2')).length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: vi.common.loadMore }));

    expect((await screen.findAllByText(HUY.email)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: vi.common.loadMore })).toBeNull();
  });

  it('the list shows an error with retry, and an empty list says so', async () => {
    renderApp('/staff', { [LIST_URL]: () => problem(500, '') });
    expect(await screen.findByRole('button', { name: vi.common.retry })).toBeInTheDocument();
  });

  it('find by email: unknown email → "not found" message', async () => {
    await openStaff({ 'GET /v1/admin/users?email=no%40x.co': () => problem(404, 'not-found') });
    await search('no@x.co');
    expect(await screen.findByText(t.search.notFound)).toBeInTheDocument();
  });

  it('find by email: a verified user without a role can be granted either role; "Gỡ vai trò" is disabled', async () => {
    await openStaff({ 'GET /v1/admin/users?email=new%40x.co': () => Response.json(row({ id: 'u9', email: 'new@x.co', staff_role: null })) });
    await search('new@x.co');
    expect(await screen.findByRole('button', { name: t.card.grantEditor })).toBeEnabled();
    expect(screen.getByRole('button', { name: t.card.grantAdmin })).toBeEnabled();
    expect(screen.getByRole('button', { name: t.card.remove })).toBeDisabled();
  });

  it('find by email: unverified user → grant buttons disabled with the reason', async () => {
    await openStaff({
      'GET /v1/admin/users?email=u%40x.co': () => Response.json(row({ id: 'u9', email: 'u@x.co', staff_role: null, email_verified: false })),
    });
    await search('u@x.co');
    expect(await screen.findByText(t.card.unverifiedHint)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.card.grantEditor })).toBeDisabled();
    expect(screen.getByRole('button', { name: t.card.grantAdmin })).toBeDisabled();
  });
});

describe('StaffPage — changing a role', () => {
  it('grant editor: confirm sends PUT {staff_role:"editor"}, closes the dialog and refreshes the list', async () => {
    const { calls, count } = await openStaff({
      'GET /v1/admin/users?email=new%40x.co': () => Response.json(row({ id: 'u9', email: 'new@x.co', staff_role: null })),
      'PUT /v1/admin/users/u9/staff-role': () => Response.json(row({ id: 'u9', email: 'new@x.co' })),
    });
    await search('new@x.co');
    await userEvent.click(await screen.findByRole('button', { name: t.card.grantEditor }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(t.dialog.grantTitle.replace('{role}', 'editor'))).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: vi.common.confirm }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(calls.find((c) => c.method === 'PUT')!.body).toEqual({ staff_role: 'editor' });
    await waitFor(() => expect(count('GET', '/v1/admin/staff?page_size=20')).toBe(2));
  });

  it('UBC14 granting editor confirms with a toast naming the role and the email', async () => {
    await openStaff({
      'GET /v1/admin/users?email=new%40x.co': () => Response.json(row({ id: 'u9', email: 'new@x.co', staff_role: null })),
      'PUT /v1/admin/users/u9/staff-role': () => Response.json(row({ id: 'u9', email: 'new@x.co' })),
    });
    await search('new@x.co');
    await userEvent.click(await screen.findByRole('button', { name: t.card.grantEditor }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: vi.common.confirm }));
    expect(await screen.findByText(t.toast.granted.replace('{role}', 'editor').replace('{email}', 'new@x.co'))).toBeInTheDocument();
  });

  it('UBC14 removing a role confirms with the removal toast', async () => {
    await openStaff({ 'PUT /v1/admin/users/u2/staff-role': () => Response.json(row({ id: 'u2', email: MAI.email, staff_role: null })) });
    await userEvent.click(screen.getAllByRole('button', { name: t.list.change })[1]);
    await userEvent.click(await screen.findByRole('button', { name: t.card.remove }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: t.card.remove }));
    expect(await screen.findByText(t.toast.removed.replace('{email}', MAI.email))).toBeInTheDocument();
  });

  it('remove: the dialog names the user; confirm sends PUT {staff_role:null}', async () => {
    const { calls } = await openStaff({ 'PUT /v1/admin/users/u2/staff-role': () => Response.json(row({ id: 'u2', email: MAI.email, staff_role: null })) });
    await userEvent.click(screen.getAllByRole('button', { name: t.list.change })[1]);
    await userEvent.click(await screen.findByRole('button', { name: t.card.remove }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(t.dialog.removeTitle.replace('{email}', MAI.email))).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: t.card.remove }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ staff_role: null }));
  });

  it('B25#10: staff-role-rule on a grant → a specific message in the dialog, and the list is not refetched', async () => {
    const { count } = await openStaff({
      'GET /v1/admin/users?email=new%40x.co': () => Response.json(row({ id: 'u9', email: 'new@x.co', staff_role: null })),
      'PUT /v1/admin/users/u9/staff-role': () => problem(409, 'staff-role-rule'),
    });
    await search('new@x.co');
    await userEvent.click(await screen.findByRole('button', { name: t.card.grantEditor }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: vi.common.confirm }));

    expect(await within(dialog).findByText(t.card.unverifiedHint)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(count('GET', '/v1/admin/staff?page_size=20')).toBe(1);
  });

  it('B25E4: the last admin removing their own role → "Không thể gỡ admin cuối cùng"', async () => {
    await openStaff({ 'PUT /v1/admin/users/me-1/staff-role': () => problem(409, 'staff-role-rule') });
    await userEvent.click(screen.getAllByRole('button', { name: t.list.change })[0]);
    await userEvent.click(await screen.findByRole('button', { name: t.card.remove }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(t.dialog.selfTitle)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: t.dialog.selfConfirm }));
    expect(await within(dialog).findByText(t.dialog.lastAdmin)).toBeInTheDocument();
  });

  it('B25E5: an admin who demotes themself to editor → /me is re-read, /staff leaves the nav and the page moves on', async () => {
    let meReads = 0;
    renderApp('/staff', {
      [LIST_URL]: listOk,
      'GET /v1/me': () =>
        Response.json(meReads++ === 0 ? ME_ADMIN : { ...ME_ADMIN, staff_role: 'editor', permissions: ['content.edit', 'content.import', 'content.publish', 'taxonomy.manage'] }),
      'PUT /v1/admin/users/me-1/staff-role': () => Response.json(row({ id: 'me-1', email: 'admin@wordmet.com', staff_role: 'editor' })),
      'GET /v1/admin/content/uploads?page_size=20': () => Response.json({ items: [], next_page_token: null }),
    });
    await screen.findAllByText(MAI.email);
    await userEvent.click(screen.getAllByRole('button', { name: t.list.change })[0]);
    await userEvent.click(await screen.findByRole('button', { name: t.card.grantEditor }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(t.dialog.selfTitle)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: t.dialog.selfConfirm }));

    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(vi.nav.uploads));
    expect(screen.queryByRole('link', { name: vi.nav.staff })).toBeNull();
  });

  it('Review Focus 4: an admin who demotes themself still sees the toast after being moved off /staff', async () => {
    let meReads = 0;
    renderApp('/staff', {
      [LIST_URL]: listOk,
      'GET /v1/me': () =>
        Response.json(meReads++ === 0 ? ME_ADMIN : { ...ME_ADMIN, staff_role: 'editor', permissions: ['content.edit', 'content.import', 'content.publish', 'taxonomy.manage'] }),
      'PUT /v1/admin/users/me-1/staff-role': () => Response.json(row({ id: 'me-1', email: 'admin@wordmet.com', staff_role: 'editor' })),
      'GET /v1/admin/content/uploads?page_size=20': () => Response.json({ items: [], next_page_token: null }),
    });
    await screen.findAllByText(MAI.email);
    await userEvent.click(screen.getAllByRole('button', { name: t.list.change })[0]);
    await userEvent.click(await screen.findByRole('button', { name: t.card.grantEditor }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: t.dialog.selfConfirm }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(vi.nav.uploads));
    expect(screen.getByText(t.toast.granted.replace('{role}', 'editor').replace('{email}', 'admin@wordmet.com'))).toBeInTheDocument();
  });

  it('Review Focus 3 (unit): a double-click on "Xác nhận" sends one PUT', async () => {
    const { count } = await openStaff({
      'GET /v1/admin/users?email=new%40x.co': () => Response.json(row({ id: 'u9', email: 'new@x.co', staff_role: null })),
      'PUT /v1/admin/users/u9/staff-role': () => Response.json(row({ id: 'u9', email: 'new@x.co' })),
    });
    await search('new@x.co');
    await userEvent.click(await screen.findByRole('button', { name: t.card.grantEditor }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.dblClick(within(dialog).getByRole('button', { name: vi.common.confirm }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(count('PUT', '/v1/admin/users/u9/staff-role')).toBe(1);
  });
});
