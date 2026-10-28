import { randomBytes, randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { AppConfig } from '../../common/config/app-config.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import type { MailDispatcher } from '../../common/mail/mail-dispatcher.service.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { testConfig } from '../../../test/support/test-config.js';
import type { IssuedSession, SessionService } from '../sessions/session.service.js';
import { FakeGoogleClient, type FakeAccount } from './google-client.fake.js';
import { GoogleExchangeError, s256, type GoogleClient } from './google-client.js';
import { GoogleAuthService, type OAuthState, type SignupTicket } from './google-auth.service.js';
import { openJson } from './sealed-cookie.js';

const clock = new FakeClock(new Date('2026-10-29T12:00:00Z'));
const KEY = randomBytes(32);
const REDIRECT = 'http://localhost:3000/v1/auth/google/callback';
const WEB = 'http://localhost:3001';
const USER = randomUUID();
const res = {} as Response;

type UserRow = { id: string; status: string; emailVerifiedAt: Date | null; email: string; identities: Array<{ provider: string }> };

function setup(over: { byEmail?: Partial<UserRow> | null; bySub?: { userId: string } | null; userStatus?: string; client?: GoogleClient } = {}) {
  const logs: LogEntry[] = [];
  const config: AppConfig = { ...testConfig(), google: { mode: 'fake', clientId: null, clientSecret: null, redirectUri: REDIRECT, apiOrigin: 'http://localhost:3000', cookieKey: KEY } };
  const fake = new FakeGoogleClient(config.google, () => clock.now());
  const created: Array<Record<string, unknown>> = [];
  let userStatus = over.userStatus ?? 'active';
  const tx = {
    $executeRaw: vi.fn(async () => 1),
    user: { findUnique: vi.fn(async () => ({ status: userStatus, email: 'lan@gmail.com' })) },
    userIdentity: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { created.push(data); return data; }) },
  };
  const prisma = {
    user: {
      findUnique: vi.fn(async () => (over.byEmail === null ? null : {
        id: USER, status: 'active', emailVerifiedAt: clock.now(), email: 'lan@gmail.com', identities: [], ...over.byEmail,
      })),
      create: vi.fn(),
    },
    userIdentity: { findUnique: vi.fn(async () => over.bySub ?? null) },
    $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
  };
  const session = { accessToken: 'at', refreshToken: 'rt', sessionChainId: randomUUID(), client: 'web', refreshExpiresAt: new Date() } as IssuedSession;
  const sessions = { startChain: vi.fn(async (..._a: unknown[]) => session) };
  const afterResponse = vi.fn();
  const service = new GoogleAuthService(
    prisma as unknown as PrismaClient, config, clock, new AppLogger({ write: (e) => logs.push(e) }), over.client ?? fake,
    sessions as unknown as SessionService, { afterResponse } as unknown as MailDispatcher,
  );
  const exchange = vi.spyOn(over.client ?? fake, 'exchange');
  return { service, fake, prisma, tx, sessions, afterResponse, logs, exchange, created, session, setStatus: (s: string) => { userStatus = s; } };
}

/** start → the saved state → the code the fake page would issue for `account`. */
async function approve(s: ReturnType<typeof setup>, account: Partial<FakeAccount> = {}, next?: string) {
  const started = await s.service.start({ locale: 'vi', next });
  const saved = openJson<OAuthState>(started.oauthCookie!, KEY, clock.now())!;
  const url = new URL(s.fake.issueCode({
    account: { email: 'lan@gmail.com', sub: 'sub-1', ...account }, state: saved.state, nonce: saved.nonce,
    codeChallenge: s256(saved.codeVerifier), redirectUri: REDIRECT,
  }));
  return { cookie: started.oauthCookie!, saved, code: url.searchParams.get('code')!, state: url.searchParams.get('state')! };
}

