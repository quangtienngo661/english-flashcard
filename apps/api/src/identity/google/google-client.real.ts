import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';
import type { AppConfig } from '../../common/config/app-config.js';
import {
  GoogleClient, GoogleExchangeError, verifyGoogleIdToken, type AuthorizeParams, type GoogleIdentity,
} from './google-client.js';

// Google's discovery document (https://accounts.google.com/.well-known/openid-configuration, read 29/10/2026) names these three.
const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs';
const TOKEN_TIMEOUT_MS = 10_000;

export type RealGoogleClientDeps = { fetch?: typeof fetch; jwks?: JWTVerifyGetKey; now?: () => Date };

/** The real Google over `fetch` and `jose`; nothing is sent to Google but the code exchange (spec IE15: 10 s, no retry). */
export class RealGoogleClient extends GoogleClient {
  private readonly fetchImpl: typeof fetch;
  private readonly jwks: JWTVerifyGetKey;
  private readonly now: () => Date;

  constructor(private readonly config: AppConfig['google'], deps: RealGoogleClientDeps = {}) {
    super();
    this.fetchImpl = deps.fetch ?? fetch;
    this.jwks = deps.jwks ?? createRemoteJWKSet(new URL(JWKS_URI));
    this.now = deps.now ?? (() => new Date());
  }

  authorizeUrl(params: AuthorizeParams): string {
    const url = new URL(AUTHORIZATION_ENDPOINT);
    url.search = new URLSearchParams({
      client_id: this.config.clientId ?? '', redirect_uri: this.config.redirectUri ?? '', response_type: 'code',
      scope: 'openid email profile', state: params.state, nonce: params.nonce,
      code_challenge: params.codeChallenge, code_challenge_method: 'S256', prompt: params.prompt,
      ...(params.loginHint ? { login_hint: params.loginHint } : {}),
    }).toString();
    return url.toString();
  }

  async exchange(code: string, codeVerifier: string, nonce: string): Promise<GoogleIdentity> {
    let idToken: unknown;
    try {
      const response = await this.fetchImpl(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code, client_id: this.config.clientId ?? '', client_secret: this.config.clientSecret ?? '',
          redirect_uri: this.config.redirectUri ?? '', grant_type: 'authorization_code', code_verifier: codeVerifier,
        }).toString(),
        signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`token endpoint answered ${response.status}`);
      idToken = ((await response.json()) as { id_token?: unknown }).id_token;
    } catch (error) {
      // The message can name the endpoint but never carries the code or the secret.
      throw new GoogleExchangeError(error instanceof Error ? error.message : 'token request failed');
    }
    if (typeof idToken !== 'string') throw new GoogleExchangeError('no id_token in the token response');
    return verifyGoogleIdToken(idToken, this.jwks, { audience: this.config.clientId ?? '', nonce, now: this.now() });
  }
}
