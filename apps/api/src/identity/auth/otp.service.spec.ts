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
import { FakeMailer } from '../mailer/fake-mailer.js';
import type { MailBudget } from '../mailer/mail-budget.service.js';
import { MailDispatcher } from '../mailer/mail-dispatcher.service.js';
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
  const user = { userId, sessionChainId: randomUUID() };
  const logs: LogEntry[] = [];
  const mailer = new FakeMailer();
  const budget = { assertAvailable: vi.fn(), tryConsume: vi.fn() };
  const limiter = { hit: vi.fn() };
  const logger = new AppLogger({ write: (entry) => { logs.push(entry); } });
  const dispatcher = new MailDispatcher(mailer, budget as unknown as MailBudget, logger);
  let res: Response;
  let committed: boolean;
  let otp: OtpService;
  const dbUser = { id: userId, email: 'a@example.com', emailVerifiedAt: null };
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

  it('B1#8/B1#34: wrong-code HTTP denial follows commit of both attempt counters', async () => {
    await expect(otp.verifyEmail(user, '999999', res)).rejects.toMatchObject({ status: 400, problemType: 'invalid-otp' });
    expect(committed).toBe(true);
    expect(tx.otpCode.updateMany).toHaveBeenCalledWith({ where: { ...predicates(), id: live.id }, data: { attempts: { increment: 1 } } });
    expect(tx.$queryRawTyped).toHaveBeenCalledExactlyOnceWith({ args: [userId, 'verify_email', clock.now()] });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 10_000, maxWait: 5_000 });
  });

  it('B1#10/I28: 21st failure commits the lock, schedules a notice before 429, and sends only after close', async () => {
    tx.$queryRawTyped.mockResolvedValue([{ failures: 21, locked_until: null }]);
    await expect(otp.verifyEmail(user, '999999', res)).rejects.toMatchObject({
      status: 429, problemType: 'rate-limited', retryAfterSeconds: 86400,
    });
    expect(committed).toBe(true);
    expect(tx.otpFailureWindow.update).toHaveBeenCalledWith({
      where: { userId_purpose: { userId, purpose: 'verify_email' } }, data: { lockedUntil: new Date('2026-10-08T12:00:00Z') },
    });
    expect(mailer.sent).toEqual([]);
    expect(logs).toContainEqual(expect.objectContaining({ event: 'otp_locked', user_id: userId, purpose: 'verify_email' }));
    res.emit('close');
    await dispatcher.drain();
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].subject).toContain('temporarily locked');
  });

  it('B1#7/D14: already verified is decided under lock and skips code comparison', async () => {
    tx.user.findUnique.mockResolvedValue({ ...dbUser, emailVerifiedAt: clock.now() });
    await expect(otp.verifyEmail(user, '999999', res)).rejects.toMatchObject({ status: 409, problemType: 'email-already-verified' });
    expect(committed).toBe(true);
    expect(tx.$executeRaw).toHaveBeenCalledOnce();
    expect(tx.otpCode.findFirst).not.toHaveBeenCalled();
  });

  it('B1#7: correct verification writes the timestamp in the committed transaction', async () => {
    expect(await otp.verifyEmail(user, '012345', res)).toEqual({ email_verified: true });
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: userId }, data: { emailVerifiedAt: clock.now() } });
    expect(committed).toBe(true);
  });

  it('B1#34: unexpected DB failures roll back and schedule no mail', async () => {
    tx.otpCode.updateMany.mockRejectedValue(new Error('database unavailable'));
    await expect(otp.verifyEmail(user, '999999', res)).rejects.toThrow('database unavailable');
    expect(committed).toBe(false);
    res.emit('close');
    await dispatcher.drain();
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

  it('B1#4: verify issuance re-reads a purpose lock inside the transaction and returns Retry-After', async () => {
    tx.otpFailureWindow.findUnique.mockResolvedValue({ lockedUntil: new Date('2026-10-07T12:00:03.500Z') });
    await expect(otp.requestVerifyEmail(user, res)).rejects.toMatchObject({ status: 429, retryAfterSeconds: 4 });
    expect(committed).toBe(true);
    expect(tx.otpCode.create).not.toHaveBeenCalled();
  });
});
