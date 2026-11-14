import { createHmac } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { FakeMailer } from '../../common/mail/fake-mailer.js';
import type { MailBudget } from '../../common/mail/mail-budget.service.js';
import { MailDispatcher } from '../../common/mail/mail-dispatcher.service.js';
import { otpLockedMail, passwordChangedMail, passwordResetMail } from '../mailer/templates.js';
import type { SessionService } from '../sessions/session.service.js';
import type { OtpService } from './otp.service.js';
import type { PasswordHasher } from './password-hasher.service.js';
import { PasswordService } from './password.service.js';
import { fakeLoginFailures } from '../../../test/support/fake-login-failures.js';
import { testConfig } from '../../../test/support/test-config.js';

describe('password change and reset (unit, isolated persistence)', () => {
  const clock = new FakeClock(new Date('2026-10-07T12:00:00Z'));
  const config = testConfig();
  // F4: the failure row of a change is keyed on the HMAC of the client ip, as the rate limiter keys an ip.
  const ip = '203.0.113.7';
  const keyOf = (value: string) => createHmac('sha256', config.rateLimitHmacKey).update(value).digest('hex').slice(0, 32);
  let failures: ReturnType<typeof fakeLoginFailures>;
  const logs: LogEntry[] = [];
  const logger = new AppLogger({ write: (entry) => { logs.push(entry); } });
  const mailer = new FakeMailer();
  const budget = { tryConsume: vi.fn() };
  const dispatcher = new MailDispatcher(mailer, budget as unknown as MailBudget, logger);
  const hasher = { hash: vi.fn(), verify: vi.fn() };
  const sessions = { startChain: vi.fn(), revokeAllForUser: vi.fn() };
  const otp = { checkInTx: vi.fn() };
  const tx = { $executeRaw: vi.fn(), user: { findUnique: vi.fn(), update: vi.fn() },
    passwordCredential: { update: vi.fn(), upsert: vi.fn() }, sessionChain: { findUnique: vi.fn() },
    pendingRegistration: { deleteMany: vi.fn() },
    loginFailure: {} as ReturnType<typeof fakeLoginFailures>['table'] };
  const prisma = { user: { findUnique: vi.fn() }, $transaction: vi.fn() };
  const subject = { userId: 'user', sessionChainId: 'old-chain' };
  const account = { id: 'user', email: 'foo@example.com', emailVerifiedAt: null, status: 'active',
    passwordCredential: { hash: 'old-hash' } };
  const chain = { userId: 'user', clientType: 'web', deviceLabel: 'Browser' };
  const change = { current_password: 'Password1!', new_password: 'NewPassword1!' };
  const reset = { email: '  Foo@Example.COM ', code: '012345', new_password: change.new_password };
  const issued = { accessToken: 'access', refreshToken: 'refresh', sessionChainId: 'new-chain',
    client: 'web', refreshExpiresAt: clock.now() };
  let service: PasswordService;
  let res: Response;
  let committed: boolean;
  beforeEach(() => {
    vi.resetAllMocks(); mailer.sent.length = 0; logs.length = 0; committed = false;
    clock.set(new Date('2026-10-07T12:00:00Z'));
    failures = fakeLoginFailures(); tx.loginFailure = failures.table;
    res = Object.assign(new EventEmitter(), { closed: false }) as unknown as Response;
    prisma.user.findUnique.mockResolvedValue(account); tx.user.findUnique.mockResolvedValue(account);
    tx.user.update.mockResolvedValue(account);
    tx.sessionChain.findUnique.mockResolvedValue(chain);
    prisma.$transaction.mockImplementation(async (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
      const result = await fn(tx as unknown as Prisma.TransactionClient); committed = true; return result;
    });
    hasher.verify.mockResolvedValue(true); hasher.hash.mockResolvedValue('new-hash');
    sessions.startChain.mockResolvedValue(issued); otp.checkInTx.mockResolvedValue({ kind: 'ok' });
    budget.tryConsume.mockResolvedValue(true);
    service = new PasswordService(prisma as unknown as PrismaClient, clock, hasher as unknown as PasswordHasher,
      sessions as unknown as SessionService, otp as unknown as OtpService, dispatcher, logger, config);
  });
  async function close() { res.emit('close'); await dispatcher.drain(); }

  it('B1#22/I26: change hashes and verifies before locking, replaces credentials and sessions, and sends only after commit and close', async () => {
    const events: string[] = [];
    hasher.verify.mockImplementation(async () => { events.push('verify'); return true; });
    hasher.hash.mockImplementation(async () => { events.push('hash'); return 'new-hash'; });
    tx.$executeRaw.mockImplementation(async () => { events.push('lock'); });
    tx.passwordCredential.update.mockImplementation(async () => { events.push('credential'); });
    sessions.revokeAllForUser.mockImplementation(async () => { events.push('revoke'); });
    sessions.startChain.mockImplementation(async () => { events.push('start'); return issued; });
    expect(await service.change(subject, change, res)).toEqual(issued);
    expect(events).toEqual(['verify', 'hash', 'lock', 'credential', 'revoke', 'start']);
    expect(tx.sessionChain.findUnique).toHaveBeenCalledWith({ where: { id: subject.sessionChainId } });
    expect(tx.passwordCredential.update).toHaveBeenCalledWith({ where: { userId: subject.userId }, data: { hash: 'new-hash', updatedAt: clock.now() } });
    expect(sessions.revokeAllForUser).toHaveBeenCalledExactlyOnceWith(tx, subject.userId, 'password_changed');
    expect(sessions.startChain).toHaveBeenCalledExactlyOnceWith(tx, { userId: subject.userId, client: 'web', deviceLabel: 'Browser' });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 10_000, maxWait: 5_000 });
    expect(committed).toBe(true); expect(mailer.sent).toEqual([]);
    await close(); expect(mailer.sent).toEqual([passwordChangedMail(account.email)]);
  });
  it.each(['wrong', 'stale', 'locked', 'tenth'])('B1E4/B1#34: %s change commits the decision before rejecting and never replaces credentials or sessions', async (reason) => {
    if (reason === 'wrong' || reason === 'tenth') hasher.verify.mockResolvedValue(false);
    const lockedUntil = new Date(clock.now().getTime() + 900_000);
    if (reason === 'stale') tx.user.findUnique.mockResolvedValue({ ...account, passwordCredential: { hash: 'changed' } });
    if (reason === 'locked') failures.seed({ userId: subject.userId, ipKey: keyOf(ip), lockedUntil });
    if (reason === 'tenth') failures.seed({ userId: subject.userId, ipKey: keyOf(ip), failedCount: 9 });
    const locked = reason === 'locked';
    await expect(service.change(subject, change, res, ip)).rejects.toMatchObject({ status: locked ? 429 : 400,
      problemType: locked ? 'rate-limited' : 'invalid-current-password', ...(locked ? { retryAfterSeconds: 900 } : {}) });
    expect(committed).toBe(true);
    if (reason === 'wrong') expect(failures.get(subject.userId, keyOf(ip))).toMatchObject({ failedCount: 1 });
    if (reason === 'locked' || reason === 'stale') expect(failures.writes()).toEqual([]);
    if (reason === 'tenth') expect(failures.get(subject.userId, keyOf(ip))).toMatchObject({ failedCount: 0, lockedUntil });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.passwordCredential.update).not.toHaveBeenCalled(); expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
    expect(sessions.startChain).not.toHaveBeenCalled(); expect(res.listenerCount('close')).toBe(0);
  });
  it('B1E4/B1#34: the tenth wrong change returns 400 after persisting and logging the lock; the next returns 429 without extending it', async () => {
    failures.seed({ userId: subject.userId, ipKey: keyOf(ip), failedCount: 9 });
    hasher.verify.mockResolvedValue(false);
    const lockedUntil = new Date(clock.now().getTime() + 900_000);
    await expect(service.change(subject, change, res, ip)).rejects.toMatchObject({ status: 400,
      problemType: 'invalid-current-password', retryAfterSeconds: undefined });
    expect(committed).toBe(true);
    const stored = failures.get(subject.userId, keyOf(ip));
    expect(stored).toMatchObject({ failedCount: 0, lockedUntil });
    expect(logs.filter((entry) => entry.event === 'login_locked')).toEqual([
      expect.objectContaining({ user_id: subject.userId }),
    ]);
    const writes = failures.writes().length; committed = false;
    clock.advance(60_000);
    await expect(service.change(subject, change, res, ip)).rejects.toMatchObject({ status: 429,
      problemType: 'rate-limited', retryAfterSeconds: 840 });
    expect(committed).toBe(true); expect(failures.get(subject.userId, keyOf(ip))).toEqual(stored);
    expect(failures.writes()).toHaveLength(writes); expect(tx.user.update).not.toHaveBeenCalled();
    expect(logs.filter((entry) => entry.event === 'login_locked')).toHaveLength(1);
    expect(tx.passwordCredential.update).not.toHaveBeenCalled();
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled(); expect(sessions.startChain).not.toHaveBeenCalled();
    expect(res.listenerCount('close')).toBe(0);
  });
  it('F4: change keys the lock on the client ip: a lock from another ip does not stop the right current password here', async () => {
    failures.seed({ userId: subject.userId, ipKey: keyOf('198.51.100.1'), lockedUntil: new Date(clock.now().getTime() + 900_000) });
    failures.seed({ userId: subject.userId, ipKey: keyOf(ip), failedCount: 2 });
    expect(await service.change(subject, change, res, ip)).toEqual(issued);
    expect(failures.get(subject.userId, keyOf(ip))).toBeUndefined();
    expect(failures.get(subject.userId, keyOf('198.51.100.1'))).toMatchObject({ failedCount: 0 });
    await close();
  });
  it('F4: a wrong current password with no ip counts on the hashed "unknown" key', async () => {
    hasher.verify.mockResolvedValue(false);
    await expect(service.change(subject, change, res)).rejects.toMatchObject({ status: 400, problemType: 'invalid-current-password' });
    expect(failures.get(subject.userId, keyOf('unknown'))).toMatchObject({ failedCount: 1 }); expect(failures.size()).toBe(1);
  });
  it('Review Focus 1: locked user cannot mint a session through password change → 403', async () => {
    // A still-valid access token names a chain the lock already revoked; only the locked status read stops it.
    tx.user.findUnique.mockResolvedValue({ ...account, status: 'locked' });
    await expect(service.change(subject, change, res)).rejects.toMatchObject({ status: 403, problemType: 'account-locked' });
    expect(committed).toBe(true); expect(tx.user.update).not.toHaveBeenCalled(); expect(failures.writes()).toEqual([]);
    expect(tx.passwordCredential.update).not.toHaveBeenCalled(); expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
    expect(sessions.startChain).not.toHaveBeenCalled(); expect(res.listenerCount('close')).toBe(0);
  });
  it('N4: locked user submits a reset code → 400 invalid-otp', async () => {
    tx.user.findUnique.mockResolvedValue({ ...account, status: 'locked' });
    await expect(service.reset(reset, res)).rejects.toMatchObject({ status: 400, problemType: 'invalid-otp' });
    expect(otp.checkInTx).not.toHaveBeenCalled(); expect(tx.passwordCredential.upsert).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled(); expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
    expect(res.listenerCount('close')).toBe(0);
  });
  it.each(['missing account', 'missing credential', 'missing chain', 'foreign chain'])('B1#22: %s cannot create a replacement session', async (reason) => {
    if (reason === 'missing account') prisma.user.findUnique.mockResolvedValue(null);
    if (reason === 'missing credential') prisma.user.findUnique.mockResolvedValue({ ...account, passwordCredential: null });
    if (reason === 'missing chain') tx.sessionChain.findUnique.mockResolvedValue(null);
    if (reason === 'foreign chain') tx.sessionChain.findUnique.mockResolvedValue({ ...chain, userId: 'someone-else' });
    await expect(service.change(subject, change, res)).rejects.toMatchObject({ status: reason === 'missing credential' ? 400 : 401 });
    expect(tx.passwordCredential.update).not.toHaveBeenCalled(); expect(sessions.startChain).not.toHaveBeenCalled();
    expect(res.listenerCount('close')).toBe(0);
  });
  it.each(['change', 'reset'] as const)('B1#3: %s checks new password policy before any hashing or persistence', async (route) => {
    const pending = route === 'change' ? service.change(subject, { ...change, new_password: 'abc' }, res)
      : service.reset({ ...reset, new_password: 'abc' }, res);
    await expect(pending).rejects.toMatchObject({ status: 400, problemType: 'validation-failed',
      extensions: { violations: ['min_length', 'uppercase', 'digit', 'special'] } });
    expect(hasher.hash).not.toHaveBeenCalled(); expect(hasher.verify).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled(); expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('B1#23/I26: reset hashes before locking and OTP checking, upserts credentials, revokes sessions and verifies email before sending mail', async () => {
    const events: string[] = [];
    hasher.hash.mockImplementation(async () => { events.push('hash'); return 'new-hash'; });
    tx.$executeRaw.mockImplementation(async () => { events.push('lock'); });
    otp.checkInTx.mockImplementation(async () => { events.push('otp'); return { kind: 'ok' }; });
    failures.seed({ userId: subject.userId, ipKey: keyOf(ip), lockedUntil: new Date(clock.now().getTime() + 900_000) });
    failures.seed({ userId: subject.userId, ipKey: keyOf('198.51.100.1'), failedCount: 4 });
    failures.seed({ userId: 'someone-else', ipKey: keyOf(ip), failedCount: 2 });
    await service.reset(reset, res);
    expect(events).toEqual(['hash', 'lock', 'otp']);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: account.email } });
    expect(otp.checkInTx).toHaveBeenCalledExactlyOnceWith(tx, subject.userId, 'reset_password', reset.code);
    expect(tx.passwordCredential.upsert).toHaveBeenCalledWith({ where: { userId: subject.userId },
      create: { userId: subject.userId, hash: 'new-hash', updatedAt: clock.now() }, update: { hash: 'new-hash', updatedAt: clock.now() } });
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: subject.userId }, data: {
      emailVerifiedAt: clock.now(), mustChangePassword: false } });
    // F4: a reset clears the failure rows of every ip for this account, and no one else's.
    expect(failures.table.deleteMany).toHaveBeenCalledExactlyOnceWith({ where: { userId: subject.userId } });
    expect(failures.size()).toBe(1); expect(failures.get('someone-else', keyOf(ip))).toMatchObject({ failedCount: 2 });
    // F3: a reset wins over a re-registration that is still waiting for its code.
    expect(tx.pendingRegistration.deleteMany).toHaveBeenCalledExactlyOnceWith({ where: { userId: subject.userId } });
    expect(sessions.revokeAllForUser).toHaveBeenCalledExactlyOnceWith(tx, subject.userId, 'password_reset');
    expect(sessions.startChain).not.toHaveBeenCalled(); expect(committed).toBe(true); expect(mailer.sent).toEqual([]);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 10_000, maxWait: 5_000 });
    await close(); expect(mailer.sent).toEqual([passwordResetMail(account.email)]);
  });
  it('B1#23: reset preserves the locked read of an existing verification timestamp', async () => {
    const verifiedAt = new Date('2026-10-06T00:00:00Z');
    tx.user.findUnique.mockResolvedValue({ ...account, emailVerifiedAt: verifiedAt });
    await service.reset(reset, res);
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: subject.userId }, data: {
      emailVerifiedAt: verifiedAt, mustChangePassword: false } });
    await close();
  });
  it.each(['invalid email', 'unknown email', 'deleted', 'wrong', 'no_live_code', 'locked'])('B1#23/B1#34/B1E17: %s reset remains generic and does not replace credentials', async (reason) => {
    if (reason === 'unknown email') prisma.user.findUnique.mockResolvedValue(null);
    if (reason === 'deleted') tx.user.findUnique.mockResolvedValue(null);
    if (['wrong', 'no_live_code', 'locked'].includes(reason)) otp.checkInTx.mockResolvedValue({ kind: reason, notice: null,
      lockedUntil: new Date(clock.now().getTime() + 86_400_000) });
    await expect(service.reset({ ...reset, ...(reason === 'invalid email' ? { email: 'bad' } : {}) }, res))
      .rejects.toMatchObject({ status: 400, problemType: 'invalid-otp', problemTitle: 'Invalid OTP' });
    expect(committed).toBe(!['invalid email', 'unknown email'].includes(reason));
    expect(tx.passwordCredential.upsert).not.toHaveBeenCalled(); expect(tx.user.update).not.toHaveBeenCalled();
    expect(failures.table.deleteMany).not.toHaveBeenCalled(); expect(tx.pendingRegistration.deleteMany).not.toHaveBeenCalled();
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled(); expect(res.listenerCount('close')).toBe(0);
  });
  it('B1-6: an unknown email costs the same hashing as a known one, so the response time does not reveal accounts', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.reset(reset, res)).rejects.toMatchObject({ status: 400, problemType: 'invalid-otp' });
    expect(hasher.hash).toHaveBeenCalledExactlyOnceWith(reset.new_password);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('B1#10/B1#34: reset schedules the 21st failure notice after commit BEFORE throwing generic 400 and sends it once after close', async () => {
    const notice = otpLockedMail(account.email, 'reset_password');
    otp.checkInTx.mockResolvedValue({ kind: 'locked', lockedUntil: new Date(clock.now().getTime() + 86_400_000), notice });
    const afterResponse = dispatcher.afterResponse.bind(dispatcher);
    const schedule = vi.spyOn(dispatcher, 'afterResponse').mockImplementation((response, jobs) => {
      expect(committed).toBe(true);
      afterResponse(response, jobs);
    });
    try {
      await service.reset(reset, res);
      throw new Error('Expected reset denial');
    } catch (error) {
      expect(error).toMatchObject({ status: 400, problemType: 'invalid-otp' });
      expect(committed).toBe(true); expect(schedule).toHaveBeenCalledOnce(); expect(mailer.sent).toEqual([]);
    } finally { schedule.mockRestore(); }
    expect(logs).toContainEqual(expect.objectContaining({ event: 'otp_locked', user_id: subject.userId, purpose: 'reset_password' }));
    await close(); res.emit('close'); await dispatcher.drain(); expect(mailer.sent).toEqual([notice]);
  });
  it.each(['change', 'reset'] as const)('B1#34: unexpected %s write errors roll back and schedule no mail', async (route) => {
    const error = new Error('DB failed');
    (route === 'change' ? tx.passwordCredential.update : tx.passwordCredential.upsert).mockRejectedValue(error);
    await expect(route === 'change' ? service.change(subject, change, res) : service.reset(reset, res)).rejects.toBe(error);
    expect(committed).toBe(false); expect(res.listenerCount('close')).toBe(0); expect(mailer.sent).toEqual([]);
  });
  it('B1#23/I26: notification budget exhaustion does not undo a successful reset', async () => {
    budget.tryConsume.mockResolvedValue(false);
    await expect(service.reset(reset, res)).resolves.toBeUndefined();
    await close(); expect(committed).toBe(true); expect(mailer.sent).toEqual([]);
    expect(logs).toContainEqual(expect.objectContaining({ event: 'mail_send_failed' }));
  });
});
