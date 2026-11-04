import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../../common/config/app-config.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import type { TurnstileClient, TurnstileVerdict } from './turnstile-client.js';
import { TurnstileGuard } from './turnstile.guard.js';

const HOSTS = ['wordmet.com', 'www.wordmet.com', 'admin.wordmet.com'];
const TOKEN = 'tok-secret-looking-0123456789';

function build(opts: { mode: 'real' | 'fake' | 'off'; verdict?: TurnstileVerdict; policy?: 'reject' | 'bypass'; hit?: () => Promise<void> }) {
  const verify = vi.fn(async () => opts.verdict ?? { kind: 'ok', hostname: 'wordmet.com' });
  const client = { verify } as unknown as TurnstileClient;
  const hit = vi.fn(opts.hit ?? (async () => {}));
  const logs: LogEntry[] = [];
  const logger = new AppLogger({ write: (entry) => { logs.push(entry); } });
  const config = { turnstile: { mode: opts.mode, secretKey: 's', allowedHostnames: HOSTS } } as AppConfig;
  const reflector = { get: vi.fn(() => opts.policy) } as unknown as Reflector;
  const guard = new TurnstileGuard(reflector, config, client, { hit } as unknown as RateLimiter, logger);
  const run = (body: unknown) => {
    const request = { body, ip: '203.0.113.7', method: 'POST', route: { path: '/v1/auth/login' } };
    const context = { switchToHttp: () => ({ getRequest: () => request }), getHandler: () => () => {} } as unknown as ExecutionContext;
    return guard.canActivate(context);
  };
  return { run, verify, hit, logs };
}

async function problemOf(promise: Promise<unknown>) {
  const error = await promise.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(ProblemDetailsException);
  const problem = error as ProblemDetailsException;
  return { status: problem.getStatus(), type: problem.problemType };
}

