import { Inject, Injectable } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { normalizeEmail } from '../../common/email/normalize-email.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { MailDispatcher, sendPrepared } from '../../common/mail/mail-dispatcher.service.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { dateValue, localDate } from '../../common/time/local-date.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { MIN_AGE, isOldEnough, optionalPersonNameSchema, personNameSchema } from '../profile/person.js';
import { canonicalTimeZone } from '../profile/timezone.js';
import type { GoogleCompleteBody } from './google.schemas.js';
import { googleLinkedMail } from '../mailer/templates.js';
import { SessionService, type IssuedSession } from '../sessions/session.service.js';
import { withUserLock } from '../user-lock.js';
import { GoogleClient, GoogleExchangeError, s256, type GoogleIdentity } from './google-client.js';
import { parseLocale, safeNext, toLearnerApp, type Locale } from './learner-redirect.js';
import { openJson, sealJson } from './sealed-cookie.js';

export const OAUTH_COOKIE_TTL_S = 600;
export const SIGNUP_COOKIE_TTL_S = 900;

/** Inside the sealed `google_oauth` cookie (design §5.3). */
export type OAuthState = {
  state: string; nonce: string; codeVerifier: string; intent: 'login' | 'reauth'; locale: Locale; next: string; ticketUserId?: string;
};
/** Inside the sealed `google_signup` cookie (design §5.4): what a new person gets asked to complete. Nothing is in the database yet. */
export type SignupTicket = {
  sub: string; email: string; givenName?: string; familyName?: string; picture?: string; locale: Locale; next: string;
};

export const REAUTH_COOKIE_TTL_S = 300;
export const REAUTH_TICKET_TTL_S = 120;

/** The ticket in `start_url` (design §5.9): who is asking to confirm, sealed for two minutes. */
export type ReauthTicket = { userId: string };

export type StartResult = { location: string; oauthCookie: string | null };
/** What the controller turns into cookies and one 302. `location` is always absolute. */
export type CallbackResult = {
  location: string;
  /** Set a `google_signup` cookie with this sealed value. */
  signupCookie?: string;
  /** Start the web session (sets the `refresh_token` cookie). */
  session?: IssuedSession;
  /** Set a `google_reauth` cookie with this sealed value (the person proved the Google account before deleting, D25). */
  reauthCookie?: string;
};

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };
const SIGNUP_COOKIE_CLEAR = { httpOnly: true, secure: true, sameSite: 'lax', path: '/v1/auth/google' } as const;

/** A Google name only counts when it passes the rules of a name here (NFC, 1–50 characters, no control characters). */
const validGivenName = (value: string | undefined): string | undefined => {
  const parsed = personNameSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
};
const validFamilyName = (value: string | undefined): string | undefined => {
  const parsed = optionalPersonNameSchema.safeParse(value ?? null);
  return parsed.success && parsed.data !== null ? parsed.data : undefined;
};
const emailTaken = () => new ProblemDetailsException({ status: 409, title: 'Email taken', type: 'email-taken' });