describe('GoogleAuthService.start', () => {
  it('seals state, nonce and the PKCE verifier in the cookie, sends the challenge to Google, and keeps a safe next', async () => {
    const s = setup();
    const started = await s.service.start({ locale: 'en', next: '/en/app/word?id=1#x' });
    const saved = openJson<OAuthState>(started.oauthCookie!, KEY, clock.now())!;
    expect(saved).toMatchObject({ intent: 'login', locale: 'en', next: '/en/app/word?id=1#x' });
    const url = new URL(started.location);
    expect(url.searchParams.get('state')).toBe(saved.state);
    expect(url.searchParams.get('nonce')).toBe(saved.nonce);
    expect(url.searchParams.get('code_challenge')).toBe(s256(saved.codeVerifier));
    expect(started.oauthCookie).not.toContain(saved.codeVerifier);
  });

  it('a bad next falls back to /{locale}/app', async () => {
    const saved = openJson<OAuthState>((await setup().service.start({ locale: 'vi', next: '//evil.example' })).oauthCookie!, KEY, clock.now())!;
    expect(saved.next).toBe('/vi/app');
  });

  it('mode off → an absolute redirect to the login page with google-unavailable and no cookie', async () => {
    const s = setup();
    const off = new GoogleAuthService(s.prisma as unknown as PrismaClient, { ...testConfig(), google: { mode: 'off', clientId: null, clientSecret: null, redirectUri: null, apiOrigin: null, cookieKey: null } },
      clock, new AppLogger({ write: vi.fn() }), s.fake, s.sessions as unknown as SessionService, { afterResponse: vi.fn() } as unknown as MailDispatcher);
    expect(await off.start({ locale: 'vi' })).toEqual({ location: `${WEB}/vi/app/login?error=google-unavailable`, oauthCookie: null });
  });
});

