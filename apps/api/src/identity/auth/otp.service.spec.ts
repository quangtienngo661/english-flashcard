import { createHmac, randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import type { LogEntry } from '../../common/logging/app-logger.js';
import type { PrismaClient, Prisma } from '../../generated/prisma/client.js';
import type { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { testConfig } from '../../../test/support/test-config.js';
import { FakeMailer } from '../../common/mail/fake-mailer.js';
import type { MailBudget } from '../../common/mail/mail-budget.service.js';
import { MailDispatcher } from '../../common/mail/mail-dispatcher.service.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { OtpService } from './otp.service.js';

// Only the DB boundary is replaced; live-DB regeneration and SQL semantics are
// verified by the e2e suite. No generated files are fabricated in the workspace.
vi.mock('../../generated/prisma/sql.js', () => ({
  recordOtpFailure: (...args: unknown[]) => ({ args }),
}));

describe('OTP decisions (unit, isolated persistence)', () => {
  const clock = new FakeClock(new Date('2026-10-07T12:00:00Z'));
  const config = testConfig();
  const userId = randomUUID();
  const logs: LogEntry[] = [];
  const mailer = new FakeMailer();
  const budget = { assertAvailable: vi.fn(), tryConsume: vi.fn() };
  const limiter = { hit: vi.fn() };
  const logger = new AppLogger({ write: (entry) => { logs.push(entry); } });
  const dispatcher = new MailDispatcher(mailer, budget as unknown as MailBudget, logger);
  let res: Response;
  let committed: boolean;
  let otp: OtpService;
  const dbUser = { id: userId, email: 'a@example.com', emailVerifiedAt: null, status: 'active' };
  const live = { id: randomUUID(), userId, purpose: 'verify_email', attempts: 0,
    codeHmac: createHmac('sha256', config.otpHmacKey).update('012345').digest('hex'),
    expiresAt: new Date(clock.now().getTime() + 600_000), consumedAt: null, invalidatedAt: null,
    createdAt: clock.now(),
  };
  const tx = {
    $executeRaw: vi.fn(), $queryRawTyped: vi.fn(),
    user: { findUnique: vi.fn(), update: vi.fn() },
    otpCode: { findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    otpFailureWindow: { findUnique: vi.fn(), update: vi.fn() },
  };
  const prisma = { user: { findUnique: vi.fn() }, otpFailureWindow: { findUnique: vi.fn() }, $transaction: vi.fn() };
  const transactionClient = () => tx as unknown as Prisma.TransactionClient;

  beforeEach(() => {
    vi.resetAllMocks();
    logs.length = 0;
    mailer.sent.length = 0;
    committed = false;
    clock.set(new Date('2026-10-07T12:00:00Z'));
    res = Object.assign(new EventEmitter(), { closed: false }) as unknown as Response;
    tx.$executeRaw.mockResolvedValue(1);
    tx.$queryRawTyped.mockResolvedValue([{ failures: 1, locked_until: null }]);
    tx.user.findUnique.mockResolvedValue(dbUser);
    tx.otpFailureWindow.findUnique.mockResolvedValue(null);
    tx.otpCode.findFirst.mockResolvedValue(live);
    tx.otpCode.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.findUnique.mockResolvedValue(dbUser);
    prisma.otpFailureWindow.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (fn: (client: Prisma.TransactionClient) => Promise<unknown>) => {
      const result = await fn(transactionClient());
      committed = true;
      return result;
    });
    limiter.hit.mockResolvedValue(undefined);
    budget.assertAvailable.mockResolvedValue(undefined);
    budget.tryConsume.mockResolvedValue(true);
    otp = new OtpService(prisma as unknown as PrismaClient, config, clock,
      limiter as unknown as RateLimiter, budget as unknown as MailBudget, dispatcher, logger);
  });

  const predicates = () => ({ userId, purpose: 'verify_email', consumedAt: null,
    invalidatedAt: null, expiresAt: { gt: clock.now() }, attempts: { lt: 5 } });

  it('tryLimitEmail: returns true after both email limits allow sending', async () => {
    expect(await otp.tryLimitEmail(dbUser.email)).toBe(true);
    expect(limiter.hit.mock.calls).toEqual([
      ['auth.otp.email.cooldown', dbUser.email], ['auth.otp.email.hourly', dbUser.email],
    ]);
  });

  it.each(['auth.otp.email.cooldown', 'auth.otp.email.hourly'])('tryLimitEmail: returns false for %s rate limiting', async (rule) => {
    limiter.hit.mockImplementation(async (name) => {
      if (name === rule) throw new ProblemDetailsException({ status: 429, title: 'Too many requests', type: 'rate-limited' });
    });
    expect(await otp.tryLimitEmail(dbUser.email)).toBe(false);
  });

  it.each([
    new Error('limiter unavailable'),
    new ProblemDetailsException({ status: 503, title: 'Unavailable', type: 'rate-limited' }),
    new ProblemDetailsException({ status: 429, title: 'Unexpected problem', type: 'unexpected' }),
  ])('tryLimitEmail: rethrows unexpected errors (%s)', async (error) => {
    limiter.hit.mockRejectedValue(error);
    await expect(otp.tryLimitEmail(dbUser.email)).rejects.toBe(error);
  });

  it('sendVerifyCodeQuietly: within the 60 s cooldown -> no mail, no throw', async () => {
    limiter.hit.mockRejectedValue(new ProblemDetailsException({ status: 429, title: 'Too many requests', type: 'rate-limited' }));
    await expect(otp.sendVerifyCodeQuietly(userId, dbUser.email, res)).resolves.toBeUndefined();
    expect(budget.assertAvailable).not.toHaveBeenCalled(); expect(res.listenerCount('close')).toBe(0);
    res.emit('close'); await dispatcher.drain();
    expect(prisma.$transaction).not.toHaveBeenCalled(); expect(tx.otpCode.updateMany).not.toHaveBeenCalled();
    expect(mailer.sent).toEqual([]);
  });

  it('sendVerifyCodeQuietly: a 503 mail-unavailable budget error -> no mail, no throw', async () => {
    budget.assertAvailable.mockRejectedValue(new ProblemDetailsException({ status: 503, title: 'Mail unavailable', type: 'mail-unavailable' }));
    await expect(otp.sendVerifyCodeQuietly(userId, dbUser.email, res)).resolves.toBeUndefined();
    expect(budget.assertAvailable).toHaveBeenCalledOnce(); expect(res.listenerCount('close')).toBe(0);
    res.emit('close'); await dispatcher.drain();
    expect(prisma.$transaction).not.toHaveBeenCalled(); expect(tx.otpCode.updateMany).not.toHaveBeenCalled();
    expect(mailer.sent).toEqual([]);
  });

  it.each([
    new Error('budget unavailable'),
    new ProblemDetailsException({ status: 429, title: 'Mail unavailable', type: 'mail-unavailable' }),
    new ProblemDetailsException({ status: 503, title: 'Unexpected problem', type: 'unexpected' }),
  ])('sendVerifyCodeQuietly: rethrows unexpected budget errors (%s)', async (error) => {
    budget.assertAvailable.mockRejectedValue(error);
    await expect(otp.sendVerifyCodeQuietly(userId, dbUser.email, res)).rejects.toBe(error);
    expect(prisma.$transaction).not.toHaveBeenCalled(); expect(res.listenerCount('close')).toBe(0);
  });

  it('sendVerifyCodeQuietly: issues under the user lock after close and mails after commit', async () => {
    const events: string[] = [];
    tx.$executeRaw.mockImplementation(async () => { events.push('lock'); });
    tx.otpCode.create.mockImplementation(async () => { events.push('issue'); });
    const noteIssued = vi.spyOn(otp, 'noteIssued').mockImplementation((_id, _purpose, message) => {
      expect(committed).toBe(true); return message;
    });
    await otp.sendVerifyCodeQuietly(userId, dbUser.email, res);
    expect(limiter.hit.mock.calls).toEqual([
      ['auth.otp.email.cooldown', dbUser.email], ['auth.otp.email.hourly', dbUser.email],
    ]);
    expect(budget.assertAvailable).toHaveBeenCalledOnce(); expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(mailer.sent).toEqual([]); expect(events).toEqual([]);
    res.emit('close'); await dispatcher.drain();
    expect(events).toEqual(['lock', 'issue']); expect(committed).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledExactlyOnceWith(expect.any(Function), { timeout: 10_000, maxWait: 5_000 });
    expect(noteIssued).toHaveBeenCalledExactlyOnceWith(userId, 'verify_email', expect.objectContaining({ to: dbUser.email }));
    expect(tx.otpCode.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId, purpose: 'verify_email' }) });
    expect(mailer.sent).toHaveLength(1);
  });

  it('B1#4: issuance invalidates live codes and prepares a padded code with a ten-minute keyed HMAC', async () => {
    const message = await otp.issueInTx(transactionClient(), userId, 'verify_email');
    const code = /\b\d{6}\b/.exec(message!.text)?.[0];
    expect(code).toMatch(/^\d{6}$/);
    expect(message?.to).toBe(dbUser.email);
    expect(tx.otpCode.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      userId, purpose: 'verify_email',
      codeHmac: createHmac('sha256', config.otpHmacKey).update(code!).digest('hex'),
      expiresAt: new Date('2026-10-07T12:10:00Z'),
    }) });
    expect(tx.otpCode.updateMany).toHaveBeenCalledWith({ where: expect.objectContaining({
      userId, purpose: 'verify_email', consumedAt: null, invalidatedAt: null, expiresAt: { gt: clock.now() },
    }), data: { invalidatedAt: clock.now() } });
    expect(mailer.sent).toEqual([]);
  });

  it('B1E22: verified user gets no verify-email code but can receive a reset code', async () => {
    tx.user.findUnique.mockResolvedValue({ ...dbUser, emailVerifiedAt: clock.now() });
    expect(await otp.issueInTx(transactionClient(), userId, 'verify_email')).toBeNull();
    expect(tx.otpCode.create).not.toHaveBeenCalled();
    expect(await otp.issueInTx(transactionClient(), userId, 'reset_password')).toMatchObject({ to: dbUser.email });
  });

  it('N4: locked user asks for an OTP → 202, no mail', async () => {
    tx.user.findUnique.mockResolvedValue({ ...dbUser, status: 'locked' });
    prisma.user.findUnique.mockResolvedValue({ ...dbUser, status: 'locked' });
    for (const purpose of ['verify_email', 'reset_password'] as const) {
      expect(await otp.issueInTx(transactionClient(), userId, purpose)).toBeNull();
    }
    await expect(otp.requestVerifyEmail(dbUser.email, res)).resolves.toBeUndefined();
    await expect(otp.requestPasswordReset(dbUser.email, res)).resolves.toBeUndefined();
    res.emit('close'); await dispatcher.drain();
    expect(committed).toBe(true);
    expect(tx.otpCode.create).not.toHaveBeenCalled(); expect(tx.otpCode.updateMany).not.toHaveBeenCalled();
    expect(mailer.sent).toEqual([]); expect(logs.filter((entry) => entry.event === 'otp_sent')).toEqual([]);
  });

  it('B1E17: a locked purpose permits neither issue nor check and carries no repeated notice', async () => {
    const lockedUntil = new Date('2026-10-08T12:00:00Z');
    tx.otpFailureWindow.findUnique.mockResolvedValue({ lockedUntil });
    expect(await otp.issueInTx(transactionClient(), userId, 'reset_password')).toBeNull();
    expect(await otp.checkInTx(transactionClient(), userId, 'reset_password', '012345')).toEqual({
      kind: 'locked', lockedUntil, notice: null,
    });
    expect(tx.otpCode.findFirst).not.toHaveBeenCalled();
    expect(tx.otpCode.updateMany).not.toHaveBeenCalled();
  });

  it('B1#7/B1E19: trimmed leading-zero code is consumed with every live predicate', async () => {
    expect(await otp.checkInTx(transactionClient(), userId, 'verify_email', ' 012345 ')).toEqual({ kind: 'ok' });
    expect(tx.otpCode.updateMany).toHaveBeenCalledWith({
      where: { ...predicates(), id: live.id }, data: { consumedAt: clock.now() },
    });
    expect(tx.$queryRawTyped).not.toHaveBeenCalled();
  });

  it.each(['12345', 'abcdef', '１２３４５６'])('B1#10: malformed code %s never increments attempts', async (code) => {
    expect(await otp.checkInTx(transactionClient(), userId, 'verify_email', code)).toEqual({ kind: 'no_live_code' });
    expect(tx.otpCode.updateMany).not.toHaveBeenCalled();
    expect(tx.$queryRawTyped).not.toHaveBeenCalled();
  });

  it('B1#10: missing live code is not counted', async () => {
    tx.otpCode.findFirst.mockResolvedValue(null);
    expect(await otp.checkInTx(transactionClient(), userId, 'verify_email', '123456')).toEqual({ kind: 'no_live_code' });
    expect(tx.$queryRawTyped).not.toHaveBeenCalled();
  });

  it('B1#8: a failed conditional consume never succeeds', async () => {
    tx.otpCode.updateMany.mockResolvedValue({ count: 0 });
    expect(await otp.checkInTx(transactionClient(), userId, 'verify_email', '012345')).toEqual({ kind: 'no_live_code' });
    expect(tx.$queryRawTyped).not.toHaveBeenCalled();
  });

  it('B1#8: failed conditional increment does not affect the cumulative window', async () => {
    tx.otpCode.updateMany.mockResolvedValue({ count: 0 });
    expect(await otp.checkInTx(transactionClient(), userId, 'verify_email', '999999')).toEqual({ kind: 'no_live_code' });
    expect(tx.$queryRawTyped).not.toHaveBeenCalled();
  });

  it('B1#8: wrong code counts both attempt counters', async () => {
    expect(await otp.checkInTx(transactionClient(), userId, 'verify_email', '999999')).toEqual({ kind: 'wrong' });
    expect(tx.otpCode.updateMany).toHaveBeenCalledWith({ where: { ...predicates(), id: live.id }, data: { attempts: { increment: 1 } } });
    expect(tx.$queryRawTyped).toHaveBeenCalledExactlyOnceWith({ args: [userId, 'verify_email', clock.now()] });
  });

  it('B1#10: 21st failure prepares the lock and notice', async () => {
    tx.$queryRawTyped.mockResolvedValue([{ failures: 21, locked_until: null }]);
    expect(await otp.checkInTx(transactionClient(), userId, 'verify_email', '999999')).toEqual({
      kind: 'locked', lockedUntil: new Date('2026-10-08T12:00:00Z'),
      notice: expect.objectContaining({ to: dbUser.email, subject: expect.stringContaining('temporarily locked') }),
    });
    expect(tx.otpFailureWindow.update).toHaveBeenCalledWith({
      where: { userId_purpose: { userId, purpose: 'verify_email' } }, data: { lockedUntil: new Date('2026-10-08T12:00:00Z') },
    });
    expect(mailer.sent).toEqual([]);
  });

  it('B1#38: known reset account lookup, issuance and SMTP wait for close and commit', async () => {
    await otp.requestPasswordReset('  A@Example.COM ', res);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(mailer.sent).toEqual([]);
    res.emit('close');
    await dispatcher.drain();
    expect(committed).toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@example.com' } });
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].subject).toContain('Reset your password');
  });

  it('verify_email: an OTP-locked account -> accepted, nothing issued or mailed after close', async () => {
    tx.otpFailureWindow.findUnique.mockResolvedValue({ lockedUntil: new Date('2026-10-07T12:00:03.500Z') });
    await expect(otp.requestVerifyEmail(dbUser.email, res)).resolves.toBeUndefined();
    expect(prisma.user.findUnique).not.toHaveBeenCalled(); expect(prisma.$transaction).not.toHaveBeenCalled();
    res.emit('close'); await dispatcher.drain();
    expect(committed).toBe(true);
    expect(tx.otpCode.create).not.toHaveBeenCalled();
    expect(mailer.sent).toEqual([]);
  });

  it('verify_email: lookup, lock and issuance wait for close; mail and noteIssued wait for commit', async () => {
    const events: string[] = [];
    prisma.user.findUnique.mockImplementation(async () => { events.push('lookup'); return dbUser; });
    tx.$executeRaw.mockImplementation(async () => { events.push('lock'); });
    tx.otpCode.create.mockImplementation(async () => { events.push('issue'); });
    const noteIssued = vi.spyOn(otp, 'noteIssued').mockImplementation((_id, _purpose, message) => {
      expect(committed).toBe(true); return message;
    });
    await otp.requestVerifyEmail('  Foo@Example.COM ', res);
    expect(limiter.hit.mock.calls).toEqual([
      ['auth.otp.email.cooldown', 'foo@example.com'], ['auth.otp.email.hourly', 'foo@example.com'],
    ]);
    expect(budget.assertAvailable).toHaveBeenCalledOnce();
    expect(prisma.user.findUnique).not.toHaveBeenCalled(); expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(events).toEqual([]); expect(mailer.sent).toEqual([]);
    res.emit('close'); await dispatcher.drain();
    expect(events).toEqual(['lookup', 'lock', 'issue']);
    expect(prisma.user.findUnique).toHaveBeenCalledExactlyOnceWith({ where: { email: 'foo@example.com' } });
    expect(prisma.$transaction).toHaveBeenCalledExactlyOnceWith(expect.any(Function), { timeout: 10_000, maxWait: 5_000 });
    expect(tx.otpCode.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId, purpose: 'verify_email' }) });
    expect(noteIssued).toHaveBeenCalledExactlyOnceWith(userId, 'verify_email', expect.objectContaining({ to: dbUser.email }));
    expect(mailer.sent).toHaveLength(1);
  });

  it.each(['invalid', 'a@@b.com', 'x'.repeat(250) + '@b.com'])('verify_email: invalid email %s -> 400 before limits, budget or lookup', async (email) => {
    await expect(otp.requestVerifyEmail(email, res)).rejects.toMatchObject({ status: 400, problemType: 'validation-failed' });
    expect(limiter.hit).not.toHaveBeenCalled(); expect(budget.assertAvailable).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled(); expect(res.listenerCount('close')).toBe(0);
  });

  it.each(['auth.otp.email.cooldown', 'auth.otp.email.hourly'])('verify_email: %s denial -> 429 before budget or lookup', async (rule) => {
    const error = new ProblemDetailsException({ status: 429, title: 'Too many requests', type: 'rate-limited', retryAfterSeconds: 60 });
    limiter.hit.mockImplementation(async (name) => { if (name === rule) throw error; });
    await expect(otp.requestVerifyEmail(dbUser.email, res)).rejects.toBe(error);
    expect(budget.assertAvailable).not.toHaveBeenCalled(); expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(res.listenerCount('close')).toBe(0);
  });

  it('verify_email: exhausted budget -> 503 before lookup or dispatch', async () => {
    const error = new ProblemDetailsException({ status: 503, title: 'Mail unavailable', type: 'mail-unavailable' });
    budget.assertAvailable.mockRejectedValue(error);
    await expect(otp.requestVerifyEmail(dbUser.email, res)).rejects.toBe(error);
    expect(limiter.hit).toHaveBeenCalledTimes(2); expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(res.listenerCount('close')).toBe(0);
  });
});