describe('TurnstileGuard', () => {
  it.each([{ turnstile_token: TOKEN }, {}, undefined, { turnstile_token: 5 }])('LA1E16: off lets %j through and calls nothing', async (body) => {
    const t = build({ mode: 'off' });
    await expect(t.run(body)).resolves.toBe(true);
    expect(t.verify).not.toHaveBeenCalled();
    expect(t.hit).not.toHaveBeenCalled();
  });

  it.each(['real', 'fake'] as const)('LA1E1 (%s): a missing, numeric, object, empty or 2049-character token is 400 validation-failed, with no call and no count', async (mode) => {
    const t = build({ mode });
    for (const body of [undefined, null, {}, { turnstile_token: 12345 }, { turnstile_token: { a: 1 } }, { turnstile_token: '' }, { turnstile_token: 'x'.repeat(2049) }]) {
      expect(await problemOf(t.run(body)), JSON.stringify(body)?.slice(0, 40)).toEqual({ status: 400, type: 'validation-failed' });
    }
    expect(t.verify).not.toHaveBeenCalled();
    expect(t.hit).not.toHaveBeenCalled();
  });

  it('a token of exactly 2048 characters is shaped right and goes on to the check', async () => {
    const t = build({ mode: 'real' });
    await expect(t.run({ turnstile_token: 'x'.repeat(2048) })).resolves.toBe(true);
    expect(t.verify).toHaveBeenCalledTimes(1);
  });

  it('LA1E3: in real mode a caller over auth.captcha.ip gets the 429 and Cloudflare is not called', async () => {
    const over = new ProblemDetailsException({ status: 429, title: 'Too many requests', type: 'rate-limited', retryAfterSeconds: 12 });
    const t = build({ mode: 'real', hit: async () => { throw over; } });
    await expect(t.run({ turnstile_token: TOKEN })).rejects.toBe(over);
    expect(t.hit).toHaveBeenCalledWith('auth.captcha.ip', '203.0.113.7');
    expect(t.verify).not.toHaveBeenCalled();
  });

  it('fake mode does not count auth.captcha.ip', async () => {
    const t = build({ mode: 'fake', verdict: { kind: 'ok', hostname: 'fake' } });
    await expect(t.run({ turnstile_token: TOKEN })).resolves.toBe(true);
    expect(t.hit).not.toHaveBeenCalled();
  });

  it('fake mode does not check the hostname', async () => {
    const t = build({ mode: 'fake', verdict: { kind: 'ok', hostname: 'fake' } });
    await expect(t.run({ turnstile_token: TOKEN })).resolves.toBe(true);
  });

  it.each(HOSTS)('LA1#3/#4: real passes a token whose hostname is %s, after counting the caller and asking Cloudflare with the caller address', async (hostname) => {
    const t = build({ mode: 'real', verdict: { kind: 'ok', hostname } });
    await expect(t.run({ turnstile_token: TOKEN })).resolves.toBe(true);
    expect(t.hit).toHaveBeenCalledWith('auth.captcha.ip', '203.0.113.7');
    expect(t.verify).toHaveBeenCalledWith(TOKEN, '203.0.113.7');
  });

  it('LA1E7: a hostname outside the list is 400 captcha-failed and is logged with the hostname', async () => {
    const t = build({ mode: 'real', verdict: { kind: 'ok', hostname: 'evil.example' } });
    expect(await problemOf(t.run({ turnstile_token: TOKEN }))).toEqual({ status: 400, type: 'captcha-failed' });
    expect(t.logs).toContainEqual(expect.objectContaining({ level: 'warn', event: 'turnstile_hostname_mismatch', hostname: 'evil.example' }));
  });

  it('LA1E2: success false is 400 captcha-failed', async () => {
    const t = build({ mode: 'real', verdict: { kind: 'rejected', codes: ['invalid-input-response'] } });
    expect(await problemOf(t.run({ turnstile_token: TOKEN }))).toEqual({ status: 400, type: 'captcha-failed' });
  });

  it('LA1E17: the fake client fail token is 400 captcha-failed in fake mode', async () => {
    const t = build({ mode: 'fake', verdict: { kind: 'rejected', codes: ['fake-turnstile-fail'] } });
    expect(await problemOf(t.run({ turnstile_token: 'fake-turnstile-fail' }))).toEqual({ status: 400, type: 'captcha-failed' });
  });

  it.each(['network', 'timeout', 'http', 'internal-error'] as const)('LA1E8: Cloudflare unavailable (%s) with the default policy is 503 captcha-unavailable', async (reason) => {
    const t = build({ mode: 'real', verdict: { kind: 'unavailable', reason } });
    expect(await problemOf(t.run({ turnstile_token: TOKEN }))).toEqual({ status: 503, type: 'captcha-unavailable' });
    expect(t.logs.filter((l) => l.event === 'turnstile_bypassed')).toEqual([]);
  });

  it('LA1E8: with the bypass policy (login) Cloudflare being unavailable lets the request through and logs a warning with route and reason', async () => {
    const t = build({ mode: 'real', policy: 'bypass', verdict: { kind: 'unavailable', reason: 'timeout' } });
    await expect(t.run({ turnstile_token: TOKEN })).resolves.toBe(true);
    expect(t.logs).toContainEqual(expect.objectContaining({ level: 'warn', event: 'turnstile_bypassed', route: 'POST /v1/auth/login', reason: 'timeout' }));
  });

  it('the bypass policy never lets a rejected token or a bad shape through', async () => {
    const rejected = build({ mode: 'real', policy: 'bypass', verdict: { kind: 'rejected', codes: ['x'] } });
    expect(await problemOf(rejected.run({ turnstile_token: TOKEN }))).toEqual({ status: 400, type: 'captcha-failed' });
    const shaped = build({ mode: 'real', policy: 'bypass', verdict: { kind: 'unavailable', reason: 'network' } });
    expect(await problemOf(shaped.run({}))).toEqual({ status: 400, type: 'validation-failed' });
    const wrongHost = build({ mode: 'real', policy: 'bypass', verdict: { kind: 'ok', hostname: 'evil.example' } });
    expect(await problemOf(wrongHost.run({ turnstile_token: TOKEN }))).toEqual({ status: 400, type: 'captcha-failed' });
  });

  it('LA1E9: misconfigured is treated like unavailable plus an error log, for both policies', async () => {
    const reject = build({ mode: 'real', verdict: { kind: 'unavailable', reason: 'misconfigured' } });
    expect(await problemOf(reject.run({ turnstile_token: TOKEN }))).toEqual({ status: 503, type: 'captcha-unavailable' });
    expect(reject.logs).toContainEqual(expect.objectContaining({ level: 'error', event: 'turnstile_misconfigured' }));
    const bypass = build({ mode: 'real', policy: 'bypass', verdict: { kind: 'unavailable', reason: 'misconfigured' } });
    await expect(bypass.run({ turnstile_token: TOKEN })).resolves.toBe(true);
    expect(bypass.logs).toContainEqual(expect.objectContaining({ level: 'error', event: 'turnstile_misconfigured' }));
    expect(bypass.logs).toContainEqual(expect.objectContaining({ level: 'warn', event: 'turnstile_bypassed', reason: 'misconfigured' }));
  });

  it('never logs the token', async () => {
    const outcomes = [
      build({ mode: 'real', verdict: { kind: 'ok', hostname: 'evil.example' } }),
      build({ mode: 'real', policy: 'bypass', verdict: { kind: 'unavailable', reason: 'misconfigured' } }),
      build({ mode: 'real', verdict: { kind: 'unavailable', reason: 'network' } }),
      build({ mode: 'real', verdict: { kind: 'rejected', codes: ['invalid-input-response'] } }),
    ];
    for (const t of outcomes) await t.run({ turnstile_token: TOKEN }).catch(() => undefined);
    const logged = JSON.stringify(outcomes.flatMap((t) => t.logs));
    expect(logged.length).toBeGreaterThan(50); // control: something was logged
    expect(logged).not.toContain(TOKEN);
  });
});
