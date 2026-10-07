import 'reflect-metadata';
import type { ExecutionContext, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { RequestWithUser } from '../../common/request-user/request-user.js';
import { testConfig } from '../../../test/support/test-config.js';
import { AccessTokenService } from './access-token.service.js';
import { AuthGuard } from './auth.guard.js';
import { Public } from './public.decorator.js';

class TestController {
  protectedRoute() {}
  @Public()
  publicRoute() {}
}

@Public()
class PublicController {
  route() {}
}

function setup(
  headers: RequestWithUser['headers'],
  controller: Type<unknown> = TestController,
  handler: () => void = TestController.prototype.protectedRoute,
) {
  const request = { headers } as RequestWithUser;
  const tokens = new AccessTokenService(testConfig(), new FakeClock(new Date('2026-10-07T12:00:00Z')));
  const guard = new AuthGuard(new Reflector(), tokens);
  const context = {
    getClass: () => controller,
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { request, tokens, guard, context };
}

describe('AuthGuard', () => {
  it.each([
    undefined, '', 'Bearer', 'Bearer ', 'Basic abc', 'Bearer invalid',
    'Bearer a b', ['Bearer abc', 'Bearer def'],
  ])('B1#14: rejects missing or invalid Authorization %j with 401 invalid-token', async (authorization) => {
    const { guard, context } = setup({ authorization } as RequestWithUser['headers']);
    const error = await guard.canActivate(context).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ProblemDetailsException);
    expect(error).toMatchObject({ problemType: 'invalid-token', problemTitle: 'Invalid token' });
    expect((error as ProblemDetailsException).getStatus()).toBe(401);
  });

  it('B1#14: attaches the verified user and session chain on a protected route', async () => {
    const { request, tokens, guard, context } = setup({});
    const user = { userId: randomUUID(), sessionChainId: randomUUID() };
    request.headers.authorization = `Bearer ${await tokens.sign(user)}`;
    expect(await guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual(user);
  });

  it('B1#14: accepts the Bearer scheme case insensitively', async () => {
    const { request, tokens, guard, context } = setup({});
    const user = { userId: randomUUID(), sessionChainId: randomUUID() };
    request.headers.authorization = `bearer ${await tokens.sign(user)}`;
    expect(await guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual(user);
  });

  it('B1#14: accepts several spaces between Bearer and the token (RFC 6750 §2.1)', async () => {
    const { request, tokens, guard, context } = setup({});
    const user = { userId: randomUUID(), sessionChainId: randomUUID() };
    request.headers.authorization = `Bearer   ${await tokens.sign(user)}`;
    expect(await guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual(user);
  });

  it('B1#31: the fake header or a pre-existing user cannot authenticate a protected route', async () => {
    const { request, guard, context } = setup({ 'x-test-user-id': randomUUID() });
    request.user = { userId: randomUUID(), sessionChainId: 'fake-session' };
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ProblemDetailsException);
    expect(request.user).toBeUndefined();
  });

  it.each([undefined, 'Bearer invalid', 'Basic abc'])('B1#14: public route stays anonymous with Authorization %j', async (authorization) => {
    const { request, guard, context } = setup({ authorization }, TestController, TestController.prototype.publicRoute);
    request.user = { userId: randomUUID(), sessionChainId: 'fake-session' };
    expect(await guard.canActivate(context)).toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('B1#14: attaches a valid Bearer user on a public route', async () => {
    const { request, tokens, guard, context } = setup({}, TestController, TestController.prototype.publicRoute);
    const user = { userId: randomUUID(), sessionChainId: randomUUID() };
    request.headers.authorization = `Bearer ${await tokens.sign(user)}`;
    expect(await guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual(user);
  });

  it('B1#14: honors Public metadata on the controller', async () => {
    const { guard, context } = setup({}, PublicController, PublicController.prototype.route);
    expect(await guard.canActivate(context)).toBe(true);
  });
});