/** Google sign-in: start, then the callback's decision table (design §5.3, §5.4). */
@Injectable()
export class GoogleAuthService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(AppLogger) private readonly logger: AppLogger,
    @Inject(GoogleClient) private readonly google: GoogleClient,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(MailDispatcher) private readonly dispatcher: MailDispatcher,
  ) {}

  private web(path: string, params: Record<string, string> = {}): string {
    return toLearnerApp(this.config.learnerAppUrl, path, params);
  }

  /** A reauth trip that fails returns to the delete page, not the login page. */
  private fail(locale: Locale, error: string, intent?: 'login' | 'reauth'): CallbackResult {
    if (intent === 'reauth') return { location: this.web(`/${locale}/app/settings/delete-account`, { reauth: 'failed' }) };
    return { location: this.web(`/${locale}/app/login`, { error }) };
  }

  /**
   * Where the browser goes when the Google routes are rate limited (final review M8): a 429 JSON page is a dead end for someone who
   * only pressed a button, and many people behind one Wi-Fi share an address. The language and trip kind come from the query on
   * `start`, or from the sealed state cookie on `callback`.
   */
  busy(input: { locale?: unknown; intent?: unknown; oauthCookie?: string }): CallbackResult {
    const key = this.config.google.cookieKey;
    const saved = key ? openJson<OAuthState>(input.oauthCookie, key, 'oauth-state', this.clock.now()) : null;
    if (saved) return this.fail(saved.locale, 'google-busy', saved.intent);
    return this.fail(parseLocale(input.locale), 'google-busy', input.intent === 'reauth' ? 'reauth' : 'login');
  }

  async start(input: { locale?: unknown; next?: unknown; intent?: unknown; ticket?: unknown }): Promise<StartResult> {
    const locale = parseLocale(input.locale);
    const { google } = this.config;
    const reauth = input.intent === 'reauth';
    const deletePage = (reauthResult: string) => this.web(`/${locale}/app/settings/delete-account`, { reauth: reauthResult });
    if (google.mode === 'off' || google.cookieKey === null) {
      return { location: reauth ? deletePage('failed') : this.web(`/${locale}/app/login`, { error: 'google-unavailable' }), oauthCookie: null };
    }
    let loginHint: string | undefined;
    let ticketUserId: string | undefined;
    if (reauth) {
      const ticket = typeof input.ticket === 'string' ? openJson<ReauthTicket>(input.ticket, google.cookieKey, 'reauth-ticket', this.clock.now()) : null;
      const identity = ticket
        ? await this.prisma.userIdentity.findFirst({ where: { userId: ticket.userId, provider: 'google' }, select: { subject: true } }) : null;
      if (!ticket || !identity) return { location: deletePage('failed'), oauthCookie: null };
      ticketUserId = ticket.userId;
      loginHint = identity.subject;
    }
    const state: OAuthState = {
      state: randomBytes(24).toString('base64url'), nonce: randomBytes(24).toString('base64url'),
      codeVerifier: randomBytes(48).toString('base64url'), intent: reauth ? 'reauth' : 'login', locale,
      next: reauth ? `/${locale}/app/settings/delete-account` : safeNext(input.next, locale, this.config.learnerAppUrl),
      ...(ticketUserId ? { ticketUserId } : {}),
    };
    return {
      oauthCookie: sealJson(state, OAUTH_COOKIE_TTL_S, google.cookieKey, 'oauth-state', this.clock.now()),
      location: this.google.authorizeUrl({
        state: state.state, nonce: state.nonce, codeChallenge: s256(state.codeVerifier), prompt: 'select_account', loginHint,
      }),
    };
  }

  /** `POST /v1/auth/google/reauth` (Bearer): the URL the web sends the browser to, because a page change loses the in-memory token (design §5.9). */
  async reauthStartUrl(userId: string, localeInput: unknown): Promise<string> {
    const { google } = this.config;
    if (google.mode === 'off' || google.cookieKey === null || google.apiOrigin === null) {
      throw new ProblemDetailsException({ status: 409, title: 'Google unavailable', type: 'google-unavailable' });
    }
    const linked = await this.prisma.userIdentity.findFirst({ where: { userId, provider: 'google' }, select: { id: true } });
    if (!linked) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    const url = new URL('/v1/auth/google/start', google.apiOrigin);
    url.search = new URLSearchParams({
      intent: 'reauth', locale: parseLocale(localeInput),
      ticket: sealJson({ userId } satisfies ReauthTicket, REAUTH_TICKET_TTL_S, google.cookieKey, 'reauth-ticket', this.clock.now()),
    }).toString();
    return url.toString();
  }

  /** The user a valid `google_reauth` cookie names, or null (none, tampered or past five minutes: B8E19). */
  reauthUserOf(cookie: string | undefined): string | null {
    const key = this.config.google.cookieKey;
    return key ? openJson<ReauthTicket>(cookie, key, 'reauth-proof', this.clock.now())?.userId ?? null : null;
  }

  /** `error`: Google sent the browser back with `error=…` (the person pressed cancel). */
  async callback(input: { code?: unknown; state?: unknown; error?: unknown; oauthCookie?: string }, res: Response): Promise<CallbackResult> {
    const key = this.config.google.cookieKey;
    const saved = key ? openJson<OAuthState>(input.oauthCookie, key, 'oauth-state', this.clock.now()) : null;
    const locale = saved?.locale ?? 'vi';
    const fail = (error: string): CallbackResult => this.fail(locale, error, saved?.intent);
    if (!saved || typeof input.state !== 'string' || input.state !== saved.state || typeof input.code !== 'string' || input.code === '' || input.error !== undefined) {
      return fail('google-failed');
    }
    let identity: GoogleIdentity;
    try {
      identity = await this.google.exchange(input.code, saved.codeVerifier, saved.nonce);
    } catch (error) {
      // GoogleExchangeError messages never carry the code or the secret.
      this.logger.warn('google_exchange_failed', { reason: error instanceof GoogleExchangeError ? 'exchange' : 'unexpected' });
      return fail('google-failed');
    }
    if (saved.intent === 'reauth') return this.reauth(saved, identity);
    if (!identity.emailVerified) return fail('google-email-unverified');
    const email = normalizeEmail(identity.email);
    if (email === null) return fail('google-failed');
    return this.decide(saved, identity, email, res);
  }

  /** D25: the Google account chosen must be the one linked to the person who asked to delete. */
  private async reauth(saved: OAuthState, identity: GoogleIdentity): Promise<CallbackResult> {
    const back = (reauth: string) => ({ location: this.web(`/${saved.locale}/app/settings/delete-account`, { reauth }) });
    const bySub = await this.prisma.userIdentity.findUnique({
      where: { provider_subject: { provider: 'google', subject: identity.sub } }, select: { userId: true, user: { select: { status: true } } },
    });
    if (!bySub || saved.ticketUserId === undefined || bySub.userId !== saved.ticketUserId || bySub.user.status !== 'active') {
      return back('wrong-account');
    }
    return {
      ...back('ok'),
      reauthCookie: sealJson({ userId: bySub.userId } satisfies ReauthTicket, REAUTH_COOKIE_TTL_S, this.config.google.cookieKey!, 'reauth-proof', this.clock.now()),
    };
  }

  private async decide(saved: OAuthState, identity: GoogleIdentity, email: string, res: Response): Promise<CallbackResult> {
    const { locale } = saved;
    const bySub = await this.prisma.userIdentity.findUnique({
      where: { provider_subject: { provider: 'google', subject: identity.sub } }, select: { userId: true, user: { select: { status: true } } },
    });
    if (bySub) return this.signIn(saved, bySub.userId, null, res);

    const byEmail = await this.prisma.user.findUnique({
      where: { email }, select: { id: true, status: true, emailVerifiedAt: true, identities: { select: { provider: true } } },
    });
    if (byEmail && byEmail.emailVerifiedAt !== null) {
      if (byEmail.status === 'locked') return this.fail(locale, 'account-locked');
      if (byEmail.status !== 'active') return this.fail(locale, 'google-failed');
      if (byEmail.identities.length > 0) {
        // The same address already belongs to another Google account (P13): link nothing.
        this.logger.warn('google_link_conflict', { user_id: byEmail.id });
        return this.fail(locale, 'google-failed');
      }
      // K8: an existing verified account with the same address takes the Google identity.
      return this.signIn(saved, byEmail.id, { sub: identity.sub, email }, res);
    }
    // No account, or one that never verified its email: the person completes sign-up first; nothing is written now (D6).
    const key = this.config.google.cookieKey!;
    const ticket: SignupTicket = {
      sub: identity.sub, email, givenName: identity.givenName, familyName: identity.familyName, picture: identity.picture,
      locale, next: saved.next,
    };
    return {
      location: this.web(`/${locale}/app/google/complete`),
      signupCookie: sealJson(ticket, SIGNUP_COOKIE_TTL_S, key, 'signup', this.clock.now()),
    };
  }

  /** `GET /v1/auth/google/complete`: what the sign-up page needs to show. */
  completeInfo(signupCookie: string | undefined): { email: string; needs_name: boolean } {
    const ticket = this.openTicket(signupCookie);
    return { email: ticket.email, needs_name: validGivenName(ticket.givenName) === undefined };
  }

  /**
   * `POST /v1/auth/google/complete` (design §5.5): the person added birth date, consent and, when Google sent none, a name. Only now is
   * anything written. A user under 13 gets nothing stored and the ticket is cleared (B8E9).
   */
  async complete(signupCookie: string | undefined, body: GoogleCompleteBody, res: Response): Promise<IssuedSession> {
    const ticket = this.openTicket(signupCookie);
    const validation = (extensions?: Record<string, unknown>) =>
      new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed', extensions });
    const timezone = canonicalTimeZone(body.timezone);
    if (timezone === null) throw validation();
    const today = localDate(timezone, this.clock.now());
    if (body.birth_date > today) throw validation();
    if (!isOldEnough(body.birth_date, today, MIN_AGE)) {
      this.logger.info('register_rejected_age', { reason: 'below-minimum' });
      res.clearCookie('google_signup', SIGNUP_COOKIE_CLEAR);
      throw new ProblemDetailsException({ status: 400, title: 'Age below minimum', type: 'age-below-minimum' });
    }
    const givenName = validGivenName(ticket.givenName) ?? body.given_name;
    if (givenName === undefined) throw validation({ violations: ['given_name'] });
    const familyName = validFamilyName(ticket.familyName) ?? body.family_name ?? null;
    const picture = typeof ticket.picture === 'string' && ticket.picture.length <= 2048 && /^https?:\/\//i.test(ticket.picture) ? ticket.picture : null;
    const known = await this.prisma.user.findUnique({ where: { email: ticket.email }, select: { id: true } });
    const userId = known?.id ?? randomUUID();
    let session: IssuedSession;
    try {
      session = await this.prisma.$transaction(async (tx) => {
        await withUserLock(tx, userId);
        const now = this.clock.now();
        const profile = {
          timezone, givenName, familyName, birthDate: dateValue(body.birth_date), termsAcceptedAt: now,
          termsVersion: this.config.termsVersion, avatarUrl: picture, emailVerifiedAt: now,
        };
        const existing = await tx.user.findUnique({ where: { email: ticket.email }, select: { id: true, status: true, emailVerifiedAt: true } });
        if (!existing) {
          // The unverified account we read outside was deleted meanwhile (clean-up or an admin): its id is in `deleted_accounts`, so a new user must not take it (final review I1).
          if (known) throw emailTaken();
          await tx.user.create({ data: { id: userId, email: ticket.email, ...profile, createdAt: now, updatedAt: now } });
        } else {
          // Someone created the account between our two reads, or verified it meanwhile (B8E10).
          if (existing.id !== userId || existing.emailVerifiedAt !== null) throw emailTaken();
          if (existing.status === 'locked') throw new ProblemDetailsException({ status: 403, title: 'Account locked', type: 'account-locked' });
          if (existing.status !== 'active') throw emailTaken();
          // An unverified account holds no learning data (it never had a session): reuse its id as a fresh sign-up (I15, B8E6).
          const updated = await tx.user.updateMany({
            where: { id: userId, emailVerifiedAt: null, status: 'active' },
            data: { ...profile, failedLoginCount: 0, loginLockedUntil: null, updatedAt: now },
          });
          if (updated.count === 0) throw emailTaken();
          await tx.passwordCredential.deleteMany({ where: { userId } });
          await tx.otpCode.updateMany({ where: { userId, consumedAt: null, invalidatedAt: null }, data: { invalidatedAt: now } });
          await this.sessions.revokeAllForUser(tx, userId, 'google-signup');
        }
        await tx.userIdentity.create({ data: { userId, provider: 'google', subject: ticket.sub } });
        return this.sessions.startChain(tx, { userId, client: 'web', authMethod: 'google' });
      }, transactionOptions);
    } catch (error) {
      // A verified account appeared meanwhile, or this Google account was completed twice (unique violation): the address is taken.
      if ((error as { code?: string } | null)?.code === 'P2002') throw emailTaken();
      throw error;
    }
    res.clearCookie('google_signup', SIGNUP_COOKIE_CLEAR);
    this.logger.info('google_signup_completed', { user_id: userId });
    return session;
  }

  private openTicket(cookie: string | undefined): SignupTicket {
    const key = this.config.google.cookieKey;
    const ticket = key ? openJson<SignupTicket>(cookie, key, 'signup', this.clock.now()) : null;
    if (!ticket) throw new ProblemDetailsException({ status: 401, title: 'Invalid token', type: 'invalid-token' });
    return ticket;
  }

  /** Locks the user, re-reads the status, optionally links the identity, and opens a Google session. */
  private async signIn(saved: OAuthState, userId: string, link: { sub: string; email: string } | null, res: Response): Promise<CallbackResult> {
    const { locale } = saved;
    type Outcome = { kind: 'ok'; session: IssuedSession } | { kind: 'refused'; error: string };
    let outcome: Outcome;
    try {
      outcome = await this.prisma.$transaction(async (tx): Promise<Outcome> => {
        await withUserLock(tx, userId);
        const user = await tx.user.findUnique({ where: { id: userId }, select: { status: true, email: true } });
        if (!user) return { kind: 'refused', error: 'google-failed' };
        if (user.status === 'locked') return { kind: 'refused', error: 'account-locked' };
        if (user.status !== 'active') return { kind: 'refused', error: 'google-failed' };
        if (link) await tx.userIdentity.create({ data: { userId, provider: 'google', subject: link.sub } });
        return { kind: 'ok', session: await this.sessions.startChain(tx, { userId, client: 'web', authMethod: 'google' }) };
      }, transactionOptions);
    } catch (error) {
      // A concurrent sign-in linked the same identity first (unique violation): the person can just try again.
      this.logger.warn('google_sign_in_failed', { user_id: userId, db_error: (error as { code?: string } | null)?.code });
      return this.fail(locale, 'google-failed');
    }
    if (outcome.kind === 'refused') return this.fail(locale, outcome.error);
    if (link) {
      this.logger.info('google_identity_linked', { user_id: userId });
      this.dispatcher.afterResponse(res, [sendPrepared(googleLinkedMail(link.email))]);
    }
    return { location: this.web(saved.next, { signed_in: 'google' }), session: outcome.session };
  }
}
