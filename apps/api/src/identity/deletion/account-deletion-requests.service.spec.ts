import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { PasswordHasher } from '../auth/password-hasher.service.js';
import { AccountDeletionRegistry } from './account-eraser.js';
import type { AccountDeletionService } from './account-deletion.service.js';
import { AccountDeletionRequests } from './account-deletion-requests.service.js';

const clock = new FakeClock(new Date('2026-10-29T12:00:00Z'));
const USER = randomUUID();
const ADMIN = randomUUID();
const res = {} as Response;
const body = { confirm_email: 'lan@example.com', acknowledged: true as const, password: 'right-password' };

function setup(account: Record<string, unknown> | null = {}, opts: { passwordMatches?: boolean; failedLoginCount?: number } = {}) {
  const logs: LogEntry[] = [];
  let failed = opts.failedLoginCount ?? 0;
  const user: Record<string, unknown> | null = account && {
    id: USER, email: 'lan@example.com', staffRole: null, status: 'active', loginLockedUntil: null as Date | null,
    passwordCredential: { hash: 'hash-1' }, ...account,
  };
  const tx = {
    $executeRaw: vi.fn(async () => 1),
    user: {
      findUnique: vi.fn(async () => (user ? { ...user, failedLoginCount: failed } : null)),
      update: vi.fn(async ({ data }: { data: { failedLoginCount?: number | { increment: number }; loginLockedUntil?: Date } }) => {
        if (typeof data.failedLoginCount === 'object') failed += data.failedLoginCount.increment;
        else if (data.failedLoginCount !== undefined) failed = data.failedLoginCount;
        if (data.loginLockedUntil) user!.loginLockedUntil = data.loginLockedUntil;
        return { failedLoginCount: failed };
      }),
    },
  };
  const prisma = {
    user: { findUnique: vi.fn(async () => (user ? { ...user } : null)) },
    $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
  };
  const hasher = { verify: vi.fn(async () => opts.passwordMatches ?? true) };
  const registry = new AccountDeletionRegistry();
  const precondition = {
    renewing: vi.fn(async () => false),
    turnOffRenewalForAdminDelete: vi.fn(async () => 'none' as 'turned_off' | 'none' | 'not_supported'),
  };
  registry.registerPrecondition(precondition);
  const deletion = { delete: vi.fn(async () => 'done' as const) };
  const service = new AccountDeletionRequests(
    prisma as unknown as PrismaClient, clock, new AppLogger({ write: (e) => logs.push(e) }), hasher as unknown as PasswordHasher,
    registry, deletion as unknown as AccountDeletionService,
  );
  return { service, deletion, hasher, precondition, tx, prisma, logs, failed: () => failed };
}

const own = (s: ReturnType<typeof setup>, over: Partial<typeof body> = {}, googleReauthUserId: string | null = null) =>
  s.service.deleteOwn({ userId: USER, sessionChainId: randomUUID() }, { ...body, ...over }, { res, googleReauthUserId });

