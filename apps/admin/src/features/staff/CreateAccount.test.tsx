import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi as vitest } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem, rateLimited } from '../../auth/test-support';
import { LIST_URL, renderApp, row } from './test-utils';

const t = vi.staff.create;
const CREATED = row({ id: 'u7', email: 'new.editor@wordmet.com' });
const POST = 'POST /v1/admin/users';

async function openDialog(post: () => Response = () => Response.json(CREATED, { status: 201 })) {
  const r = renderApp('/staff', {
    [LIST_URL]: () => Response.json({ items: [row({ id: 'me-1', email: 'admin@wordmet.com', staff_role: 'admin' })], next_page_token: null }),
    [POST]: post,
  });
  await userEvent.click(await screen.findByRole('button', { name: vi.staff.createAccount }));
  const dialog = await screen.findByRole('dialog');
  await userEvent.type(within(dialog).getByLabelText(t.email), CREATED.email);
  return { ...r, dialog };
}

const created = (calls: { method: string; path: string; body: unknown }[]) =>
  calls.filter((c) => c.method === 'POST' && c.path === '/v1/admin/users');

// Every test types through userEvent; the default 5 s is too tight on a loaded machine.
describe('create account dialog', { timeout: 20_000 }, () => {
  it('defaults: both boxes ticked, role editor; the request has must_change_password true, a timezone and no password; success names the email and shows no password', async () => {
    const { dialog, calls } = await openDialog();
    expect(within(dialog).getByRole('checkbox', { name: t.generate })).toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: t.mustChange })).toBeChecked();
    expect(within(dialog).queryByLabelText(t.password)).toBeNull();

    await userEvent.click(within(dialog).getByRole('button', { name: t.continue }));
    const confirm = await screen.findByRole('dialog');
    expect(within(confirm).getByText(new RegExp(CREATED.email.replace('.', '\\.')))).toBeInTheDocument();
    await userEvent.click(within(confirm).getByRole('button', { name: t.submit }));

    const done = await screen.findByText(t.doneBody.replace('{email}', CREATED.email));
    expect(done).toBeInTheDocument();
    const [post] = created(calls);
    expect(post.body).toEqual({
      email: CREATED.email,
      staff_role: 'editor',
      must_change_password: true,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    expect(document.body.textContent).not.toMatch(/password|mật khẩu:/i);
  });

  it('unticked generation: the typed password is sent only after it passes the policy and matches the confirmation', async () => {
    const { dialog, calls } = await openDialog();
    await userEvent.click(within(dialog).getByRole('checkbox', { name: t.generate }));
    const password = within(dialog).getByLabelText(t.password, { exact: true });
    const confirmField = within(dialog).getByLabelText(t.confirmPassword);

    await userEvent.type(password, 'weak');
    await userEvent.type(confirmField, 'weak');
    await userEvent.click(within(dialog).getByRole('button', { name: t.continue }));
    expect(await within(dialog).findByText(vi.account.passwordRules.uppercase)).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1); // no confirmation step
    expect(created(calls)).toHaveLength(0);

    await userEvent.clear(password);
    await userEvent.clear(confirmField);
    await userEvent.type(password, 'Abcdef1!x');
    await userEvent.type(confirmField, 'Abcdef1!y');
    await userEvent.click(within(dialog).getByRole('button', { name: t.continue }));
    expect(await within(dialog).findByText(vi.account.changePassword.mismatch)).toBeInTheDocument();
    expect(created(calls)).toHaveLength(0);

    await userEvent.clear(confirmField);
    await userEvent.type(confirmField, 'Abcdef1!x');
    await userEvent.click(within(dialog).getByRole('button', { name: t.continue }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: t.submit }));
    await screen.findByText(t.doneBody.replace('{email}', CREATED.email));
    expect(created(calls)[0].body).toMatchObject({ password: 'Abcdef1!x', must_change_password: true });
    expect(document.body.textContent).not.toContain('Abcdef1!x');
  }, 20_000); // many keystrokes through userEvent

  it('unticking "bắt đổi mật khẩu" sends must_change_password false; picking admin sends admin', async () => {
    const { dialog, calls } = await openDialog();
    await userEvent.click(within(dialog).getByRole('checkbox', { name: t.mustChange }));
    await userEvent.click(within(dialog).getByRole('button', { name: new RegExp(vi.staff.create.role) }));
    await userEvent.click(await screen.findByRole('option', { name: 'admin' }));
    await userEvent.click(within(dialog).getByRole('button', { name: t.continue }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: t.submit }));
    await screen.findByText(t.doneBody.replace('{email}', CREATED.email));
    expect(created(calls)[0].body).toMatchObject({ staff_role: 'admin', must_change_password: false });
  });

  it('an invalid email is refused before the confirmation step', async () => {
    renderApp('/staff', { [LIST_URL]: () => Response.json({ items: [], next_page_token: null }) });
    await userEvent.click(await screen.findByRole('button', { name: vi.staff.createAccount }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(t.email), 'not-an-email');
    await userEvent.click(within(dialog).getByRole('button', { name: t.continue }));
    expect(await within(dialog).findByText(t.emailInvalid)).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('B25#25: email-taken suggests "Tìm theo email" and returns to the form', async () => {
    const { dialog } = await openDialog(() => problem(409, 'email-taken'));
    await userEvent.click(within(dialog).getByRole('button', { name: t.continue }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: t.submit }));
    expect(await screen.findByText(t.emailTaken)).toBeInTheDocument();
    expect(screen.getByLabelText(t.email)).toHaveValue(CREATED.email);
  });

  it('B25E16: mail-unavailable keeps the dialog open with its message and the typed values', async () => {
    const { dialog } = await openDialog(() => problem(503, 'mail-unavailable'));
    await userEvent.click(within(dialog).getByRole('button', { name: t.continue }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: t.submit }));
    expect(await screen.findByText(t.mailUnavailable)).toBeInTheDocument();
    expect(screen.getByLabelText(t.email)).toHaveValue(CREATED.email);
  });

  it('Review Focus 3 (unit): a double-click on "Tạo tài khoản" sends one POST', async () => {
    const { dialog, calls } = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: t.continue }));
    await userEvent.dblClick(within(await screen.findByRole('dialog')).getByRole('button', { name: t.submit }));
    await screen.findByText(t.doneBody.replace('{email}', CREATED.email));
    await waitFor(() => expect(created(calls)).toHaveLength(1));
  });

  it('after success the list is refreshed', async () => {
    const { dialog, count } = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: t.continue }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: t.submit }));
    await screen.findByText(t.doneBody.replace('{email}', CREATED.email));
    await waitFor(() => expect(count('GET', '/v1/admin/staff?page_size=20')).toBe(2));
  });
});

const retryIn = (n: number) => vi.errors.retryIn.replace('{seconds}', String(n));
afterEach(() => vitest.useRealTimers());
async function tick() {
  await act(async () => {
    await vitest.advanceTimersByTimeAsync(1000);
  });
}

describe('create account dialog — rate limit', { timeout: 20_000 }, () => {
  it('B25#18: 429 with Retry-After 30 disables submit and counts 30 → 0, then re-enables', async () => {
    const { dialog } = await openDialog(() => rateLimited(30));
    vitest.useFakeTimers({ shouldAdvanceTime: true });
    await userEvent.click(within(dialog).getByRole('button', { name: t.continue }));
    const confirm = await screen.findByRole('dialog');
    await userEvent.click(within(confirm).getByRole('button', { name: t.submit }));

    expect(await screen.findByRole('button', { name: retryIn(30) })).toBeDisabled();
    await tick();
    expect(screen.getByRole('button', { name: retryIn(29) })).toBeDisabled();
    for (let i = 0; i < 29; i++) await tick();
    expect(screen.getByRole('button', { name: t.submit })).toBeEnabled();
  });
});
