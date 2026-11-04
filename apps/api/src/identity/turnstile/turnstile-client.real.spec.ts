import { describe, expect, it, vi } from 'vitest';
import { RealTurnstileClient, TURNSTILE_SITEVERIFY_URL, TURNSTILE_TIMEOUT_MS } from './turnstile-client.real.js';

const SECRET = 'top-secret-value-1x0000';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function setup(...answers: Array<() => Promise<Response>>) {
  const fetchImpl = vi.fn();
  for (const answer of answers) fetchImpl.mockImplementationOnce(answer);
  let n = 0;
  const client = new RealTurnstileClient(SECRET, { fetch: fetchImpl as unknown as typeof fetch, uuid: () => `uuid-${++n}`, timeoutMs: 30 });
  return { client, fetchImpl };
}
const bodyOf = (fetchImpl: ReturnType<typeof vi.fn>, call: number) => new URLSearchParams((fetchImpl.mock.calls[call] as [string, RequestInit])[1].body as string);

describe('RealTurnstileClient', () => {
  it('sends a form-urlencoded siteverify request with secret, response, remoteip and an idempotency key, and returns ok with the hostname', async () => {
    const { client, fetchImpl } = setup(async () => json({ success: true, hostname: 'wordmet.com' }));
    await expect(client.verify('tok-1', '203.0.113.9')).resolves.toEqual({ kind: 'ok', hostname: 'wordmet.com' });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(TURNSTILE_SITEVERIFY_URL);
    expect(TURNSTILE_SITEVERIFY_URL).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/x-www-form-urlencoded');
    expect(Object.fromEntries(bodyOf(fetchImpl, 0))).toEqual({ secret: SECRET, response: 'tok-1', remoteip: '203.0.113.9', idempotency_key: 'uuid-1' });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('leaves remoteip out when there is no address', async () => {
    const { client, fetchImpl } = setup(async () => json({ success: true, hostname: 'wordmet.com' }));
    await client.verify('tok-1', undefined);
    expect(bodyOf(fetchImpl, 0).has('remoteip')).toBe(false);
  });

  it('the timeout is 5 seconds', () => {
    expect(TURNSTILE_TIMEOUT_MS).toBe(5_000);
  });

  it('rejects when success is false and passes the codes on, timeout-or-duplicate included', async () => {
    const { client, fetchImpl } = setup(async () => json({ success: false, 'error-codes': ['timeout-or-duplicate'] }));
    await expect(client.verify('t', undefined)).resolves.toEqual({ kind: 'rejected', codes: ['timeout-or-duplicate'] });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('LA1E18: the page-made token against the real API is rejected (invalid-input-response)', async () => {
    const { client } = setup(async () => json({ success: false, 'error-codes': ['invalid-input-response'] }));
    await expect(client.verify('fake-turnstile-token', '1.2.3.4')).resolves.toEqual({ kind: 'rejected', codes: ['invalid-input-response'] });
  });

  it('retries once after a network error, with the same idempotency key', async () => {
    const { client, fetchImpl } = setup(async () => { throw new TypeError('fetch failed'); }, async () => json({ success: true, hostname: 'wordmet.com' }));
    await expect(client.verify('t', '1.1.1.1')).resolves.toEqual({ kind: 'ok', hostname: 'wordmet.com' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(bodyOf(fetchImpl, 0).get('idempotency_key')).toBe('uuid-1');
    expect(bodyOf(fetchImpl, 1).get('idempotency_key')).toBe('uuid-1');
  });

  it('HTTP 503 twice → unavailable (http), after exactly two calls', async () => {
    const { client, fetchImpl } = setup(async () => json({}, 503), async () => json({}, 503));
    await expect(client.verify('t', undefined)).resolves.toEqual({ kind: 'unavailable', reason: 'http' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('a network error twice → unavailable (network)', async () => {
    const { client } = setup(async () => { throw new TypeError('fetch failed'); }, async () => { throw new TypeError('fetch failed'); });
    await expect(client.verify('t', undefined)).resolves.toEqual({ kind: 'unavailable', reason: 'network' });
  });

  it('internal-error twice → unavailable (internal-error); once then ok → ok', async () => {
    const twice = setup(async () => json({ success: false, 'error-codes': ['internal-error'] }), async () => json({ success: false, 'error-codes': ['internal-error'] }));
    await expect(twice.client.verify('t', undefined)).resolves.toEqual({ kind: 'unavailable', reason: 'internal-error' });
    const once = setup(async () => json({ success: false, 'error-codes': ['internal-error'] }), async () => json({ success: true, hostname: 'wordmet.com' }));
    await expect(once.client.verify('t', undefined)).resolves.toEqual({ kind: 'ok', hostname: 'wordmet.com' });
  });

  it('an answer slower than the timeout → unavailable (timeout), after two tries', async () => {
    // A fetch that honours the abort signal, like the real one.
    const hang = (_url: unknown, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
    });
    const fetchImpl = vi.fn(hang);
    const client = new RealTurnstileClient(SECRET, { fetch: fetchImpl as unknown as typeof fetch, timeoutMs: 20 });
    await expect(client.verify('t', undefined)).resolves.toEqual({ kind: 'unavailable', reason: 'timeout' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it.each(['invalid-input-secret', 'missing-input-secret'])('%s → unavailable (misconfigured), and no retry', async (code) => {
    const { client, fetchImpl } = setup(async () => json({ success: false, 'error-codes': [code] }));
    await expect(client.verify('t', undefined)).resolves.toEqual({ kind: 'unavailable', reason: 'misconfigured' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  // Checked against the live service on 04/11/2026: a wrong secret is answered HTTP 400 with {"error-codes":["invalid-input-secret"],"success":false}.
  it.each(['invalid-input-secret', 'missing-input-secret'])('HTTP 400 carrying %s in its JSON body → unavailable (misconfigured), no retry', async (code) => {
    const { client, fetchImpl } = setup(async () => json({ 'error-codes': [code], success: false, messages: [] }, 400));
    await expect(client.verify('t', undefined)).resolves.toEqual({ kind: 'unavailable', reason: 'misconfigured' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('an HTTP 4xx is not retried', async () => {
    const { client, fetchImpl } = setup(async () => json({}, 400));
    await expect(client.verify('t', undefined)).resolves.toEqual({ kind: 'unavailable', reason: 'http' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('an answer that is not JSON counts as unavailable (http)', async () => {
    const { client } = setup(async () => new Response('<html>', { status: 200 }), async () => new Response('<html>', { status: 200 }));
    await expect(client.verify('t', undefined)).resolves.toEqual({ kind: 'unavailable', reason: 'http' });
  });

  it('never lets the secret out, even when the fetch error carries it', async () => {
    const { client } = setup(async () => { throw new Error(`failed with secret=${SECRET}`); }, async () => { throw new Error(`failed with secret=${SECRET}`); });
    const verdict = await client.verify('t', undefined);
    expect(JSON.stringify(verdict)).not.toContain(SECRET);
    expect(String(verdict)).not.toContain(SECRET);
  });
});
