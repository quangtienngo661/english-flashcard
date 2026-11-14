import { jwtVerify, type JWTVerifyGetKey } from 'jose';
import { createHash } from 'node:crypto';

/** What the callback needs from a verified Google ID token (design §5.4). */
export type GoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
  name?: string;
  picture?: string;
};

export type AuthorizeParams = {
  state: string;
  nonce: string;
  codeChallenge: string;
  prompt: 'select_account';
  loginHint?: string;
};

/** Raised for every failure on the way to a verified identity (network, timeout, rejected code, bad token): the callback answers `google-failed`. */
export class GoogleExchangeError extends Error {}

/** The port between the sign-in flow and Google. The real client talks to Google; the fake serves tests and the smoke (design §5.8). */
export abstract class GoogleClient {
  /** Where the browser is sent to choose a Google account. */
  abstract authorizeUrl(params: AuthorizeParams): string;
  /** Exchanges the one-time `code` (with the PKCE verifier) for a verified identity; checks `nonce`. Throws `GoogleExchangeError`. */
  abstract exchange(code: string, codeVerifier: string, nonce: string): Promise<GoogleIdentity>;
}

export const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

/** PKCE S256: base64url(sha256(verifier)). */
export function s256(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier).digest('base64url');
}

/**
 * Verifies the ID token: signature through `getKey`, issuer, audience, expiry, nonce (design §5.4 step 3). `email_verified` is
 * accepted as the boolean `true` or the string `"true"`, because Google's own examples show the string form.
 */
export async function verifyGoogleIdToken(
  idToken: string, getKey: JWTVerifyGetKey, expected: { audience: string; nonce: string; now: Date },
): Promise<GoogleIdentity> {
  try {
    const { payload } = await jwtVerify(idToken, getKey, {
      issuer: GOOGLE_ISSUERS, audience: expected.audience, currentDate: expected.now, algorithms: ['RS256', 'ES256'],
    });
    if (payload.nonce !== expected.nonce) throw new Error('nonce mismatch');
    if (typeof payload.sub !== 'string' || payload.sub === '' || typeof payload.email !== 'string' || payload.email === '') {
      throw new Error('missing sub or email');
    }
    const str = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value : undefined);
    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      givenName: str(payload.given_name), familyName: str(payload.family_name), name: str(payload.name), picture: str(payload.picture),
    };
  } catch (error) {
    throw new GoogleExchangeError(error instanceof Error ? error.message : 'invalid id token');
  }
}
