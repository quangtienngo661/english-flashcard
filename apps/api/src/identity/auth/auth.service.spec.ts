import { createHmac } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { testConfig } from '../../../test/support/test-config.js';
import type { MailBudget } from '../../common/mail/mail-budget.service.js';
import { MailDispatcher } from '../../common/mail/mail-dispatcher.service.js';
import { FakeMailer } from '../../common/mail/fake-mailer.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { otpLockedMail } from '../mailer/templates.js';
import type { SessionService } from '../sessions/session.service.js';
import type { PasswordHasher } from './password-hasher.service.js';
import type { OtpService } from './otp.service.js';
import { AuthService } from './auth.service.js';

describe('registration and login (unit, isolated persistence)', () => {
  const config = testConfig();
  const clock = new FakeClock(new Date('2026-10-07T12:00:00Z'));
  const logs: LogEntry[] = [];
  const logger = new AppLogger({ write: (entry) => { logs.push(entry); } });
  const mailer = new FakeMailer();
  const budget = { assertAvailable: vi.fn(), tryConsume: vi.fn() };
  const dispatcher = new MailDispatcher(mailer, budget as unknown as MailBudget, logger);
  const hasher = { hash: vi.fn(), verify: vi.fn(), verifyDummy: vi.fn() };
  const otp = { issueInTx: vi.fn(), noteIssued: vi.fn(), tryLimitEmail: vi.fn(), sendVerifyCodeQuietly: vi.fn(), checkInTx: vi.fn() };
  const sessions = { startChain: vi.fn(), revokeAllForUser: vi.fn() };
  const tx = { $executeRaw: vi.fn(), user: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    passwordCredential: { create: vi.fn(), upsert: vi.fn() }, otpCode: { updateMany: vi.fn() },
    otpFailureWindow: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn(), deleteMany: vi.fn() } };
  const prisma = { user: { findUnique: vi.fn() }, $transaction: vi.fn() };
  const body = { email: '  Foo@Example.COM ', password: 'Password1!', timezone: 'Asia/Ho_Chi_Minh', client: 'mobile' as const, device_label: 'Phone',
    given_name: 'Lan', family_name: null as string | null, birth_date: '2000-01-01', accept_terms: true as const };
  const user = { id: 'user', email: 'foo@example.com', status: 'active', failedLoginCount: 0, loginLockedUntil: null, emailVerifiedAt: clock.now(),
    passwordCredential: { hash: 'stored-hash' } };
  const issued = { accessToken: 'access', refreshToken: 'refresh', sessionChainId: 'chain', client: 'mobile', refreshExpiresAt: clock.now() };
  let auth: AuthService;
  let res: Response;
  let committed: boolean;
  beforeEach(() => {
    vi.resetAllMocks(); logs.length = 0; mailer.sent.length = 0; committed = false;
    res = Object.assign(new EventEmitter(), { closed: false }) as unknown as Response;
    tx.user.create.mockImplementation(async (args) => ({ ...user, id: args.data.id }));
    tx.user.findUnique.mockImplementation(async ({ where }) => where.email ? null : user);
    tx.user.update.mockResolvedValue({ ...user, failedLoginCount: 1 });
    tx.user.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.$transaction.mockImplementation(async (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
      const outcome = await fn(tx as unknown as Prisma.TransactionClient); committed = true; return outcome;
    });
    budget.assertAvailable.mockResolvedValue(undefined); budget.tryConsume.mockResolvedValue(true);
    hasher.hash.mockResolvedValue('new-hash'); hasher.verify.mockResolvedValue(true); hasher.verifyDummy.mockResolvedValue(false);
    sessions.startChain.mockResolvedValue(issued);
    otp.issueInTx.mockResolvedValue({ to: user.email, subject: 'Verify', text: '012345' });
    otp.noteIssued.mockImplementation((_u: string, _p: string, message: unknown) => message);
    otp.tryLimitEmail.mockResolvedValue(true);
    otp.sendVerifyCodeQuietly.mockResolvedValue(undefined);
    auth = new AuthService(prisma as unknown as PrismaClient, config, clock, hasher as unknown as PasswordHasher,
      sessions as unknown as SessionService, budget as unknown as MailBudget, dispatcher, otp as unknown as OtpService, logger);
  });
  afterEach(async () => { res.emit('close'); await dispatcher.drain(); });

  it('A13-1/B1#38: register creates an unverified user and no chain; code mailed after commit and close', async () => {
    const events: string[] = [];
    hasher.hash.mockImplementation(async () => { events.push('hash'); return 'new-hash'; });
    tx.$executeRaw.mockImplementation(async () => { events.push('lock'); });
    tx.user.create.mockImplementation(async (args) => { events.push('create'); return { id: args.data.id }; });
    expect(await auth.register(body, res)).toEqual({ email: user.email });
    expect(events).toEqual(['hash', 'lock', 'create']);
    expect(tx.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ email: user.email, timezone: 'Asia/Saigon' }) });
    const userId = tx.user.create.mock.calls[0][0].data.id;
    expect(userId).toMatch(/^[0-9a-f-]{36}$/);
    expect(tx.passwordCredential.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId, hash: 'new-hash' }) });
    expect(tx.user.create.mock.calls[0][0].data).not.toHaveProperty('emailVerifiedAt');
    expect(sessions.startChain).not.toHaveBeenCalled();
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
    expect(tx.user.findUnique).toHaveBeenCalledExactlyOnceWith({ where: { email: user.email } });
    expect(otp.tryLimitEmail).toHaveBeenCalledExactlyOnceWith(user.email);
    expect(otp.tryLimitEmail.mock.invocationCallOrder[0]).toBeLessThan(prisma.$transaction.mock.invocationCallOrder[0]);
    expect(committed).toBe(true); expect(otp.issueInTx).not.toHaveBeenCalled(); expect(mailer.sent).toEqual([]);
    res.emit('close'); await dispatcher.drain();
    expect(otp.issueInTx).toHaveBeenCalledExactlyOnceWith(tx, userId, 'verify_email');
    expect(otp.noteIssued).toHaveBeenCalledExactlyOnceWith(userId, 'verify_email', expect.objectContaining({ to: user.email }));
    expect(events).toEqual(['hash', 'lock', 'create', 'lock']);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    for (const call of prisma.$transaction.mock.calls) expect(call[1]).toEqual({ timeout: 10_000, maxWait: 5_000 });
    expect(mailer.sent).toHaveLength(1);
  });
  it.each([true, false])('first registration counts the email cooldown and still mails (allowed: %s)', async (allowed) => {
    otp.tryLimitEmail.mockResolvedValue(allowed);
    await expect(auth.register(body, res)).resolves.toEqual({ email: user.email });
    expect(otp.tryLimitEmail).toHaveBeenCalledExactlyOnceWith(user.email);
    expect(otp.tryLimitEmail.mock.invocationCallOrder[0]).toBeLessThan(prisma.$transaction.mock.invocationCallOrder[0]);
    expect(otp.issueInTx).not.toHaveBeenCalled();
    res.emit('close'); await dispatcher.drain();
    expect(otp.issueInTx).toHaveBeenCalledExactlyOnceWith(tx, tx.user.create.mock.calls[0][0].data.id, 'verify_email');
    expect(mailer.sent).toHaveLength(1);
  });
  it.each([true, false])('A13-2b/A13-2c: re-register replaces data and revokes earlier chains; mails only outside cooldown (%s)', async (allowed) => {
    const events: string[] = [];
    const existing = { ...user, emailVerifiedAt: null, failedLoginCount: 7, loginLockedUntil: clock.now() };
    otp.tryLimitEmail.mockResolvedValue(allowed);
    tx.user.findUnique.mockImplementation(async ({ where }) => {
      events.push(where.email ? 'locate' : 'reread'); return where.email ? { id: user.id } : existing;
    });
    tx.$executeRaw.mockImplementation(async () => { events.push('lock'); });
    tx.user.updateMany.mockImplementation(async () => { events.push('write'); return { count: 1 }; });
    tx.passwordCredential.upsert.mockImplementation(async () => { events.push('password'); });
    sessions.revokeAllForUser.mockImplementation(async () => { events.push('revoke'); });
    await expect(auth.register({ ...body, family_name: 'Nguyen' }, res)).resolves.toEqual({ email: user.email });
    expect(events).toEqual(['locate', 'lock', 'reread', 'write', 'password', 'revoke']);
    expect(tx.$executeRaw.mock.calls[0][1]).toBe(`identity.user:${user.id}`);
    expect(tx.user.findUnique).toHaveBeenNthCalledWith(1, { where: { email: user.email } });
    expect(tx.user.findUnique).toHaveBeenNthCalledWith(2, { where: { id: user.id } });
    expect(tx.user.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { id: user.id, emailVerifiedAt: null, status: 'active' },
      data: { timezone: 'Asia/Saigon', givenName: 'Lan', familyName: 'Nguyen', birthDate: new Date('2000-01-01T00:00:00Z'),
        termsAcceptedAt: clock.now(), termsVersion: config.termsVersion, failedLoginCount: 0, loginLockedUntil: null, updatedAt: clock.now() },
    });
    expect(tx.passwordCredential.upsert).toHaveBeenCalledExactlyOnceWith({ where: { userId: user.id },
      create: { userId: user.id, hash: 'new-hash', updatedAt: clock.now() }, update: { hash: 'new-hash', updatedAt: clock.now() } });
    expect(sessions.revokeAllForUser).toHaveBeenCalledExactlyOnceWith(tx, user.id, 'reregistered');
    expect(tx.user.create).not.toHaveBeenCalled(); expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.passwordCredential.create).not.toHaveBeenCalled(); expect(sessions.startChain).not.toHaveBeenCalled();
    expect(otp.tryLimitEmail).toHaveBeenCalledExactlyOnceWith(user.email);
    expect(otp.tryLimitEmail.mock.invocationCallOrder[0]).toBeLessThan(prisma.$transaction.mock.invocationCallOrder[0]);
    expect(committed).toBe(true); expect(otp.issueInTx).not.toHaveBeenCalled(); expect(mailer.sent).toEqual([]);
    expect(res.listenerCount('close')).toBe(allowed ? 1 : 0);
    res.emit('close'); await dispatcher.drain();
    if (allowed) {
      expect(otp.issueInTx).toHaveBeenCalledExactlyOnceWith(tx, user.id, 'verify_email');
      expect(otp.noteIssued).toHaveBeenCalledExactlyOnceWith(user.id, 'verify_email', expect.objectContaining({ to: user.email }));
      expect(events).toEqual(['locate', 'lock', 'reread', 'write', 'password', 'revoke', 'lock']);
      expect(mailer.sent).toHaveLength(1); expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    } else {
      expect(otp.issueInTx).not.toHaveBeenCalled(); expect(otp.noteIssued).not.toHaveBeenCalled();
      expect(mailer.sent).toEqual([]); expect(prisma.$transaction).toHaveBeenCalledOnce();
    }
    expect(tx.otpCode.updateMany).not.toHaveBeenCalled();
    for (const method of Object.values(tx.otpFailureWindow)) expect(method).not.toHaveBeenCalled();
  });
  it.each(['verified', 'locked', 'deleted'])('A13-2: email of a %s account -> 409 email-taken', async (state) => {
    tx.user.findUnique.mockResolvedValue({ ...user, emailVerifiedAt: state === 'verified' ? clock.now() : null,
      status: state === 'verified' ? 'active' : state });
    await expect(auth.register(body, res)).rejects.toMatchObject({ status: 409, problemType: 'email-taken' });
    expect(tx.user.create).not.toHaveBeenCalled(); expect(tx.user.updateMany).not.toHaveBeenCalled();
    expect(tx.passwordCredential.upsert).not.toHaveBeenCalled(); expect(sessions.startChain).not.toHaveBeenCalled();
    expect(res.listenerCount('close')).toBe(0); expect(otp.issueInTx).not.toHaveBeenCalled();
  });
  it('B8 (design §6.2): the email of a deleting account → 409 email-taken with reason account-deleting', async () => {
    tx.user.findUnique.mockResolvedValue({ ...user, emailVerifiedAt: clock.now(), status: 'deleting' });
    await expect(auth.register(body, res)).rejects.toMatchObject({
      status: 409, problemType: 'email-taken', extensions: { reason: 'account-deleting' },
    });
    expect(tx.user.create).not.toHaveBeenCalled(); expect(tx.user.updateMany).not.toHaveBeenCalled();
  });
  it.each(['reread', 'conditional write'])('A13-2d: verification commits between the read and the lock -> 409, password unchanged (%s)', async (guard) => {
    const events: string[] = [];
    tx.user.findUnique.mockImplementation(async ({ where }) => {
      events.push(where.email ? 'locate' : 'reread');
      return { ...user, emailVerifiedAt: where.email || guard === 'conditional write' ? null : clock.now() };
    });
    tx.$executeRaw.mockImplementation(async () => { events.push('lock'); });
    tx.user.updateMany.mockImplementation(async () => { events.push('write'); return { count: 0 }; });
    await expect(auth.register(body, res)).rejects.toMatchObject({ status: 409, problemType: 'email-taken' });
    expect(events).toEqual(guard === 'reread' ? ['locate', 'lock', 'reread'] : ['locate', 'lock', 'reread', 'write']);
    expect(tx.passwordCredential.upsert).not.toHaveBeenCalled(); expect(tx.passwordCredential.create).not.toHaveBeenCalled();
    expect(tx.user.create).not.toHaveBeenCalled(); expect(tx.user.update).not.toHaveBeenCalled();
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled(); expect(sessions.startChain).not.toHaveBeenCalled();
    expect(committed).toBe(false); expect(res.listenerCount('close')).toBe(0); expect(otp.issueInTx).not.toHaveBeenCalled();
  });
  it.each([
    [{ email: 'invalid' }, undefined],
    [{ email: 'lan@localhost' }, undefined],
    [{ email: 'lan@example..com' }, undefined],
    [{ password: 'abc' }, ['min_length', 'uppercase', 'digit', 'special']],
    [{ timezone: 'Mars/Base' }, undefined],
    [{ timezone: '+07:00' }, undefined],
  ])('B1#3/B1E23: invalid registration is rejected before budget, hash or DB work (%j)', async (changes, violations) => {
    await expect(auth.register({ ...body, ...changes }, res)).rejects.toMatchObject({
      status: 400, problemType: 'validation-failed', ...(violations ? { extensions: { violations } } : {}),
    });
    expect(budget.assertAvailable).not.toHaveBeenCalled(); expect(hasher.hash).not.toHaveBeenCalled(); expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('N1/N2: register stores names, birth date, terms version and acceptance time', async () => {
    await auth.register({ ...body, family_name: 'Nguyen' }, res);
    expect(tx.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      givenName: 'Lan', familyName: 'Nguyen', birthDate: new Date('2000-01-01T00:00:00Z'),
      termsAcceptedAt: clock.now(), termsVersion: config.termsVersion }) });
  });
  it('FE1: a 12-year-old gets 400 age-below-minimum before any hash or mail budget call', async () => {
    // Ho Chi Minh local date is 2026-10-07: the 13th birthday would be tomorrow.
    await expect(auth.register({ ...body, birth_date: '2013-10-08' }, res)).rejects.toMatchObject({
      status: 400, problemType: 'age-below-minimum' });
    expect(budget.assertAvailable).not.toHaveBeenCalled(); expect(hasher.hash).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(logs.filter((l) => l.event === 'register_rejected_age')).toHaveLength(1);
    expect(JSON.stringify(logs)).not.toContain('2013-10-08');
  });
  it('FE2: Pacific/Kiritimati already on the 13th birthday -> accepted', async () => {
    await auth.register({ ...body, timezone: 'Pacific/Kiritimati', birth_date: '2013-10-08' }, res);
    expect(tx.user.create).toHaveBeenCalled();
  });
  it('birth date tomorrow (in the user zone) -> 400 validation-failed', async () => {
    await expect(auth.register({ ...body, birth_date: '2026-10-08' }, res)).rejects.toMatchObject({
      status: 400, problemType: 'validation-failed' });
    expect(hasher.hash).not.toHaveBeenCalled();
  });
  it('C2: register stores the canonical spelling of the zone, whatever case the client sent', async () => {
    for (const timezone of ['asia/ho_chi_minh', 'ASIA/HO_CHI_MINH', 'Asia/Saigon']) {
      tx.user.create.mockClear();
      await auth.register({ ...body, timezone }, res);
      expect(tx.user.create.mock.calls[0][0].data.timezone).toBe('Asia/Saigon');
    }
  });
  it('B1#30: exhausted mail budget prevents hashing and creating the account', async () => {
    budget.assertAvailable.mockRejectedValue({ status: 503 });
    await expect(auth.register(body, res)).rejects.toMatchObject({ status: 503 });
    expect(hasher.hash).not.toHaveBeenCalled(); expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('B1#2: two concurrent first registrations hit the email unique constraint -> 409 and no mail', async () => {
    tx.user.create.mockRejectedValue({ code: 'P2002' });
    await expect(auth.register(body, res)).rejects.toMatchObject({ status: 409, problemType: 'email-taken' });
    expect(committed).toBe(false); expect(res.listenerCount('close')).toBe(0); expect(otp.issueInTx).not.toHaveBeenCalled();
  });
  it('B1#34: an unexpected database error rolls back and schedules no mail', async () => {
    const error = new Error('DB unavailable'); tx.user.create.mockRejectedValue(error);
    await expect(auth.register(body, res)).rejects.toBe(error);
    expect(committed).toBe(false); expect(res.listenerCount('close')).toBe(0);
  });
  it('B1#11/IE8/D16: login normalizes email, verifies outside the lock, then creates a session without rehashing', async () => {
    const events: string[] = [];
    hasher.verify.mockImplementation(async () => { events.push('verify'); return true; });
    tx.$executeRaw.mockImplementation(async () => { events.push('lock'); });
    expect(await auth.login(body, res)).toEqual(issued);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: user.email }, include: { passwordCredential: true } });
    expect(events).toEqual(['verify', 'lock']); expect(committed).toBe(true);
    expect(hasher.hash).not.toHaveBeenCalled(); expect(tx.passwordCredential.create).not.toHaveBeenCalled();
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: user.id }, data: { failedLoginCount: 0 } });
    expect(sessions.startChain).toHaveBeenCalledWith(tx, { userId: user.id, client: body.client, deviceLabel: body.device_label });
  });
  it.each(['unknown', 'wrong', 'locked', 'stale'])('B1#12/B1#34/B1E33: %s login is generic and only rejects after committing writes', async (reason) => {
    if (reason === 'unknown') prisma.user.findUnique.mockResolvedValue(null);
    if (reason === 'wrong') hasher.verify.mockResolvedValue(false);
    if (reason === 'locked') tx.user.findUnique.mockResolvedValue({ ...user, loginLockedUntil: new Date(clock.now().getTime() + 900_000) });
    if (reason === 'stale') tx.user.findUnique.mockResolvedValue({ ...user, passwordCredential: { hash: 'changed-hash' } });
    await expect(auth.login(body, res)).rejects.toMatchObject({ status: 401, problemType: 'invalid-credentials', problemTitle: 'Invalid credentials' });
    expect(hasher.verify.mock.calls.length + hasher.verifyDummy.mock.calls.length).toBe(1);
    expect(committed).toBe(reason !== 'unknown'); expect(sessions.startChain).not.toHaveBeenCalled();
    if (reason !== 'wrong') expect(tx.user.update).not.toHaveBeenCalled();
    expect(logs).toContainEqual(expect.objectContaining({ event: 'login_failed' }));
    expect(JSON.stringify(logs)).not.toContain(user.email); expect(JSON.stringify(logs)).not.toContain(body.password);
    if (reason === 'unknown') expect(logs[0].email_hmac).toBe(createHmac('sha256', config.rateLimitHmacKey).update(user.email).digest('hex'));
  });
  it('A13-3: login with the right password on an unverified account -> 403 email-not-verified, no chain, failed count reset, quiet code sent', async () => {
    tx.$executeRaw.mockImplementation(async () => {
      tx.user.findUnique.mockResolvedValue({ ...user, emailVerifiedAt: null, failedLoginCount: 3 });
    });
    otp.sendVerifyCodeQuietly.mockImplementation(async () => { expect(committed).toBe(true); });
    await expect(auth.login(body, res)).rejects.toMatchObject({
      status: 403, problemType: 'email-not-verified', problemTitle: 'Email not verified',
    });
    expect(sessions.startChain).not.toHaveBeenCalled();
    expect(tx.user.update).toHaveBeenCalledExactlyOnceWith({ where: { id: user.id }, data: { failedLoginCount: 0 } });
    expect(otp.sendVerifyCodeQuietly).toHaveBeenCalledExactlyOnceWith(user.id, user.email, res);
    expect(logs).toEqual([expect.objectContaining({ event: 'login_failed', user_id: user.id })]);
    expect(JSON.stringify(logs)).not.toContain(user.email); expect(JSON.stringify(logs)).not.toContain(body.password);
  });
  it('A13-3: verification committed while login waited on the lock permits a session', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, emailVerifiedAt: null });
    expect(await auth.login(body, res)).toEqual(issued);
    expect(sessions.startChain).toHaveBeenCalledOnce();
    expect(otp.sendVerifyCodeQuietly).not.toHaveBeenCalled();
  });
  it('A13-5: wrong password on an unverified account -> 401 invalid-credentials, count incremented, no code', async () => {
    hasher.verify.mockResolvedValue(false);
    tx.user.findUnique.mockResolvedValue({ ...user, emailVerifiedAt: null });
    await expect(auth.login(body, res)).rejects.toMatchObject({ status: 401, problemType: 'invalid-credentials' });
    expect(committed).toBe(true);
    expect(tx.user.update).toHaveBeenCalledExactlyOnceWith({ where: { id: user.id }, data: { failedLoginCount: { increment: 1 } } });
    expect(sessions.startChain).not.toHaveBeenCalled(); expect(otp.sendVerifyCodeQuietly).not.toHaveBeenCalled();
  });
  it('A13-6: locked account with the right password, unverified -> 403 account-locked', async () => {
    tx.user.findUnique.mockResolvedValue({ ...user, status: 'locked', emailVerifiedAt: null });
    await expect(auth.login(body, res)).rejects.toMatchObject({ status: 403, problemType: 'account-locked' });
    expect(committed).toBe(true); expect(tx.user.update).not.toHaveBeenCalled();
    expect(sessions.startChain).not.toHaveBeenCalled(); expect(otp.sendVerifyCodeQuietly).not.toHaveBeenCalled();
  });
  it('N4: locked + right password → 403 account-locked, no chain', async () => {
    tx.user.findUnique.mockResolvedValue({ ...user, status: 'locked' });
    await expect(auth.login(body, res)).rejects.toMatchObject({ status: 403, problemType: 'account-locked', problemTitle: 'Account locked' });
    expect(committed).toBe(true); expect(sessions.startChain).not.toHaveBeenCalled(); expect(tx.user.update).not.toHaveBeenCalled();
    expect(logs).toEqual([expect.objectContaining({ event: 'login_failed', user_id: user.id })]);
    expect(Object.keys(logs[0]).sort()).toEqual(['event', 'level', 'reason', 'user_id']);
    expect(logs[0].reason).toBe('account_locked');
  });
  it('N4: locked + wrong password → 401 and the failed count increments', async () => {
    hasher.verify.mockResolvedValue(false);
    tx.user.findUnique.mockResolvedValue({ ...user, status: 'locked' });
    await expect(auth.login(body, res)).rejects.toMatchObject({ status: 401, problemType: 'invalid-credentials' });
    expect(tx.user.update).toHaveBeenCalledExactlyOnceWith({ where: { id: user.id }, data: { failedLoginCount: { increment: 1 } } });
    expect(sessions.startChain).not.toHaveBeenCalled();
  });
  it('FE10: the lock committed while login waited on the user lock → 403, no session', async () => {
    // The unlocked lookup saw an active account; the admin's lock committed before this login got the user lock.
    prisma.user.findUnique.mockResolvedValue({ ...user, status: 'active' });
    tx.$executeRaw.mockImplementation(async () => { tx.user.findUnique.mockResolvedValue({ ...user, status: 'locked' }); });
    await expect(auth.login(body, res)).rejects.toMatchObject({ status: 403, problemType: 'account-locked' });
    expect(sessions.startChain).not.toHaveBeenCalled();
  });
  it('B1#13: the lock event is logged after the tenth failure commits', async () => {
    hasher.verify.mockResolvedValue(false);
    tx.user.update.mockImplementation(async ({ data }) => {
      if (data.loginLockedUntil) tx.user.findUnique.mockResolvedValue({ ...user, loginLockedUntil: data.loginLockedUntil });
      return { failedLoginCount: 10 };
    });
    await expect(auth.login(body, res)).rejects.toMatchObject({ status: 401 });
    expect(committed).toBe(true); expect(logs).toContainEqual(expect.objectContaining({ event: 'login_locked', user_id: user.id }));
  });
  it('B1E3: another wrong login at the same instant does not report an existing lock as newly established', async () => {
    hasher.verify.mockResolvedValue(false);
    tx.user.findUnique.mockResolvedValue({ ...user, loginLockedUntil: new Date(clock.now().getTime() + 900_000) });
    await expect(auth.login(body, res)).rejects.toMatchObject({ status: 401 });
    expect(logs.filter((entry) => entry.event === 'login_locked')).toHaveLength(0);
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it('B1E2: overlong NFC passwords return generic 401 without account lookup or Argon2', async () => {
    await expect(auth.login({ ...body, password: '😀'.repeat(200) }, res)).rejects.toMatchObject({ status: 401, problemType: 'invalid-credentials' });
    expect(prisma.user.findUnique).not.toHaveBeenCalled(); expect(hasher.verify).not.toHaveBeenCalled(); expect(hasher.verifyDummy).not.toHaveBeenCalled();
  });
  it('B1E2: the 128-code-point NFC boundary still verifies', async () => {
    await auth.login({ ...body, password: 'e\u0301'.repeat(128) }, res);
    expect(hasher.verify).toHaveBeenCalledOnce();
  });

  describe('public email verification', () => {
    const input = { email: body.email, password: body.password, client: body.client, device_label: body.device_label, code: '012345' };
    const invalid = { status: 400, problemTitle: 'Invalid OTP', problemType: 'invalid-otp' };
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue({ ...user, emailVerifiedAt: null });
      tx.user.findUnique.mockResolvedValue({ ...user, emailVerifiedAt: null });
      otp.checkInTx.mockResolvedValue({ kind: 'ok' });
    });

    it('A13-7: right password and code -> emailVerifiedAt set and a chain started in the same transaction; returns the session', async () => {
      const events: string[] = [];
      hasher.verify.mockImplementation(async () => { events.push('password'); expect(prisma.$transaction).not.toHaveBeenCalled(); return true; });
      tx.$executeRaw.mockImplementation(async () => { events.push('lock'); });
      tx.user.findUnique.mockImplementation(async () => { events.push('reread'); return { ...user, emailVerifiedAt: null }; });
      otp.checkInTx.mockImplementation(async () => { events.push('code'); return { kind: 'ok' }; });
      tx.user.update.mockImplementation(async () => { events.push('verified'); });
      sessions.startChain.mockImplementation(async () => { events.push('session'); expect(committed).toBe(false); return issued; });
      expect(await auth.verifyEmail(input, res)).toEqual(issued);
      expect(events).toEqual(['password', 'lock', 'reread', 'code', 'verified', 'session']);
      expect(hasher.verify).toHaveBeenCalledExactlyOnceWith('stored-hash', input.password);
      expect(tx.user.findUnique).toHaveBeenCalledExactlyOnceWith({ where: { id: user.id }, include: { passwordCredential: true } });
      expect(otp.checkInTx).toHaveBeenCalledExactlyOnceWith(tx, user.id, 'verify_email', input.code);
      expect(tx.user.update).toHaveBeenCalledExactlyOnceWith({ where: { id: user.id }, data: { emailVerifiedAt: clock.now() } });
      expect(sessions.startChain).toHaveBeenCalledExactlyOnceWith(tx, { userId: user.id, client: input.client, deviceLabel: input.device_label });
      expect(prisma.$transaction).toHaveBeenCalledExactlyOnceWith(expect.any(Function), { timeout: 10_000, maxWait: 5_000 });
      expect(committed).toBe(true);
    });
    it('A13-7b: right code, wrong password -> 400 invalid-otp; code attempts, OTP failure window and failedLoginCount unchanged', async () => {
      hasher.verify.mockResolvedValue(false);
      await expect(auth.verifyEmail(input, res)).rejects.toMatchObject(invalid);
      expect(prisma.$transaction).not.toHaveBeenCalled(); expect(otp.checkInTx).not.toHaveBeenCalled();
      expect(tx.otpCode.updateMany).not.toHaveBeenCalled(); expect(tx.user.update).not.toHaveBeenCalled();
      for (const method of Object.values(tx.otpFailureWindow)) expect(method).not.toHaveBeenCalled();
    });
    it("A13-7c: after a re-register with another password, the owner's code with the owner's old password -> 400 invalid-otp; account stays unverified", async () => {
      const account = { ...user, emailVerifiedAt: null, passwordCredential: { hash: 'reregistered-hash' } };
      prisma.user.findUnique.mockResolvedValue(account);
      hasher.verify.mockImplementation(async (hash, password) => hash === 'stored-hash' && password === input.password);
      await expect(auth.verifyEmail(input, res)).rejects.toMatchObject(invalid);
      expect(hasher.verify).toHaveBeenCalledExactlyOnceWith('reregistered-hash', input.password);
      expect(account.emailVerifiedAt).toBeNull(); expect(tx.user.update).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled(); expect(otp.checkInTx).not.toHaveBeenCalled();
    });
    it('A13-7d: hash changed between the password check and the lock -> 400 invalid-otp', async () => {
      tx.$executeRaw.mockImplementation(async () => {
        tx.user.findUnique.mockResolvedValue({ ...user, emailVerifiedAt: null, passwordCredential: { hash: 'changed-hash' } });
      });
      await expect(auth.verifyEmail(input, res)).rejects.toMatchObject(invalid);
      expect(hasher.verify).toHaveBeenCalledExactlyOnceWith('stored-hash', input.password);
      expect(tx.$executeRaw).toHaveBeenCalledOnce(); expect(otp.checkInTx).not.toHaveBeenCalled();
      expect(tx.user.update).not.toHaveBeenCalled(); expect(sessions.startChain).not.toHaveBeenCalled();
    });
    it.each(['unknown', 'missing credential', 'invalid email'])('%s email -> verifyDummy is called, then 400 invalid-otp', async (reason) => {
      if (reason === 'unknown') prisma.user.findUnique.mockResolvedValue(null);
      if (reason === 'missing credential') prisma.user.findUnique.mockResolvedValue({ ...user, passwordCredential: null });
      await expect(auth.verifyEmail({ ...input, email: reason === 'invalid email' ? 'invalid' : input.email }, res)).rejects.toMatchObject(invalid);
      expect(hasher.verifyDummy).toHaveBeenCalledExactlyOnceWith(input.password);
      expect(hasher.verify).not.toHaveBeenCalled(); expect(prisma.$transaction).not.toHaveBeenCalled();
      if (reason === 'invalid email') expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
    it('A13-8: right password, wrong code -> 400 invalid-otp, attempt counted', async () => {
      otp.checkInTx.mockResolvedValue({ kind: 'wrong' });
      await expect(auth.verifyEmail({ ...input, code: '999999' }, res)).rejects.toMatchObject(invalid);
      expect(otp.checkInTx).toHaveBeenCalledExactlyOnceWith(tx, user.id, 'verify_email', '999999');
      expect(committed).toBe(true); expect(tx.user.update).not.toHaveBeenCalled(); expect(sessions.startChain).not.toHaveBeenCalled();
    });
    it('A13-9: right password, 21st wrong code -> 429 rate-limited with Retry-After; lock mail scheduled; with a wrong password the same request gets 400', async () => {
      const notice = otpLockedMail(user.email, 'verify_email');
      otp.checkInTx.mockResolvedValue({ kind: 'locked', lockedUntil: new Date(clock.now().getTime() + 86_400_000), notice });
      const afterResponse = dispatcher.afterResponse.bind(dispatcher);
      const schedule = vi.spyOn(dispatcher, 'afterResponse').mockImplementationOnce((...args) => {
        expect(committed).toBe(true); expect(logs).toContainEqual({ level: 'warn', event: 'otp_locked', user_id: user.id, purpose: 'verify_email' });
        afterResponse(...args);
      });
      await expect(auth.verifyEmail(input, res)).rejects.toMatchObject({ status: 429, problemType: 'rate-limited', retryAfterSeconds: 86400 });
      expect(schedule).toHaveBeenCalledOnce(); schedule.mockRestore();
      expect(committed).toBe(true); expect(sessions.startChain).not.toHaveBeenCalled(); expect(tx.user.update).not.toHaveBeenCalled();
      expect(mailer.sent).toEqual([]);
      res.emit('close'); await dispatcher.drain();
      expect(mailer.sent).toEqual([notice]);
      prisma.$transaction.mockClear(); otp.checkInTx.mockClear(); hasher.verify.mockResolvedValue(false);
      await expect(auth.verifyEmail(input, res)).rejects.toMatchObject(invalid);
      expect(prisma.$transaction).not.toHaveBeenCalled(); expect(otp.checkInTx).not.toHaveBeenCalled();
    });
    it('an existing OTP lock rounds Retry-After up and schedules no repeat notice', async () => {
      otp.checkInTx.mockResolvedValue({ kind: 'locked', lockedUntil: new Date(clock.now().getTime() + 3500), notice: null });
      await expect(auth.verifyEmail(input, res)).rejects.toMatchObject({ status: 429, retryAfterSeconds: 4 });
      expect(committed).toBe(true); expect(res.listenerCount('close')).toBe(0); expect(logs).toEqual([]);
    });
    it.each(['unknown email', 'not active', 'already verified'])('A13-10: %s -> the same 400 invalid-otp body', async (reason) => {
      if (reason === 'unknown email') prisma.user.findUnique.mockResolvedValue(null);
      if (reason === 'not active') tx.user.findUnique.mockResolvedValue({ ...user, emailVerifiedAt: null, status: 'locked' });
      if (reason === 'already verified') tx.user.findUnique.mockResolvedValue(user);
      const problem = (error: unknown) => {
        expect(error).toBeInstanceOf(ProblemDetailsException);
        const e = error as ProblemDetailsException;
        return { status: e.getStatus(), title: e.problemTitle, type: e.problemType, detail: e.problemDetail, extensions: e.extensions };
      };
      const denied = await auth.verifyEmail(input, res).catch(problem);
      expect(otp.checkInTx).not.toHaveBeenCalled(); expect(sessions.startChain).not.toHaveBeenCalled();
      prisma.user.findUnique.mockResolvedValue({ ...user, emailVerifiedAt: null });
      tx.user.findUnique.mockResolvedValue({ ...user, emailVerifiedAt: null });
      otp.checkInTx.mockResolvedValue({ kind: 'wrong' });
      expect(denied).toEqual(await auth.verifyEmail(input, res).catch(problem));
      expect(denied).toEqual({ status: 400, title: 'Invalid OTP', type: 'invalid-otp', detail: undefined, extensions: undefined });
    });
    it('A13-11: expired code -> 400 invalid-otp', async () => {
      otp.checkInTx.mockResolvedValue({ kind: 'no_live_code' });
      await expect(auth.verifyEmail(input, res)).rejects.toMatchObject(invalid);
      expect(committed).toBe(true); expect(tx.user.update).not.toHaveBeenCalled(); expect(sessions.startChain).not.toHaveBeenCalled();
    });
    it('email with capitals and spaces -> same account', async () => {
      await auth.verifyEmail(input, res);
      expect(prisma.user.findUnique).toHaveBeenCalledExactlyOnceWith({ where: { email: user.email }, include: { passwordCredential: true } });
    });
    it('overlong NFC password -> 400 invalid-otp without lookup or Argon2', async () => {
      await expect(auth.verifyEmail({ ...input, password: '😀'.repeat(129) }, res)).rejects.toMatchObject(invalid);
      expect(prisma.user.findUnique).not.toHaveBeenCalled(); expect(hasher.verify).not.toHaveBeenCalled();
      expect(hasher.verifyDummy).not.toHaveBeenCalled(); expect(prisma.$transaction).not.toHaveBeenCalled();
    });
    it('the 128-code-point NFC password boundary still verifies', async () => {
      await auth.verifyEmail({ ...input, password: 'e\u0301'.repeat(128) }, res);
      expect(hasher.verify).toHaveBeenCalledOnce();
    });
    it('a session failure rolls back verification and schedules no mail', async () => {
      sessions.startChain.mockRejectedValue(new Error('database unavailable'));
      await expect(auth.verifyEmail(input, res)).rejects.toThrow('database unavailable');
      expect(committed).toBe(false); expect(res.listenerCount('close')).toBe(0);
    });
  });
});
