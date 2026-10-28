import { randomBytes, randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { AppConfig } from '../../common/config/app-config.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import type { MailDispatcher } from '../../common/mail/mail-dispatcher.service.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { testConfig } from '../../../test/support/test-config.js';
import type { SessionService } from '../sessions/session.service.js';
import { FakeGoogleClient, type FakeAccount } from './google-client.fake.js';
import { GoogleExchangeError, s256 } from './google-client.js';
import { GoogleAuthService, type OAuthState, type ReauthTicket } from './google-auth.service.js';
import { openJson, sealJson } from './sealed-cookie.js';

const clock = new FakeClock(new Date('2026-10-29T12:00:00Z'));
const KEY = randomBytes(32);
const REDIRECT = 'http://localhost:3000/v1/auth/google/callback';
const WEB = 'http://localhost:3001';
const LAN = randomUUID();
const config: AppConfig = {
  ...testConfig(), google: { mode: 'fake', clientId: null, clientSecret: null, redirectUri: REDIRECT, apiOrigin: 'http://localhost:3000', cookieKey: KEY },
};
const res = {} as Response;

function setup(opts: { linked?: boolean; subOwner?: string | null; subStatus?: string } = {}) {
  const fake = new FakeGoogleClient(config.google, () => clock.now());
  const prisma = {
    userIdentity: {
      findFirst: vi.fn(async () => (opts.linked === false ? null : { subject: 'sub-lan', id: 'i1' })),
      findUnique: vi.fn(async () => (opts.subOwner === null ? null : { userId: opts.subOwner ?? LAN, user: { status: opts.subStatus ?? 'active' } })),
    },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
  const service = new GoogleAuthService(
    prisma as unknown as PrismaClient, config, clock, new AppLogger({ write: vi.fn() }), fake,
    {} as SessionService, { afterResponse: vi.fn() } as unknown as MailDispatcher,
  );
  return { service, fake, prisma };
}
const ticket = (userId = LAN, at = clock.now()) => sealJson({ userId } satisfies ReauthTicket, 120, KEY, at);

async function trip(s: ReturnType<typeof setup>, account: Partial<FakeAccount> = {}, userId = LAN) {
  const started = await s.service.start({ intent: 'reauth', locale: 'vi', ticket: ticket(userId) });
  const saved = openJson<OAuthState>(started.oauthCookie!, KEY, clock.now())!;
  const back = new URL(s.fake.issueCode({
    account: { email: 'lan@gmail.com', sub: 'sub-lan', ...account }, state: saved.state, nonce: saved.nonce,
    codeChallenge: s256(saved.codeVerifier), redirectUri: REDIRECT,
  }));
  return { started, saved, cookie: started.oauthCookie!, code: back.searchParams.get('code')!, state: back.searchParams.get('state')! };
}

describe('Google reauth before deleting (D25)', () => {
  it('reauthStartUrl is absolute on the API origin and carries a sealed 2-minute ticket of the caller', async () => {
    const s = setup();
    const url = new URL(await s.service.reauthStartUrl(LAN, 'en'));
    expect(url.origin + url.pathname).toBe('http://localhost:3000/v1/auth/google/start');
    expect(url.searchParams.get('intent')).toBe('reauth');
    expect(url.searchParams.get('locale')).toBe('en');
    const t = url.searchParams.get('ticket')!;
    expect(openJson<ReauthTicket>(t, KEY, clock.now())).toEqual({ userId: LAN });
    expect(openJson<ReauthTicket>(t, KEY, new Date(clock.now().getTime() + 121_000))).toBeNull();
  });

  it('a user with no Google identity cannot start a reauth (404); Google off is 409 google-unavailable', async () => {
    await expect(setup({ linked: false }).service.reauthStartUrl(LAN, 'vi')).rejects.toMatchObject({ status: 404 });
    const off = new GoogleAuthService({ userIdentity: { findFirst: vi.fn() } } as unknown as PrismaClient,
      { ...config, google: { ...config.google, mode: 'off' } }, clock, new AppLogger({ write: vi.fn() }), new FakeGoogleClient(config.google),
      {} as SessionService, {} as MailDispatcher);
    await expect(off.reauthStartUrl(LAN, 'vi')).rejects.toMatchObject({ status: 409, problemType: 'google-unavailable' });
  });

  it('start with intent reauth seals the ticket user in the oauth state and sends prompt select_account with login_hint = the linked sub', async () => {
    const s = setup();
    const { started, saved } = await trip(s);
    expect(saved).toMatchObject({ intent: 'reauth', ticketUserId: LAN, next: '/vi/app/settings/delete-account' });
    expect(new URL(started.location).searchParams.get('login_hint')).toBe('sub-lan');
  });

  it('a missing, expired or foreign ticket → back to the delete page with reauth=failed, no cookie', async () => {
    const s = setup();
    const expired = ticket(LAN, new Date(clock.now().getTime() - 200_000));
    for (const bad of [undefined, 'garbage', expired]) {
      expect(await s.service.start({ intent: 'reauth', locale: 'vi', ticket: bad })).toEqual({ location: `${WEB}/vi/app/settings/delete-account?reauth=failed`, oauthCookie: null });
    }
    expect((await setup({ linked: false }).service.start({ intent: 'reauth', locale: 'vi', ticket: ticket() })).oauthCookie).toBeNull();
  });

  it('B8A5: the right Google account → reauth=ok on the delete page and a sealed 5-minute google_reauth cookie for that user', async () => {
    const s = setup();
    const x = await trip(s);
    const result = await s.service.callback({ code: x.code, state: x.state, oauthCookie: x.cookie }, res);
    expect(result.location).toBe(`${WEB}/vi/app/settings/delete-account?reauth=ok`);
    expect(s.service.reauthUserOf(result.reauthCookie)).toBe(LAN);
    expect(openJson(result.reauthCookie, KEY, new Date(clock.now().getTime() + 301_000))).toBeNull();
    expect(result.session).toBeUndefined();
  });

  it('B8E20: another Google account (sub of someone else, or unknown) → reauth=wrong-account and no cookie', async () => {
    for (const subOwner of [randomUUID(), null]) {
      const s = setup({ subOwner });
      const x = await trip(s, { sub: 'other-sub' });
      const result = await s.service.callback({ code: x.code, state: x.state, oauthCookie: x.cookie }, res);
      expect(result.location).toBe(`${WEB}/vi/app/settings/delete-account?reauth=wrong-account`);
      expect(result.reauthCookie).toBeUndefined();
    }
  });

  it('a Google error or a bad state during a reauth trip returns to the delete page (reauth=failed), not the login page', async () => {
    const s = setup();
    const x = await trip(s);
    vi.spyOn(s.fake, 'exchange').mockRejectedValueOnce(new GoogleExchangeError('timeout'));
    expect((await s.service.callback({ code: x.code, state: x.state, oauthCookie: x.cookie }, res)).location)
      .toBe(`${WEB}/vi/app/settings/delete-account?reauth=failed`);
    expect((await s.service.callback({ code: x.code, state: 'other', oauthCookie: x.cookie }, res)).location)
      .toBe(`${WEB}/vi/app/settings/delete-account?reauth=failed`);
  });

  it('B8E19: no cookie, a tampered one or an expired one names nobody', () => {
    const s = setup();
    const old = sealJson({ userId: LAN }, 300, KEY, new Date(clock.now().getTime() - 301_000));
    for (const bad of [undefined, 'garbage', old]) expect(s.service.reauthUserOf(bad)).toBeNull();
  });
});
