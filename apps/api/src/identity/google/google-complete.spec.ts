import { randomBytes, randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { AppConfig } from '../../common/config/app-config.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import type { MailDispatcher } from '../../common/mail/mail-dispatcher.service.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { testConfig } from '../../../test/support/test-config.js';
import type { IssuedSession, SessionService } from '../sessions/session.service.js';
import { FakeGoogleClient } from './google-client.fake.js';
import { GoogleAuthService, type SignupTicket } from './google-auth.service.js';
import { googleCompleteSchema } from './google.schemas.js';
import { sealJson } from './sealed-cookie.js';

const clock = new FakeClock(new Date('2026-10-29T12:00:00Z'));
const KEY = randomBytes(32);
const config: AppConfig = {
  ...testConfig(),
  google: { mode: 'fake', clientId: null, clientSecret: null, redirectUri: 'http://localhost:3000/cb', apiOrigin: 'http://localhost:3000', cookieKey: KEY },
};
const ticket = (over: Partial<SignupTicket> = {}) => sealJson(
  { sub: 'sub-1', email: 'minh@gmail.com', givenName: 'Minh', familyName: 'Trần', picture: 'https://p/1.png', locale: 'vi', next: '/vi/app', ...over }, 900, KEY, clock.now());
const body = (over: Record<string, unknown> = {}) => googleCompleteSchema.parse({ birth_date: '2000-05-01', accept_terms: true, timezone: 'Asia/Saigon', ...over });

type Existing = { id: string; status: string; emailVerifiedAt: Date | null } | null;

function setup(existing: Existing = null) {
  const calls: string[] = [];
  const clearCookie = vi.fn();
  const res = { clearCookie } as unknown as Response;
  const created: Array<Record<string, unknown>> = [];
  const updated: Array<Record<string, unknown>> = [];
  const tx = {
    $executeRaw: vi.fn(async () => 1),
    user: {
      findUnique: vi.fn(async () => existing),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { calls.push('create-user'); created.push(data); return data; }),
      updateMany: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { calls.push('update-user'); updated.push(data); return { count: 1 }; }),
    },
    passwordCredential: { deleteMany: vi.fn(async () => { calls.push('delete-password'); return { count: 1 }; }) },
    otpCode: { updateMany: vi.fn(async () => ({ count: 0 })) },
    userIdentity: { create: vi.fn(async () => { calls.push('create-identity'); return {}; }) },
  };
  const prisma = {
    user: { findUnique: vi.fn(async () => (existing ? { id: existing.id } : null)) },
    $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
  };
  const session = { accessToken: 'a', refreshToken: 'r', sessionChainId: randomUUID(), client: 'web', refreshExpiresAt: new Date() } as IssuedSession;
  const sessions = {
    startChain: vi.fn(async () => { calls.push('start-chain'); return session; }),
    revokeAllForUser: vi.fn(async () => { calls.push('revoke-chains'); }),
  };
  const service = new GoogleAuthService(
    prisma as unknown as PrismaClient, config, clock, new AppLogger({ write: vi.fn() }), new FakeGoogleClient(config.google),
    sessions as unknown as SessionService, { afterResponse: vi.fn() } as unknown as MailDispatcher,
  );
  return { service, tx, prisma, sessions, calls, clearCookie, res, created, updated, session };
}

describe('GoogleAuthService.completeInfo', () => {
  it('Review Focus 1: needs_name is false when Google sent a first name, true when it sent only a full name or nothing', () => {
    const s = setup();
    expect(s.service.completeInfo(ticket())).toEqual({ email: 'minh@gmail.com', needs_name: false });
    expect(s.service.completeInfo(ticket({ givenName: undefined }))).toEqual({ email: 'minh@gmail.com', needs_name: true });
    expect(s.service.completeInfo(ticket({ givenName: '   ' }))).toMatchObject({ needs_name: true });
  });

  it('B8E8: a missing, expired or tampered cookie → 401 invalid-token', () => {
    const s = setup();
    const expired = sealJson({ sub: 's', email: 'a@b.c', locale: 'vi', next: '/vi/app' }, 900, KEY, new Date(clock.now().getTime() - 901_000));
    for (const bad of [undefined, '', 'garbage', expired]) {
      expect(() => s.service.completeInfo(bad)).toThrowError(expect.objectContaining({ status: 401, problemType: 'invalid-token' }));
    }
  });
});

