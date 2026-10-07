import 'reflect-metadata';
import type { ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { testConfig } from '../../../test/support/test-config.js';
import { RateLimit } from './rate-limit.decorator.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import type { RateLimiter } from './rate-limiter.service.js';

class TestController {
  @RateLimit('sample.create', 'auth.login.ip', 'auth.otp.email.cooldown', 'auth.refresh.chain')
  limited() {}
  plain() {}
}

function setup(request: object, handler = TestController.prototype.limited) {
  const hit = vi.fn().mockResolvedValue(undefined);
  const guard = new RateLimitGuard(new Reflector(), testConfig(), { hit } as unknown as RateLimiter);
  const context = {
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { guard, hit, context };
}

describe('RateLimitGuard', () => {
  it('attaches the guard at route level through the named-rule decorator', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, TestController.prototype.limited)).toEqual([RateLimitGuard]);
  });

  it('B1#33: applies user, IP and normalized email rules in order, skipping chain rules', async () => {
    const { guard, hit, context } = setup({
      user: { userId: 'user-1' }, ip: '203.0.113.7', body: { email: '  Foo@Example.COM ' },
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(hit.mock.calls).toEqual([
      ['sample.create', 'user-1'], ['auth.login.ip', '203.0.113.7'],
      ['auth.otp.email.cooldown', 'foo@example.com'],
    ]);
  });

  it.each([{}, { body: { email: 42 } }, { body: { email: 'invalid' } }])(
    'skips rules whose subject is missing or invalid: %j', async (request) => {
      const { guard, hit, context } = setup(request);
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(hit).not.toHaveBeenCalled();
    },
  );

  it('allows a handler with no rate-limit metadata', async () => {
    const { guard, hit, context } = setup({}, TestController.prototype.plain);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(hit).not.toHaveBeenCalled();
  });

  it('stops at a rejected rule and propagates its error', async () => {
    const { guard, hit, context } = setup({ user: { userId: 'user-1' }, ip: '203.0.113.7' });
    const error = new Error('limited');
    hit.mockRejectedValueOnce(error);
    await expect(guard.canActivate(context)).rejects.toBe(error);
    expect(hit).toHaveBeenCalledTimes(1);
  });
});