describe('AccountDeletionRequests.deleteOwn (design §7.2 step 1)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('Review Focus 3: " Lan@Gmail.com " is accepted after normalisation, "lan@gmail.co" is a confirm-email-mismatch', async () => {
    const ok = setup({ email: 'lan@gmail.com' });
    expect(await own(ok, { confirm_email: ' Lan@Gmail.com ' })).toBe('done');
    expect(ok.deletion.delete).toHaveBeenCalledWith({ userId: USER, by: 'self', mode: 'normal', res });
    const bad = setup({ email: 'lan@gmail.com' });
    await expect(own(bad, { confirm_email: 'lan@gmail.co' })).rejects.toMatchObject({ status: 400, problemType: 'confirm-email-mismatch' });
    expect(bad.deletion.delete).not.toHaveBeenCalled();
    expect(bad.hasher.verify).not.toHaveBeenCalled();
  });

  it('P3: a wrong password → 400 invalid-current-password (never 401), counted once toward the lockout, nothing deleted', async () => {
    const s = setup({}, { passwordMatches: false });
    await expect(own(s)).rejects.toMatchObject({ status: 400, problemType: 'invalid-current-password' });
    expect(s.failed()).toBe(1);
    expect(s.deletion.delete).not.toHaveBeenCalled();
  });

  it('P3: a missing password for an account that has one is the same 400, counted nowhere', async () => {
    const s = setup();
    await expect(own(s, { password: undefined })).rejects.toMatchObject({ status: 400, problemType: 'invalid-current-password' });
    expect(s.hasher.verify).not.toHaveBeenCalled();
    expect(s.failed()).toBe(0);
  });

  it('the tenth wrong password locks login for 15 minutes (IR6) and answers 400; the next attempt is 429 with retry-after', async () => {
    const s = setup({}, { passwordMatches: false, failedLoginCount: 9 });
    await expect(own(s)).rejects.toMatchObject({ status: 400, problemType: 'invalid-current-password' });
    await expect(own(s)).rejects.toMatchObject({ status: 429, problemType: 'rate-limited', retryAfterSeconds: 900 });
    expect(s.deletion.delete).not.toHaveBeenCalled();
  });

  it('a staff account is refused with staff-account before any password work', async () => {
    const s = setup({ staffRole: 'editor' });
    await expect(own(s)).rejects.toMatchObject({ status: 409, problemType: 'staff-account' });
    expect(s.hasher.verify).not.toHaveBeenCalled();
  });

  it('a Google-only account needs a valid reauth for itself: none or another user → 403 reauth-required; the right user deletes', async () => {
    const s = setup({ passwordCredential: null });
    await expect(own(s, { password: undefined })).rejects.toMatchObject({ status: 403, problemType: 'reauth-required' });
    await expect(own(s, { password: undefined }, randomUUID())).rejects.toMatchObject({ status: 403, problemType: 'reauth-required' });
    expect(await own(s, { password: undefined }, USER)).toBe('done');
  });

  it('the password is verified outside the transaction and the right one resets the failure counter', async () => {
    const s = setup({}, { failedLoginCount: 3 });
    await own(s);
    expect(s.hasher.verify).toHaveBeenCalledWith('hash-1', 'right-password');
    expect(s.failed()).toBe(0);
  });

  it('an unknown caller is 401 invalid-token', async () => {
    await expect(own(setup(null))).rejects.toMatchObject({ status: 401, problemType: 'invalid-token' });
  });
});

describe('AccountDeletionRequests.deleteByAdmin (D17, D31)', () => {
  const adminBody = { confirm_email: 'lan@example.com' };
  const byAdmin = (s: ReturnType<typeof setup>, b = adminBody, target = USER) => s.service.deleteByAdmin(ADMIN, target, b, res);

  it('types the email again: a mismatch is 400 and an unknown id is 404, nothing runs', async () => {
    const s = setup();
    await expect(byAdmin(s, { confirm_email: 'other@example.com' })).rejects.toMatchObject({ status: 400, problemType: 'confirm-email-mismatch' });
    await expect(byAdmin(setup(null))).rejects.toMatchObject({ status: 404 });
    expect(s.deletion.delete).not.toHaveBeenCalled();
  });

  it('an admin may not delete themselves, before anything is switched off', async () => {
    const s = setup({ id: ADMIN });
    await expect(byAdmin(s, adminBody, ADMIN)).rejects.toMatchObject({ status: 409, problemType: 'self-delete' });
    expect(s.precondition.turnOffRenewalForAdminDelete).not.toHaveBeenCalled();
  });

  it('D31: a renewing learner whose provider accepts is deleted in the same request (done, not pending)', async () => {
    const s = setup();
    s.precondition.renewing.mockResolvedValue(true);
    s.precondition.turnOffRenewalForAdminDelete.mockResolvedValue('turned_off');
    expect(await byAdmin(s)).toBe('done');
    expect(s.deletion.delete).toHaveBeenCalledWith({ userId: USER, by: 'admin', mode: 'normal', actorId: ADMIN, res });
  });

  it('B8E47: the provider could not be told → 409 renewal-not-cancelled and nothing is deleted', async () => {
    const s = setup();
    s.precondition.renewing.mockResolvedValue(true);
    s.precondition.turnOffRenewalForAdminDelete.mockResolvedValue('not_supported');
    await expect(byAdmin(s)).rejects.toMatchObject({ status: 409, problemType: 'renewal-not-cancelled' });
    expect(s.deletion.delete).not.toHaveBeenCalled();
  });

  it('B8E43: a deleting account skips the renewal step and goes straight to the deletion', async () => {
    const s = setup({ status: 'deleting' });
    s.precondition.renewing.mockResolvedValue(true);
    await byAdmin(s);
    expect(s.precondition.turnOffRenewalForAdminDelete).not.toHaveBeenCalled();
    expect(s.deletion.delete).toHaveBeenCalledTimes(1);
  });

  it('a learner who does not renew is deleted without touching the provider', async () => {
    const s = setup();
    await byAdmin(s);
    expect(s.precondition.turnOffRenewalForAdminDelete).not.toHaveBeenCalled();
    expect(s.deletion.delete).toHaveBeenCalledTimes(1);
  });
});
