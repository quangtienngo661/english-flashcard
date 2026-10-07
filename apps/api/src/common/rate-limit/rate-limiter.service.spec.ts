import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { testConfig } from '../../../test/support/test-config.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { FakeClock } from '../clock/clock.js';
import { DEFAULT_LIMITS } from '../config/app-config.js';
import { ProblemDetailsException } from '../problem-details/problem-details.exception.js';
import { RateLimiter } from './rate-limiter.service.js';

function setup() {
  const config = testConfig({ limits: {
    ...DEFAULT_LIMITS,
    'sample.create': { by: 'user', max: 2, windowSeconds: 60 },
    'user.write': { by: 'user', max: 2, windowSeconds: 3600 },
  } });
  const clock = new FakeClock(new Date('2026-10-07T12:00:00.000Z'));
  const counters = new Map<string, number>();
  const upsert = vi.fn(async (args: {
    create: { key: string; windowStart: Date; count: number };
    update: { count: { increment: number } };
  }) => {
    const id = `${args.create.key}:${args.create.windowStart.toISOString()}`;
    const previous = counters.get(id);
    const count = previous === undefined ? args.create.count : previous + args.update.count.increment;
    counters.set(id, count);
    return { ...args.create, count };
  });
  const prisma = { rateLimitCounter: { upsert } } as unknown as PrismaClient;
  return { config, clock, upsert, limiter: new RateLimiter(prisma, config, clock) };
}

describe('RateLimiter', () => {
  it('B1#33: different named rules at the same window start have independent limits', async () => {
    const { limiter } = setup();
    for (const rule of ['sample.create', 'user.write'] as const) {
      await expect(limiter.hit(rule, 'user-1')).resolves.toBeUndefined();
      await expect(limiter.hit(rule, 'user-1')).resolves.toBeUndefined();
      await expect(limiter.hit(rule, 'user-1')).rejects.toMatchObject({
        problemType: 'rate-limited', retryAfterSeconds: rule === 'sample.create' ? 60 : 3600,
      });
    }
    await expect(limiter.hit('sample.create', 'user-2')).resolves.toBeUndefined();
  });

  it('B1#33: rejects over-limit hits with 429 and rounds Retry-After up from Clock', async () => {
    const { limiter, clock } = setup();
    clock.advance(59_250);
    await limiter.hit('sample.create', 'user-1');
    await limiter.hit('sample.create', 'user-1');
    const error = await limiter.hit('sample.create', 'user-1').catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ProblemDetailsException);
    expect((error as ProblemDetailsException).getStatus()).toBe(429);
    expect(error).toMatchObject({
      problemTitle: 'Too many requests', problemType: 'rate-limited', retryAfterSeconds: 1,
    });
    clock.advance(750);
    await expect(limiter.hit('sample.create', 'user-1')).resolves.toBeUndefined();
  });

  it.each([
    ['auth.login.ip', 'ip', '203.0.113.7'],
    ['auth.otp.email.cooldown', 'email', 'a@example.com'],
  ] as const)('B1#32: %s stores the truncated HMAC instead of the raw subject', async (rule, by, subject) => {
    const { config, limiter, upsert } = setup();
    await limiter.hit(rule, subject);
    const digest = createHmac('sha256', config.rateLimitHmacKey).update(subject).digest('hex').slice(0, 32);
    const args = upsert.mock.calls[0][0];
    expect(args.create.key).toBe(`${rule}:${by}:${digest}`);
    expect(JSON.stringify(args)).not.toContain(subject);
  });

  it('keeps a chain subject intact for service-level hits', async () => {
    const { limiter, upsert } = setup();
    await limiter.hit('auth.refresh.chain', 'chain-1');
    expect(upsert.mock.calls[0][0].create.key).toBe('auth.refresh.chain:chain:chain-1');
  });

  it('uses one upsert with matching create and compound keys and an atomic increment', async () => {
    const { limiter, upsert, clock } = setup();
    await limiter.hit('sample.create', 'user-1');
    expect(upsert).toHaveBeenCalledExactlyOnceWith({
      where: { key_windowStart: { key: 'sample.create:user:user-1', windowStart: clock.now() } },
      create: { key: 'sample.create:user:user-1', windowStart: clock.now(), count: 1 },
      update: { count: { increment: 1 } },
    });
  });

  it('propagates a database failure', async () => {
    const { limiter, upsert } = setup();
    const error = new Error('database unavailable');
    upsert.mockRejectedValueOnce(error);
    await expect(limiter.hit('sample.create', 'user-1')).rejects.toBe(error);
  });
});
