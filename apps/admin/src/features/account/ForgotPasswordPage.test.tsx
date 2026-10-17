import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi as vitest } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem, rateLimited } from '../../auth/test-support';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { renderAccount } from './test-utils';

const base = {
  'POST /v1/auth/refresh': () => problem(401, 'invalid-token'),
  'POST /v1/auth/otp': () => new Response(null, { status: 204 }),
  'POST /v1/auth/password/reset': () => new Response(null, { status: 204 }),
};
const t = vi.account.forgot;

async function toStepTwo(routes: Record<string, () => Response> = {}) {
  const r = renderAccount(<ForgotPasswordPage />, { path: '/forgot-password', routes: { ...base, ...routes } });
  await userEvent.type(await screen.findByLabelText(t.email), 'ten@wordmet.com');
  await userEvent.click(screen.getByRole('button', { name: t.send }));
  await screen.findByLabelText(t.code);
  return r;
}

afterEach(() => vitest.useRealTimers());

describe('ForgotPasswordPage', () => {
  it('forgot password: step 1 → step 2 → success → /login', async () => {
    const { calls } = await toStepTwo();
    expect(calls.find((c) => c.path === '/v1/auth/otp')!.body).toEqual({ purpose: 'reset_password', email: 'ten@wordmet.com' });
    expect(screen.getByText(/ten@wordmet\.com/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(t.code), '482913');
    await userEvent.type(screen.getByLabelText(t.newPassword), 'Abcdef1!x');
    await userEvent.click(screen.getByRole('button', { name: t.submit }));

    expect(await screen.findByTestId('where')).toHaveTextContent('/login');
    expect(calls.find((c) => c.path === '/v1/auth/password/reset')!.body).toEqual({
      email: 'ten@wordmet.com',
      code: '482913',
      new_password: 'Abcdef1!x',
    });
  });

  it('reset code input: " 123 456 " is sent as "123456"', async () => {
    const { calls } = await toStepTwo();
    await userEvent.type(screen.getByLabelText(t.code), ' 123 456 ');
    await userEvent.type(screen.getByLabelText(t.newPassword), 'Abcdef1!x');
    await userEvent.click(screen.getByRole('button', { name: t.submit }));
    await waitFor(() => expect(calls.some((c) => c.path === '/v1/auth/password/reset')).toBe(true));
    expect((calls.find((c) => c.path === '/v1/auth/password/reset')!.body as { code: string }).code).toBe('123456');
  });

  it('a password that breaks the policy is not sent; the unmet rules are listed under the field', async () => {
    const { count } = await toStepTwo();
    await userEvent.type(screen.getByLabelText(t.code), '482913');
    await userEvent.type(screen.getByLabelText(t.newPassword), 'matkhau1');
    await userEvent.click(screen.getByRole('button', { name: t.submit }));

    expect(await screen.findByText(vi.account.passwordRules.uppercase)).toBeInTheDocument();
    expect(screen.getByText(vi.account.passwordRules.special)).toBeInTheDocument();
    expect(count('POST', '/v1/auth/password/reset')).toBe(0);
  });

  it('B25E15: resend 429 Retry-After 30 → the button is disabled with a 30 s countdown', async () => {
    let otpCalls = 0;
    await toStepTwo({ 'POST /v1/auth/otp': () => (otpCalls++ === 0 ? new Response(null, { status: 204 }) : rateLimited(30)) });
    vitest.useFakeTimers({ shouldAdvanceTime: true });

    await userEvent.click(screen.getByRole('button', { name: t.resend }));

    const button = await screen.findByRole('button', { name: /30/ });
    expect(button).toBeDisabled();
    await act(async () => {
      await vitest.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByRole('button', { name: /29/ })).toBeDisabled();
    // each second re-renders before the next timer is set, so step one second at a time
    for (let i = 0; i < 29; i++) {
      await act(async () => {
        await vitest.advanceTimersByTimeAsync(1000);
      });
    }
    expect(screen.getByRole('button', { name: t.resend })).toBeEnabled();
  });

  it('B25E23: a wrong reset code shows the invalid-otp message and a link to request a new code', async () => {
    await toStepTwo({ 'POST /v1/auth/password/reset': () => problem(400, 'invalid-otp') });
    await userEvent.type(screen.getByLabelText(t.code), '000000');
    await userEvent.type(screen.getByLabelText(t.newPassword), 'Abcdef1!x');
    await userEvent.click(screen.getByRole('button', { name: t.submit }));

    expect(await screen.findByText(vi.errors['invalid-otp'])).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t.requestNew }));
    expect(await screen.findByLabelText(t.email)).toHaveValue('ten@wordmet.com');
  });

  it('B25E23: a locked code (429 rate-limited) disables the code field and the button with a countdown', async () => {
    await toStepTwo({ 'POST /v1/auth/password/reset': () => rateLimited(60) });
    vitest.useFakeTimers({ shouldAdvanceTime: true });
    await userEvent.type(screen.getByLabelText(t.code), '000000');
    await userEvent.type(screen.getByLabelText(t.newPassword), 'Abcdef1!x');
    await userEvent.click(screen.getByRole('button', { name: t.submit }));

    await waitFor(() => expect(screen.getByLabelText(t.code)).toBeDisabled());
    expect(screen.getByRole('button', { name: /60/ })).toBeDisabled();
  });

  it('Review Focus 3: a double-click on "Đặt lại mật khẩu" sends one reset request', async () => {
    const { count } = await toStepTwo();
    await userEvent.type(screen.getByLabelText(t.code), '482913');
    await userEvent.type(screen.getByLabelText(t.newPassword), 'Abcdef1!x');
    await userEvent.dblClick(screen.getByRole('button', { name: t.submit }));
    await waitFor(() => expect(count('POST', '/v1/auth/password/reset')).toBe(1));
  });
});
