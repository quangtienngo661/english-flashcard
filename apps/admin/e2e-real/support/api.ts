import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { mailsTo, otpCodeFor } from './mailpit';

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
  const before = (await mailsTo(email)).length;
  await expectStatus(await post('/v1/auth/register', { email, password, timezone: 'Asia/Ho_Chi_Minh', given_name: 'Smoke', birth_date: '2000-01-01', accept_terms: true, client: 'web' }), 201, `register ${email}`);
  // Registration already mails one code; asking for another would invalidate it and race the mail delivery.
  const code = await otpCodeFor(email, before + 1);
  await expectStatus(await post('/v1/auth/verify-email', { email, code, password, client: 'web' }), 200, 'verify email');
}

/** Makes `email` an admin through the CLI, which loads the API's own environment (no secret passes through the tests). */
export function grantAdmin(email: string): void {
  execFileSync(process.execPath, ['dist/cli/admin-grant.js', email], { cwd: API_DIR, stdio: 'pipe' });
}

/** Seconds to wait from a 429's `Retry-After` (the whole suite signs in more than `auth.login.ip` allows in one minute). */
export const retryAfterSeconds = (header: string | null | undefined): number => Number(header ?? '') || 60;

export async function loginToken(email: string, password: string): Promise<string> {
  const body = { email, password, client: 'web', device_label: 'e2e-real' };
  let res = await post('/v1/auth/login', body);
  if (res.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, (retryAfterSeconds(res.headers.get('retry-after')) + 1) * 1000));
    res = await post('/v1/auth/login', body);
  }
  await expectStatus(res, 200, `login ${email}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

/** Revokes every session of the user (the API's behaviour on a password change). */
export async function changePasswordViaApi(token: string, current: string, next: string): Promise<void> {
  await expectStatus(await post('/v1/auth/password/change', { current_password: current, new_password: next }, token), 200, 'change password');
}

/** One authenticated call to the real API (`X-CSRF-Protection` included); returns the parsed JSON body, or `undefined` for 204. */
export async function apiCall<T>(method: string, pathname: string, token: string, body?: unknown, opts: { idempotencyKey?: string } = {}): Promise<T> {
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'X-CSRF-Protection': '1',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(opts.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${pathname}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/**
 * An account made by the admin instead of a registration (`user.write` rate limit, so it does not use the 5-an-hour
 * `auth.register.ip` budget). `'editor'` stays an editor; `null` creates an editor, removes the role and sets the learner's
 * native language, which every learner route needs (`profile-incomplete` otherwise).
 */
export async function createAccount(adminToken: string, email: string, role: 'editor' | null): Promise<{ id: string; password: string }> {
  const password = `Real-${randomUUID().slice(0, 8)}-Pass-9!`;
  const created = await apiCall<{ id: string }>('POST', '/v1/admin/users', adminToken, {
    email, staff_role: 'editor', password, must_change_password: false, timezone: 'Asia/Ho_Chi_Minh', given_name: 'E2E',
  });
  if (role === null) {
    await apiCall('PUT', `/v1/admin/users/${created.id}/staff-role`, adminToken, { staff_role: null });
    const token = await loginToken(email, password);
    await apiCall('PATCH', '/v1/me', token, { native_language: 'vi' });
  }
  return { id: created.id, password };
}
