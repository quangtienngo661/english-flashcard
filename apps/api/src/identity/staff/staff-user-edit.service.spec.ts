import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import type { MailBudget } from '../../common/mail/mail-budget.service.js';
import type { MailDispatcher } from '../../common/mail/mail-dispatcher.service.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { testConfig } from '../../../test/support/test-config.js';
import type { PasswordHasher } from '../auth/password-hasher.service.js';
import type { SessionService } from '../sessions/session.service.js';
import { StaffService } from './staff.service.js';

// AD18 (admin creates and edits learners): learner create, edit, admin password reset.
describe('StaffService learner create / updateUser / resetPassword (unit, isolated persistence)', () => {
  const clock = new FakeClock(new Date('2026-10-28T05:00:00Z'));
  const actorId = randomUUID(); const targetId = randomUUID();
  const tx = {
    $executeRaw: vi.fn(),
    user: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    passwordCredential: { create: vi.fn(), upsert: vi.fn() },
  };
  const prisma = { $transaction: vi.fn(), user: { findUnique: vi.fn() } };
  const budget = { assertAvailable: vi.fn() };
  const hasher = { hash: vi.fn() };
  const dispatcher = { afterResponse: vi.fn() };
  const sessions = { revokeAllForUser: vi.fn() };
  const logs: LogEntry[] = [];
  const res = {} as Response;
  const config = testConfig();
  type Stored = { id: string; email: string; givenName: string | null; familyName: string | null; emailVerifiedAt: Date | null;
    staffRole: string | null; status: string; createdAt: Date; lastSeenAt: Date | null; birthDate: Date | null; timezone: string;
    termsAcceptedAt: Date | null; termsVersion: string | null; lockedAt: Date | null; lockedBy: string | null; lockReason: string | null };
  let stored: Stored;
  let staff: StaffService;
  const mailsSent = async () => Promise.all(dispatcher.afterResponse.mock.calls.flatMap((call) => call[1]).map((job) => job()));
  beforeEach(() => {
    vi.resetAllMocks(); logs.length = 0;
    stored = { id: targetId, email: 'lan@example.com', givenName: 'Lan', familyName: null, emailVerifiedAt: clock.now(), staffRole: null,
      status: 'active', createdAt: clock.now(), lastSeenAt: null, birthDate: null, timezone: 'Asia/Saigon', termsAcceptedAt: null,
      termsVersion: null, lockedAt: null, lockedBy: null, lockReason: null };
    tx.$executeRaw.mockResolvedValue(1);
    tx.user.create.mockImplementation(async ({ data }) => ({ id: data.id, email: data.email, emailVerifiedAt: data.emailVerifiedAt,
      staffRole: data.staffRole, givenName: data.givenName ?? null, familyName: data.familyName ?? null, status: 'active' }));
    tx.user.findUnique.mockImplementation(async () => ({ ...stored }));
    tx.user.update.mockImplementation(async ({ data }) => { stored = { ...stored, ...data }; return { ...stored }; });
    prisma.user.findUnique.mockImplementation(async ({ where }) => (where.id === targetId ? { ...stored } : null));
    prisma.$transaction.mockImplementation(async (fn) => fn(tx));
    budget.assertAvailable.mockResolvedValue(undefined); hasher.hash.mockResolvedValue('hash');
    staff = new StaffService(prisma as unknown as PrismaClient, new AppLogger({ write: (entry) => { logs.push(entry); } }), clock,
      config, hasher as unknown as PasswordHasher, budget as unknown as MailBudget, dispatcher as unknown as MailDispatcher,
      sessions as unknown as SessionService);
  });

  describe('createAccount with staff_role null (a learner)', () => {
    const body = { email: 'Lan@Example.com', staff_role: null, must_change_password: true, timezone: 'Asia/Ho_Chi_Minh' };
    it('stores a verified learner with no role, no birth date and no consent', async () => {
      const view = await staff.createAccount(actorId, body, res);
      expect(view).toMatchObject({ email: 'lan@example.com', staff_role: null, email_verified: true });
      const data = tx.user.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ staffRole: null, mustChangePassword: true, emailVerifiedAt: clock.now() });
      expect(Object.keys(data).filter((key) => /birth|terms/i.test(key))).toEqual([]);
    });
    it('mails the learner app link, not the admin app link', async () => {
      await staff.createAccount(actorId, body, res);
      const [mail] = await mailsSent();
      expect(mail.to).toBe('lan@example.com');
      expect(mail.text).toContain(config.learnerAppUrl);
      expect(mail.text).not.toContain(config.adminAppUrl);
    });
  });

  describe('updateUser', () => {
    it('changes names and timezone (canonical), returns the detail', async () => {
      const detail = await staff.updateUser(actorId, targetId, { given_name: 'Mai', family_name: 'Tran', timezone: 'asia/ho_chi_minh' }, res);
      expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: targetId },
        data: { givenName: 'Mai', familyName: 'Tran', timezone: 'Asia/Saigon' } }));
      expect(detail).toMatchObject({ given_name: 'Mai', family_name: 'Tran', timezone: 'Asia/Saigon' });
      expect(await mailsSent()).toEqual([]);
    });
    it('birth date: under 13 in the learner zone → 400 age-below-minimum; a future date → 400 validation-failed; nothing written', async () => {
      await expect(staff.updateUser(actorId, targetId, { birth_date: '2014-01-01' }, res))
        .rejects.toMatchObject({ status: 400, problemType: 'age-below-minimum' });
      await expect(staff.updateUser(actorId, targetId, { birth_date: '2030-01-01' }, res))
        .rejects.toMatchObject({ status: 400, problemType: 'validation-failed' });
      expect(tx.user.update).not.toHaveBeenCalled();
      await staff.updateUser(actorId, targetId, { birth_date: '2000-02-29' }, res);
      expect(tx.user.update.mock.calls[0][0].data.birthDate).toEqual(new Date('2000-02-29T00:00:00Z'));
    });
    it('a new email is normalized, counted as verified, and the old address gets a notice', async () => {
      const detail = await staff.updateUser(actorId, targetId, { email: ' Mai@Example.COM ' }, res);
      expect(tx.user.update.mock.calls[0][0].data).toMatchObject({ email: 'mai@example.com', emailVerifiedAt: clock.now() });
      expect(detail.email).toBe('mai@example.com');
      const [notice] = await mailsSent();
      expect(notice.to).toBe('lan@example.com');
      expect(notice.text).toContain('mai@example.com');
      expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
    });
    it('the same email (any case) is not a change: no write of email, no mail', async () => {
      await staff.updateUser(actorId, targetId, { email: 'LAN@example.com', given_name: 'Lan' }, res);
      expect(tx.user.update.mock.calls[0][0].data).not.toHaveProperty('email');
      expect(await mailsSent()).toEqual([]);
    });
    it('an email taken by another account → 409 email-taken', async () => {
      tx.user.update.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
      await expect(staff.updateUser(actorId, targetId, { email: 'taken@example.com' }, res))
        .rejects.toMatchObject({ status: 409, problemType: 'email-taken' });
      expect(await mailsSent()).toEqual([]);
    });
    it('an invalid timezone or email → 400 before any write; a missing user → 404', async () => {
      await expect(staff.updateUser(actorId, targetId, { timezone: 'Mars/Base' }, res)).rejects.toMatchObject({ status: 400 });
      await expect(staff.updateUser(actorId, targetId, { email: 'not-an-email' }, res)).rejects.toMatchObject({ status: 400 });
      expect(tx.user.update).not.toHaveBeenCalled();
      tx.user.findUnique.mockResolvedValue(null);
      await expect(staff.updateUser(actorId, randomUUID(), { given_name: 'X' }, res)).rejects.toMatchObject({ status: 404 });
    });
    it('logs ids and the changed field names only', async () => {
      await staff.updateUser(actorId, targetId, { email: 'mai@example.com', birth_date: '2000-01-01' }, res);
      const entry = logs.find((log) => log.event === 'account_updated');
      expect(entry).toMatchObject({ actor_id: actorId, target_id: targetId, fields: ['email', 'birth_date'] });
      expect(JSON.stringify(logs)).not.toContain('mai@example.com');
      expect(JSON.stringify(logs)).not.toContain('2000-01-01');
    });
  });

  describe('resetPassword', () => {
    it('a weak typed password → 400 validation-failed before any work', async () => {
      await expect(staff.resetPassword(actorId, targetId, { password: 'short', must_change_password: false }, res))
        .rejects.toMatchObject({ status: 400, problemType: 'validation-failed' });
      expect(hasher.hash).not.toHaveBeenCalled(); expect(prisma.$transaction).not.toHaveBeenCalled();
    });
    it('stores the new hash, sets must-change, revokes every session, mails the password', async () => {
      await staff.resetPassword(actorId, targetId, { must_change_password: true }, res);
      expect(tx.passwordCredential.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: targetId },
        update: expect.objectContaining({ hash: 'hash' }), create: expect.objectContaining({ userId: targetId, hash: 'hash' }) }));
      expect(tx.user.update.mock.calls[0][0].data).toMatchObject({ mustChangePassword: true });
      expect(sessions.revokeAllForUser).toHaveBeenCalledWith(tx, targetId, 'admin_password_reset');
      const [mail] = await mailsSent();
      expect(mail.to).toBe('lan@example.com');
      expect(mail.text).toContain(config.learnerAppUrl);
      const generated = hasher.hash.mock.calls[0][0] as string;
      expect(mail.text).toContain(generated);
      expect(JSON.stringify(logs)).not.toContain(generated);
    });
    it('a staff target gets the admin app link', async () => {
      stored.staffRole = 'editor';
      await staff.resetPassword(actorId, targetId, { password: 'Another-Good-Pass-7!', must_change_password: false }, res);
      expect((await mailsSent())[0].text).toContain(config.adminAppUrl);
    });
    it('a missing user → 404, nothing written', async () => {
      tx.user.findUnique.mockResolvedValue(null);
      await expect(staff.resetPassword(actorId, targetId, { must_change_password: false }, res)).rejects.toMatchObject({ status: 404 });
      expect(tx.passwordCredential.upsert).not.toHaveBeenCalled(); expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
    });
  });
});
