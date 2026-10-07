import { createHmac } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { testConfig } from '../../../test/support/test-config.js';
import type { MailBudget } from '../mailer/mail-budget.service.js';
import { MailDispatcher } from '../mailer/mail-dispatcher.service.js';
import { FakeMailer } from '../mailer/fake-mailer.js';
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
  const otp = { issueInTx: vi.fn() };
  const sessions = { startChain: vi.fn() };
  const tx = { $executeRaw: vi.fn(), user: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    passwordCredential: { create: vi.fn() } };
  const prisma = { user: { findUnique: vi.fn() }, $transaction: vi.fn() };
  const body = { email: '  Foo@Example.COM ', password: 'Password1!', timezone: 'Asia/Ho_Chi_Minh', client: 'mobile' as const, device_label: 'Phone' };
  const user = { id: 'user', email: 'foo@example.com', failedLoginCount: 0, loginLockedUntil: null,
    passwordCredential: { hash: 'stored-hash' } };
  const issued = { accessToken: 'access', refreshToken: 'refresh', sessionChainId: 'chain', client: 'mobile', refreshExpiresAt: clock.now() };
  let auth: AuthService;
  let res: Response;
  let committed: boolean;
  beforeEach(() => {
    vi.resetAllMocks(); logs.length = 0; mailer.sent.length = 0; committed = false;
    res = Object.assign(new EventEmitter(), { closed: false }) as unknown as Response;
    tx.user.create.mockImplementation(async (args) => ({ ...user, id: args.data.id }));
    tx.user.findUnique.mockResolvedValue(user);
    tx.user.update.mockResolvedValue({ ...user, failedLoginCount: 1 });
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.$transaction.mockImplementation(async (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
      const outcome = await fn(tx as unknown as Prisma.TransactionClient); committed = true; return outcome;
    });
    budget.assertAvailable.mockResolvedValue(undefined); budget.tryConsume.mockResolvedValue(true);
    hasher.hash.mockResolvedValue('new-hash'); hasher.verify.mockResolvedValue(true); hasher.verifyDummy.mockResolvedValue(false);
    sessions.startChain.mockResolvedValue(issued);
    otp.issueInTx.mockResolvedValue({ to: user.email, subject: 'Verify', text: '012345' });
    auth = new AuthService(prisma as unknown as PrismaClient, config, clock, hasher as unknown as PasswordHasher,
      sessions as unknown as SessionService, budget as unknown as MailBudget, dispatcher, otp as unknown as OtpService, logger);
  });

  it('B1#1/B1#38: register normalizes email, hashes before locking and creates OTP only after commit and close', async () => {
    const events: string[] = [];
    hasher.hash.mockImplementation(async () => { events.push('hash'); return 'new-hash'; });
    tx.$executeRaw.mockImplementation(async () => { events.push('lock'); });
    tx.user.create.mockImplementation(async (args) => { events.push('create'); return { id: args.data.id }; });
    expect(await auth.register(body, res)).toEqual(issued);
    expect(events).toEqual(['hash', 'lock', 'create']);
    expect(tx.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ email: user.email, timezone: body.timezone }) });
    const userId = tx.user.create.mock.calls[0][0].data.id;
    expect(userId).toMatch(/^[0-9a-f-]{36}$/);
    expect(tx.passwordCredential.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId, hash: 'new-hash' }) });
    expect(sessions.startChain).toHaveBeenCalledWith(tx, { userId, client: body.client, deviceLabel: body.device_label });
    expect(committed).toBe(true); expect(otp.issueInTx).not.toHaveBeenCalled(); expect(mailer.sent).toEqual([]);
    res.emit('close'); await dispatcher.drain();
    expect(otp.issueInTx).toHaveBeenCalledExactlyOnceWith(tx, userId, 'verify_email');
    expect(events).toEqual(['hash', 'lock', 'create', 'lock']);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    for (const call of prisma.$transaction.mock.calls) expect(call[1]).toEqual({ timeout: 10_000, maxWait: 5_000 });
    expect(mailer.sent).toHaveLength(1);
  });
  it.each([
    [{ email: 'invalid' }, undefined],
    [{ password: 'abc' }, ['min_length', 'uppercase', 'digit', 'special']],
    [{ timezone: 'Mars/Base' }, undefined],
  ])('B1#3/B1E23: invalid registration is rejected before budget, hash or DB work (%j)', async (changes, violations) => {
    await expect(auth.register({ ...body, ...changes }, res)).rejects.toMatchObject({
      status: 400, problemType: 'validation-failed', ...(violations ? { extensions: { violations } } : {}),
    });
    expect(budget.assertAvailable).not.toHaveBeenCalled(); expect(hasher.hash).not.toHaveBeenCalled(); expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('B1#30: exhausted mail budget prevents hashing and creating the account', async () => {
    budget.assertAvailable.mockRejectedValue({ status: 503 });
    await expect(auth.register(body, res)).rejects.toMatchObject({ status: 503 });
    expect(hasher.hash).not.toHaveBeenCalled(); expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('B1#2: an email unique violation becomes 409 and schedules no mail', async () => {
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
    expect(await auth.login(body)).toEqual(issued);
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
    await expect(auth.login(body)).rejects.toMatchObject({ status: 401, problemType: 'invalid-credentials', problemTitle: 'Invalid credentials' });
    expect(hasher.verify.mock.calls.length + hasher.verifyDummy.mock.calls.length).toBe(1);
    expect(committed).toBe(reason !== 'unknown'); expect(sessions.startChain).not.toHaveBeenCalled();
    if (reason !== 'wrong') expect(tx.user.update).not.toHaveBeenCalled();
    expect(logs).toContainEqual(expect.objectContaining({ event: 'login_failed' }));
    expect(JSON.stringify(logs)).not.toContain(user.email); expect(JSON.stringify(logs)).not.toContain(body.password);
    if (reason === 'unknown') expect(logs[0].email_hmac).toBe(createHmac('sha256', config.rateLimitHmacKey).update(user.email).digest('hex'));
  });
  it('B1#13: the lock event is logged after the tenth failure commits', async () => {
    hasher.verify.mockResolvedValue(false);
    tx.user.update.mockImplementation(async ({ data }) => {
      if (data.loginLockedUntil) tx.user.findUnique.mockResolvedValue({ ...user, loginLockedUntil: data.loginLockedUntil });
      return { failedLoginCount: 10 };
    });
    await expect(auth.login(body)).rejects.toMatchObject({ status: 401 });
    expect(committed).toBe(true); expect(logs).toContainEqual(expect.objectContaining({ event: 'login_locked', user_id: user.id }));
  });
  it('B1E3: another wrong login at the same instant does not report an existing lock as newly established', async () => {
    hasher.verify.mockResolvedValue(false);
    tx.user.findUnique.mockResolvedValue({ ...user, loginLockedUntil: new Date(clock.now().getTime() + 900_000) });
    await expect(auth.login(body)).rejects.toMatchObject({ status: 401 });
    expect(logs.filter((entry) => entry.event === 'login_locked')).toHaveLength(0);
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it('B1E2: overlong NFC passwords return generic 401 without account lookup or Argon2', async () => {
    await expect(auth.login({ ...body, password: '😀'.repeat(200) })).rejects.toMatchObject({ status: 401, problemType: 'invalid-credentials' });
    expect(prisma.user.findUnique).not.toHaveBeenCalled(); expect(hasher.verify).not.toHaveBeenCalled(); expect(hasher.verifyDummy).not.toHaveBeenCalled();
  });
  it('B1E2: the 128-code-point NFC boundary still verifies', async () => {
    await auth.login({ ...body, password: 'e\u0301'.repeat(128) });
    expect(hasher.verify).toHaveBeenCalledOnce();
  });
});