describe('GoogleAuthService.complete', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => { s = setup(); });

  it('creates a verified user from the ticket, the identity and a Google chain, in one transaction, and clears the ticket cookie', async () => {
    const session = await s.service.complete(ticket(), body(), s.res);
    expect(session).toBe(s.session);
    expect(s.calls).toEqual(['create-user', 'create-identity', 'start-chain']);
    expect(s.created[0]).toMatchObject({
      email: 'minh@gmail.com', givenName: 'Minh', familyName: 'Trần', timezone: 'Asia/Saigon', termsVersion: '2026-10-20',
      avatarUrl: 'https://p/1.png', emailVerifiedAt: clock.now(), termsAcceptedAt: clock.now(),
    });
    expect(s.tx.userIdentity.create).toHaveBeenCalledWith({ data: { userId: s.created[0].id, provider: 'google', subject: 'sub-1' } });
    expect(s.sessions.startChain).toHaveBeenCalledWith(s.tx, { userId: s.created[0].id, client: 'web', authMethod: 'google' });
    expect(s.clearCookie).toHaveBeenCalledWith('google_signup', expect.objectContaining({ path: '/v1/auth/google' }));
  });

  it('Review Focus 1: with no first name from Google the body must give one (400 validation-failed otherwise); with one it is used', async () => {
    await expect(s.service.complete(ticket({ givenName: undefined }), body(), s.res)).rejects.toMatchObject({ status: 400, problemType: 'validation-failed' });
    expect(s.tx.user.create).not.toHaveBeenCalled();
    await s.service.complete(ticket({ givenName: undefined, familyName: undefined }), body({ given_name: 'Lan', family_name: 'Võ' }), s.res);
    expect(s.created[0]).toMatchObject({ givenName: 'Lan', familyName: 'Võ' });
  });

  it('B8E9: under 13 → 400 age-below-minimum, nothing stored, the ticket cleared', async () => {
    await expect(s.service.complete(ticket(), body({ birth_date: '2020-01-01' }), s.res)).rejects.toMatchObject({ status: 400, problemType: 'age-below-minimum' });
    expect(s.prisma.$transaction).not.toHaveBeenCalled();
    expect(s.clearCookie).toHaveBeenCalledWith('google_signup', expect.anything());
  });

  it('a future birth date or an unknown time zone → 400 validation-failed', async () => {
    await expect(s.service.complete(ticket(), body({ birth_date: '2030-01-01' }), s.res)).rejects.toMatchObject({ problemType: 'validation-failed' });
    await expect(s.service.complete(ticket(), body({ timezone: 'Not/AZone' }), s.res)).rejects.toMatchObject({ problemType: 'validation-failed' });
  });

  it('B8E6 / I15: an unverified active account with the address is reused: profile overwritten, password deleted, chains revoked, then verified', async () => {
    const id = randomUUID();
    s = setup({ id, status: 'active', emailVerifiedAt: null });
    await s.service.complete(ticket(), body(), s.res);
    expect(s.calls).toEqual(['update-user', 'delete-password', 'revoke-chains', 'create-identity', 'start-chain']);
    expect(s.tx.user.create).not.toHaveBeenCalled();
    expect(s.tx.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id, emailVerifiedAt: null, status: 'active' } }));
    expect(s.updated[0]).toMatchObject({ emailVerifiedAt: clock.now(), failedLoginCount: 0, loginLockedUntil: null });
    expect(s.sessions.revokeAllForUser).toHaveBeenCalledWith(s.tx, id, 'google-signup');
    expect(s.tx.userIdentity.create).toHaveBeenCalledWith({ data: { userId: id, provider: 'google', subject: 'sub-1' } });
  });

  it('an unverified but locked account → 403 account-locked', async () => {
    s = setup({ id: randomUUID(), status: 'locked', emailVerifiedAt: null });
    await expect(s.service.complete(ticket(), body(), s.res)).rejects.toMatchObject({ status: 403, problemType: 'account-locked' });
    expect(s.tx.userIdentity.create).not.toHaveBeenCalled();
  });

  it('B8E10: a verified account appeared in the meantime → 409 email-taken, and a unique violation maps to the same', async () => {
    s = setup({ id: randomUUID(), status: 'active', emailVerifiedAt: clock.now() });
    await expect(s.service.complete(ticket(), body(), s.res)).rejects.toMatchObject({ status: 409, problemType: 'email-taken' });
    s = setup();
    s.prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    await expect(s.service.complete(ticket(), body(), s.res)).rejects.toMatchObject({ status: 409, problemType: 'email-taken' });
  });

  it('a picture that is not an http(s) URL is dropped', async () => {
    await s.service.complete(ticket({ picture: 'javascript:alert(1)' }), body(), s.res);
    expect(s.created[0].avatarUrl).toBeNull();
  });
});

describe('googleCompleteSchema', () => {
  it('needs accept_terms true, a real birth date and no extra keys', () => {
    expect(googleCompleteSchema.safeParse({ birth_date: '2000-05-01', accept_terms: true, timezone: 'Asia/Saigon' }).success).toBe(true);
    for (const bad of [{ accept_terms: false }, { birth_date: '2000-02-31' }, { extra: 1 }, { given_name: '' }]) {
      expect(googleCompleteSchema.safeParse({ birth_date: '2000-05-01', accept_terms: true, timezone: 'Asia/Saigon', ...bad }).success, JSON.stringify(bad)).toBe(false);
    }
  });
});
