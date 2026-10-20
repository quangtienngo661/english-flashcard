import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { otpCodeFor } from './mailpit';

export const API = process.env.E2E_API_URL ?? 'http://localhost:3000';
/** Where `dist/cli/admin-grant.js` lives. Default `../api` (CI); locally point it at the API worktree that has the `.env`. */
export const API_DIR = path.resolve(process.cwd(), process.env.E2E_API_DIR ?? '../api');

async function post(pathname: string, body: unknown, token?: string): Promise<Response> {
  return fetch(`${API}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), 'X-CSRF-Protection': '1' },
    body: JSON.stringify(body),
  });
}

async function expectStatus(res: Response, status: number, what: string): Promise<Response> {
  if (res.status !== status) throw new Error(`${what}: expected ${status}, got ${res.status}: ${await res.text()}`);
  return res;
}

export async function waitForHealth(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      if ((await fetch(`${API}/v1/health`)).ok) return;
    } catch {
      // not up yet
    }
    if (Date.now() > deadline) throw new Error(`API not healthy at ${API} after ${timeoutMs} ms`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/** Register, then verify the email with the OTP that registration mails (read from Mailpit). */
export async function registerVerified(email: string, password: string): Promise<void> {
  const registered = (await (
    await expectStatus(await post('/v1/auth/register', { email, password, timezone: 'Asia/Ho_Chi_Minh', given_name: 'Smoke', birth_date: '2000-01-01', accept_terms: true, client: 'web' }), 201, `register ${email}`)
  ).json()) as { access_token: string };
  // Registration already mails one code; asking for another would invalidate it and race the mail delivery.
  const code = await otpCodeFor(email);
  await expectStatus(await post('/v1/auth/verify-email', { code }, registered.access_token), 200, 'verify email');
}

/** Makes `email` an admin through the CLI, which loads the API's own environment (no secret passes through the tests). */
export function grantAdmin(email: string): void {
  execFileSync(process.execPath, ['dist/cli/admin-grant.js', email], { cwd: API_DIR, stdio: 'pipe' });
}

export async function loginToken(email: string, password: string): Promise<string> {
  const res = await expectStatus(await post('/v1/auth/login', { email, password, client: 'web', device_label: 'e2e-real' }), 200, `login ${email}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

/** Revokes every session of the user (the API's behaviour on a password change). */
export async function changePasswordViaApi(token: string, current: string, next: string): Promise<void> {
  await expectStatus(await post('/v1/auth/password/change', { current_password: current, new_password: next }, token), 200, 'change password');
}
