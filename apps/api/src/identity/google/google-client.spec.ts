import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';
import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../../common/config/app-config.js';
import { FakeGoogleClient } from './google-client.fake.js';
import { GoogleExchangeError, s256 } from './google-client.js';
import { RealGoogleClient } from './google-client.real.js';

const NOW = new Date('2026-10-29T12:00:00Z');
const CLIENT_ID = 'client-123.apps.googleusercontent.com';
const config: AppConfig['google'] = {
  mode: 'real', clientId: CLIENT_ID, clientSecret: 'sekret', redirectUri: 'https://api.example.com/v1/auth/google/callback',
  apiOrigin: 'https://api.example.com', cookieKey: null,
};

async function realSetup(claims: Record<string, unknown> = {}, opts: { issuer?: string; audience?: string; expiresIn?: number; fetchImpl?: typeof fetch } = {}) {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'k', alg: 'RS256' };
  const sign = () => new SignJWT({ email: 'lan@gmail.com', email_verified: true, nonce: 'n-1', ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'k' }).setIssuer(opts.issuer ?? 'https://accounts.google.com')
    .setAudience(opts.audience ?? CLIENT_ID).setSubject('sub-1')
    .setIssuedAt(Math.floor(NOW.getTime() / 1000)).setExpirationTime(Math.floor(NOW.getTime() / 1000) + (opts.expiresIn ?? 3600)).sign(privateKey);
  const fetchImpl = vi.fn(opts.fetchImpl ?? (async () => new Response(JSON.stringify({ id_token: await sign() }), { status: 200 }))) as unknown as typeof fetch;
  const client = new RealGoogleClient(config, { fetch: fetchImpl, jwks: createLocalJWKSet({ keys: [jwk] }), now: () => NOW });
  return { client, fetchImpl: fetchImpl as unknown as ReturnType<typeof vi.fn> };
}

