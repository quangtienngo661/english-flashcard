import { describe, expect, it } from 'vitest';
import { FakeTurnstileClient } from './turnstile-client.fake.js';

describe('FakeTurnstileClient', () => {
  const client = new FakeTurnstileClient();

  it('LA1E17: fake-turnstile-fail is rejected', async () => {
    await expect(client.verify('fake-turnstile-fail', undefined)).resolves.toEqual({ kind: 'rejected', codes: ['fake-turnstile-fail'] });
  });

  it.each(['smoke-token', 'fake-turnstile-token', 'anything-well-formed'])('%s passes with the hostname "fake"', async (token) => {
    await expect(client.verify(token, '1.2.3.4')).resolves.toEqual({ kind: 'ok', hostname: 'fake' });
  });
});
