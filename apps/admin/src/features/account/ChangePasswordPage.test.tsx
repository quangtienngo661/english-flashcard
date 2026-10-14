import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem, tokenResponse } from '../../auth/test-support';
import { ChangePasswordPage } from './ChangePasswordPage';
import { renderAccount } from './test-utils';

const t = vi.account.changePassword;
const GOOD = 'Abcdef1!x';

function routes(over: Record<string, () => Response> = {}) {
  let meCalls = 0;
  return {
    'POST /v1/auth/refresh': () => tokenResponse('tok-1'),
    // the flag stays true until the password has been changed
    'GET /v1/me': () => Response.json(makeMe({ must_change_password: meCalls++ === 0 })),
    'POST /v1/auth/password/change': () => tokenResponse('tok-2'),
    'POST /v1/auth/logout': () => new Response(null, { status: 204 }),
    ...over,
  };
}

async function open(over: Record<string, () => Response> = {}) {
  const r = renderAccount(<ChangePasswordPage />, { path: '/change-password', routes: routes(over) });
  await screen.findByLabelText(t.current);
  return r;
}

async function fill(current: string, next: string, confirm: string) {
  await userEvent.type(screen.getByLabelText(t.current), current);
  await userEvent.type(screen.getByLabelText(t.new), next);
  await userEvent.type(screen.getByLabelText(t.confirm), confirm);
  await userEvent.click(screen.getByRole('button', { name: t.submit }));
}

describe('ChangePasswordPage', () => {
  it('B25#27 (screen): success → the app (/)', async () => {
    const { calls } = await open();
    await fill('generated', GOOD, GOOD);
    expect(await screen.findByTestId('where')).toHaveTextContent(/^\/$/);
    expect(calls.find((c) => c.path === '/v1/auth/password/change')!.body).toEqual({ current_password: 'generated', new_password: GOOD });
  });

  it('B25#27 (screen): a confirmation that differs is caught before any request', async () => {
    const { count } = await open();
    await fill('generated', GOOD, `${GOOD}x`);
    expect(await screen.findByText(t.mismatch)).toBeInTheDocument();
    expect(count('POST', '/v1/auth/password/change')).toBe(0);
  });

  it('a new password that breaks the policy is not sent; the unmet rules are listed', async () => {
    const { count } = await open();
    await fill('generated', 'abc', 'abc');
    expect(await screen.findByText(vi.account.passwordRules.min_length)).toBeInTheDocument();
    expect(count('POST', '/v1/auth/password/change')).toBe(0);
  });

  it('B25#27 (screen): a 400 with same_as_current is listed under the new password and the form stays', async () => {
    await open({ 'POST /v1/auth/password/change': () => problem(400, 'validation-failed', { violations: ['same_as_current'] }) });
    await fill('generated', GOOD, GOOD);
    expect(await screen.findByText(vi.errors.same_as_current)).toBeInTheDocument();
    expect(screen.getByLabelText(t.current)).toBeInTheDocument();
  });

  it('a wrong current password is reported under that field', async () => {
    await open({ 'POST /v1/auth/password/change': () => problem(400, 'invalid-current-password') });
    await fill('nope', GOOD, GOOD);
    expect(await screen.findByText(vi.errors['invalid-current-password'])).toBeInTheDocument();
  });

  it('Review Focus 3: a double-click sends one change request', async () => {
    const { count } = await open();
    await userEvent.type(screen.getByLabelText(t.current), 'generated');
    await userEvent.type(screen.getByLabelText(t.new), GOOD);
    await userEvent.type(screen.getByLabelText(t.confirm), GOOD);
    await userEvent.dblClick(screen.getByRole('button', { name: t.submit }));
    await waitFor(() => expect(count('POST', '/v1/auth/password/change')).toBe(1));
  });

  it('"Đăng xuất" logs out and returns to /login', async () => {
    const { count } = await open();
    await userEvent.click(screen.getByRole('button', { name: t.logout }));
    expect(await screen.findByTestId('where')).toHaveTextContent('/login');
    expect(count('POST', '/v1/auth/logout')).toBe(1);
  });

  it('a signed-out visitor is sent to /login', async () => {
    renderAccount(<ChangePasswordPage />, {
      path: '/change-password',
      routes: { 'POST /v1/auth/refresh': () => problem(401, 'invalid-token') },
    });
    expect(await screen.findByTestId('where')).toHaveTextContent('/login');
  });
});