describe('RealGoogleClient', () => {
  it('builds the authorize URL with PKCE S256, nonce, state, prompt select_account and the client', () => {
    const client = new RealGoogleClient(config);
    const url = new URL(client.authorizeUrl({ state: 's', nonce: 'n', codeChallenge: 'c', prompt: 'select_account', loginHint: 'sub-1' }));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: CLIENT_ID, redirect_uri: config.redirectUri, response_type: 'code', scope: 'openid email profile', state: 's', nonce: 'n',
      code_challenge: 'c', code_challenge_method: 'S256', prompt: 'select_account', login_hint: 'sub-1',
    });
  });

  it('exchanges the code (form body with the secret and the verifier) and returns the identity', async () => {
    const { client, fetchImpl } = await realSetup({ given_name: 'Lan', family_name: 'Nguyễn', name: 'Lan Nguyễn', picture: 'https://p/1.png' });
    const identity = await client.exchange('the-code', 'verifier-1', 'n-1');
    expect(identity).toEqual({ sub: 'sub-1', email: 'lan@gmail.com', emailVerified: true, givenName: 'Lan', familyName: 'Nguyễn', name: 'Lan Nguyễn', picture: 'https://p/1.png' });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    const body = new URLSearchParams(init.body as string);
    expect(Object.fromEntries(body)).toEqual({
      code: 'the-code', client_id: CLIENT_ID, client_secret: 'sekret', redirect_uri: config.redirectUri,
      grant_type: 'authorization_code', code_verifier: 'verifier-1',
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('B8E2: a wrong audience, issuer, nonce or an expired token is refused', async () => {
    for (const [name, opts] of [['audience', { audience: 'someone-else' }], ['issuer', { issuer: 'https://evil.example' }], ['expired', { expiresIn: -10 }]] as const) {
      const { client } = await realSetup({}, opts);
      await expect(client.exchange('c', 'v', 'n-1'), name).rejects.toBeInstanceOf(GoogleExchangeError);
    }
    const { client } = await realSetup();
    await expect(client.exchange('c', 'v', 'another-nonce')).rejects.toBeInstanceOf(GoogleExchangeError);
  });

  it('accepts both issuer spellings of Google, and email_verified as the string "true"', async () => {
    const plain = await realSetup({ email_verified: 'true' }, { issuer: 'accounts.google.com' });
    expect((await plain.client.exchange('c', 'v', 'n-1')).emailVerified).toBe(true);
    const unverified = await realSetup({ email_verified: false });
    expect((await unverified.client.exchange('c', 'v', 'n-1')).emailVerified).toBe(false);
  });

  it('B8E4: a token endpoint error, a missing id_token and a network failure are all GoogleExchangeError', async () => {
    for (const fetchImpl of [
      async () => new Response('{}', { status: 400 }), async () => new Response('{}', { status: 200 }),
      async () => { throw new TypeError('fetch failed'); },
    ] as Array<typeof fetch>) {
      const { client } = await realSetup({}, { fetchImpl });
      await expect(client.exchange('c', 'v', 'n-1')).rejects.toBeInstanceOf(GoogleExchangeError);
    }
  });
});

describe('FakeGoogleClient', () => {
  const fakeConfig: AppConfig['google'] = { ...config, mode: 'fake', clientId: null, clientSecret: null };
  const account = { email: 'minh@example.com', sub: 'fake-sub-1', name: 'Minh Trần', givenName: 'Minh', familyName: 'Trần', picture: 'https://p/2.png' };
  const flow = (client: FakeGoogleClient, verifier = 'verifier-1') => {
    const url = new URL(client.issueCode({ account, state: 's', nonce: 'n-1', codeChallenge: s256(verifier), redirectUri: fakeConfig.redirectUri! }));
    return { code: url.searchParams.get('code')!, state: url.searchParams.get('state') };
  };

  it('points authorizeUrl at its own page with the state, nonce, challenge and redirect URI', () => {
    const url = new URL(new FakeGoogleClient(fakeConfig).authorizeUrl({ state: 's', nonce: 'n', codeChallenge: 'c', prompt: 'select_account' }));
    expect(url.origin + url.pathname).toBe('https://api.example.com/v1/dev/google/authorize');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ state: 's', nonce: 'n', code_challenge: 'c', redirect_uri: fakeConfig.redirectUri });
  });

  it('round trip: the code comes back on the redirect URI with the state, and the exchange returns the chosen identity with names and picture (B8A1)', async () => {
    const client = new FakeGoogleClient(fakeConfig);
    const { code, state } = flow(client);
    expect(state).toBe('s');
    expect(await client.exchange(code, 'verifier-1', 'n-1')).toEqual({
      sub: 'fake-sub-1', email: 'minh@example.com', emailVerified: true, givenName: 'Minh', familyName: 'Trần', name: 'Minh Trần', picture: 'https://p/2.png',
    });
  });

  it('P17: refuses a code_verifier that does not match the challenge, a wrong nonce, a reused code and an unknown code', async () => {
    const client = new FakeGoogleClient(fakeConfig);
    await expect(client.exchange(flow(client).code, 'another-verifier', 'n-1')).rejects.toBeInstanceOf(GoogleExchangeError);
    await expect(client.exchange(flow(client).code, 'verifier-1', 'other-nonce')).rejects.toBeInstanceOf(GoogleExchangeError);
    const { code } = flow(client);
    await client.exchange(code, 'verifier-1', 'n-1');
    await expect(client.exchange(code, 'verifier-1', 'n-1')).rejects.toBeInstanceOf(GoogleExchangeError);
    await expect(client.exchange('fake-nope', 'verifier-1', 'n-1')).rejects.toBeInstanceOf(GoogleExchangeError);
  });

  it('an unverified email comes through as emailVerified false (B8E3 can be tested)', async () => {
    const client = new FakeGoogleClient(fakeConfig);
    const url = new URL(client.issueCode({ account: { ...account, emailVerified: false }, state: 's', nonce: 'n-1', codeChallenge: s256('v'), redirectUri: fakeConfig.redirectUri! }));
    expect((await client.exchange(url.searchParams.get('code')!, 'v', 'n-1')).emailVerified).toBe(false);
  });
});