describe('GoogleAuthService.callback', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => { vi.clearAllMocks(); s = setup(); });
  const call = (x: Awaited<ReturnType<typeof approve>>, over: Record<string, unknown> = {}) =>
    s.service.callback({ code: x.code, state: x.state, oauthCookie: x.cookie, ...over }, res);

  it('every Location is absolute and on the learner web', async () => {
    for (const result of [
      await s.service.callback({ code: 'c', state: 's' }, res),
      await call(await approve(s)),
      await call(await approve(setup({ byEmail: null }), {}), {}),
    ]) expect(result.location.startsWith(`${WEB}/`)).toBe(true);
  });

  it('B8E1: a state that does not match, a missing or tampered cookie → google-failed and Google is never asked', async () => {
    const x = await approve(s);
    for (const bad of [{ state: 'other' }, { oauthCookie: undefined }, { oauthCookie: x.cookie.slice(0, -2) + 'xx' }, { code: undefined }, { error: 'access_denied' }]) {
      const result = await call(x, bad);
      expect(result.location).toBe(`${WEB}/vi/app/login?error=google-failed`);
      expect(result.session).toBeUndefined();
    }
    expect(s.exchange).not.toHaveBeenCalled();
  });

  it('B8E4: a failing exchange (timeout, rejected code) → google-failed, nothing written', async () => {
    const x = await approve(s);
    s.exchange.mockRejectedValueOnce(new GoogleExchangeError('timeout'));
    expect((await call(x)).location).toBe(`${WEB}/vi/app/login?error=google-failed`);
    expect(s.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('B8E3: email_verified false → google-email-unverified, nothing written', async () => {
    const result = await call(await approve(s, { emailVerified: false }));
    expect(result.location).toBe(`${WEB}/vi/app/login?error=google-email-unverified`);
    expect(s.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('a known sub signs in with a Google session and goes back to next with signed_in=google (B8E7: found by sub, whatever the email says now)', async () => {
    s = setup({ bySub: { userId: USER }, byEmail: null });
    const result = await call(await approve(s, { email: 'changed@gmail.com' }, '/vi/app/word?id=1#x'));
    expect(result.location).toBe(`${WEB}/vi/app/word?id=1&signed_in=google#x`);
    expect(result.session).toBe(s.session);
    expect(s.sessions.startChain).toHaveBeenCalledWith(s.tx, { userId: USER, client: 'web', authMethod: 'google' });
    expect(s.tx.userIdentity.create).not.toHaveBeenCalled();
    expect(s.afterResponse).not.toHaveBeenCalled();
  });

  it('B8E5/K8: a verified active account with the same email takes the identity, the user is mailed, the session is Google', async () => {
    const result = await call(await approve(s));
    expect(s.created).toEqual([{ userId: USER, provider: 'google', subject: 'sub-1' }]);
    expect(result.session).toBe(s.session);
    expect(s.afterResponse).toHaveBeenCalledTimes(1);
    const mail = await (s.afterResponse.mock.calls[0][1] as Array<() => Promise<{ to: string }>>)[0]!();
    expect(mail.to).toBe('lan@gmail.com');
  });

  it('B8E58 (D26): an address that is not Gmail links the same way (recorded as the accepted behaviour)', async () => {
    s = setup({ byEmail: { email: 'ketoan@congty.vn' } });
    const result = await call(await approve(s, { email: 'ketoan@congty.vn' }));
    expect(result.session).toBe(s.session);
    expect(s.created).toHaveLength(1);
  });

  it.each([['locked', 'account-locked'], ['deleting', 'google-failed']])('B8E11/B8E48: a verified %s account with the same email → %s and no identity', async (status, error) => {
    s = setup({ byEmail: { status } });
    const result = await call(await approve(s));
    expect(result.location).toBe(`${WEB}/vi/app/login?error=${error}`);
    expect(s.created).toEqual([]);
    expect(s.sessions.startChain).not.toHaveBeenCalled();
  });

  it('an identity found by sub whose user is locked → account-locked; deleting → google-failed; no session', async () => {
    for (const [status, error] of [['locked', 'account-locked'], ['deleting', 'google-failed']]) {
      s = setup({ bySub: { userId: USER }, userStatus: status });
      expect((await call(await approve(s))).location).toBe(`${WEB}/vi/app/login?error=${error}`);
      expect(s.sessions.startChain).not.toHaveBeenCalled();
    }
  });

  it('IR6/B8E11: the login lockout of the password path (10 wrong passwords) does not block Google', async () => {
    s = setup({ bySub: { userId: USER }, byEmail: { loginLockedUntil: new Date(clock.now().getTime() + 900_000) } as never });
    expect((await call(await approve(s))).session).toBe(s.session);
  });

  it('P13: the matching user already has a Google identity with another sub → google-failed, no identity, no 500, logged with the id only', async () => {
    s = setup({ byEmail: { identities: [{ provider: 'google' }] } });
    const result = await call(await approve(s, { sub: 'another-sub' }));
    expect(result.location).toBe(`${WEB}/vi/app/login?error=google-failed`);
    expect(s.created).toEqual([]);
    expect(s.logs.find((l) => l.event === 'google_link_conflict')).toMatchObject({ user_id: USER });
    expect(JSON.stringify(s.logs)).not.toContain('lan@gmail.com');
  });

  it('a unique-violation from a concurrent link → google-failed, not an exception', async () => {
    s.prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    expect((await call(await approve(s))).location).toBe(`${WEB}/vi/app/login?error=google-failed`);
  });

  it('a new person (no account, or one that never verified) gets a sealed google_signup ticket and no row is written (D6)', async () => {
    for (const byEmail of [null, { emailVerifiedAt: null }]) {
      s = setup({ byEmail });
      const result = await call(await approve(s, { sub: 'new-sub', email: 'Minh@Gmail.com', givenName: 'Minh', picture: 'https://p/1.png' }, '/vi/app/groups'));
      expect(result.location).toBe(`${WEB}/vi/app/google/complete`);
      expect(result.session).toBeUndefined();
      const ticket = openJson<SignupTicket>(result.signupCookie, KEY, clock.now())!;
      expect(ticket).toMatchObject({ sub: 'new-sub', email: 'minh@gmail.com', givenName: 'Minh', picture: 'https://p/1.png', locale: 'vi', next: '/vi/app/groups' });
      expect(s.prisma.$transaction).not.toHaveBeenCalled();
      expect(s.prisma.user.create).not.toHaveBeenCalled();
    }
  });

  it('the status is read again under the user lock: a user locked between the lookup and the lock gets no session', async () => {
    s = setup({ bySub: { userId: USER } });
    s.setStatus('locked');
    expect((await call(await approve(s))).location).toBe(`${WEB}/vi/app/login?error=account-locked`);
  });
});
