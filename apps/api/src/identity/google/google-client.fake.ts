import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK, type JWTVerifyGetKey } from 'jose';
import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../../common/config/app-config.js';
import {
  GoogleClient, GoogleExchangeError, s256, verifyGoogleIdToken, type AuthorizeParams, type GoogleIdentity,
} from './google-client.js';

const FAKE_CLIENT_ID = 'fake-google-client';
const CODE_TTL_MS = 5 * 60_000;

/** The account a test (or a person on the fake page) picks. */
export type FakeAccount = {
  email: string; sub: string; emailVerified?: boolean; name?: string; givenName?: string; familyName?: string; picture?: string;
};

type Pending = { account: FakeAccount; nonce: string; codeChallenge: string; expiresAt: number };

/**
 * Google for CI, the smoke and the browser pass (design §5.8, only when `GOOGLE_FAKE_ENABLED`). It signs ID tokens with a key made
 * at start-up and checks them with `createLocalJWKSet`; like Google it refuses a `code_verifier` that does not match the challenge.
 */
export class FakeGoogleClient extends GoogleClient {
  private readonly codes = new Map<string, Pending>();
  private keys: Promise<{ privateKey: CryptoKey; jwks: JWTVerifyGetKey }> | null = null;

  constructor(private readonly config: AppConfig['google'], private readonly now: () => Date = () => new Date()) {
    super();
  }

  /** The fake account page; the real flow has Google's own page here. */
  authorizeUrl(params: AuthorizeParams): string {
    const url = new URL('/v1/dev/google/authorize', this.config.apiOrigin ?? 'http://localhost:3000');
    url.search = new URLSearchParams({
      state: params.state, nonce: params.nonce, code_challenge: params.codeChallenge,
      redirect_uri: this.config.redirectUri ?? '', ...(params.loginHint ? { login_hint: params.loginHint } : {}),
    }).toString();
    return url.toString();
  }

  /** Called by the fake page once an account is chosen: remembers the code and returns the callback URL to send the browser to. */
  issueCode(input: { account: FakeAccount; state: string; nonce: string; codeChallenge: string; redirectUri: string }): string {
    this.pruneExpired();
    const code = `fake-${randomUUID()}`;
    this.codes.set(code, { account: input.account, nonce: input.nonce, codeChallenge: input.codeChallenge, expiresAt: this.now().getTime() + CODE_TTL_MS });
    const url = new URL(input.redirectUri);
    url.searchParams.set('code', code);
    url.searchParams.set('state', input.state);
    return url.toString();
  }

  async exchange(code: string, codeVerifier: string, nonce: string): Promise<GoogleIdentity> {
    const pending = this.codes.get(code);
    this.codes.delete(code);
    if (!pending || pending.expiresAt <= this.now().getTime()) throw new GoogleExchangeError('unknown or expired code');
    if (s256(codeVerifier) !== pending.codeChallenge) throw new GoogleExchangeError('code_verifier does not match the challenge');
    const { privateKey, jwks } = await this.keyMaterial();
    const { account } = pending;
    const now = Math.floor(this.now().getTime() / 1000);
    const idToken = await new SignJWT({
      email: account.email, email_verified: account.emailVerified ?? true, nonce: pending.nonce,
      ...(account.name ? { name: account.name } : {}), ...(account.givenName ? { given_name: account.givenName } : {}),
      ...(account.familyName ? { family_name: account.familyName } : {}), ...(account.picture ? { picture: account.picture } : {}),
    }).setProtectedHeader({ alg: 'RS256', kid: 'fake-google-key' }).setIssuer('https://accounts.google.com').setAudience(FAKE_CLIENT_ID)
      .setSubject(account.sub).setIssuedAt(now).setExpirationTime(now + 3600).sign(privateKey);
    return verifyGoogleIdToken(idToken, jwks, { audience: FAKE_CLIENT_ID, nonce, now: this.now() });
  }

  private keyMaterial(): Promise<{ privateKey: CryptoKey; jwks: JWTVerifyGetKey }> {
    this.keys ??= generateKeyPair('RS256').then(async ({ privateKey, publicKey }) => {
      const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'fake-google-key', alg: 'RS256', use: 'sig' };
      return { privateKey, jwks: createLocalJWKSet({ keys: [jwk] }) };
    });
    return this.keys;
  }

  private pruneExpired(): void {
    const now = this.now().getTime();
    for (const [code, pending] of this.codes) if (pending.expiresAt <= now) this.codes.delete(code);
  }
}
