import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { PermissionGuard } from './permission.guard.js';
import { RequirePermission } from './require-permission.decorator.js';

@RequirePermission('roles.manage')
class ProtectedController { route() {} }
class MethodController {
  @RequirePermission('roles.manage')
  route() {}
}
describe('PermissionGuard', () => {
  const prisma = { sessionChain: { findUnique: vi.fn() } };
  const request = { user: { userId: 'user', sessionChainId: 'chain' } as { userId: string; sessionChainId: string } | undefined };
  let guard: PermissionGuard;
  let context: ExecutionContext;
  beforeEach(() => {
    vi.resetAllMocks(); request.user = { userId: 'user', sessionChainId: 'chain' };
    prisma.sessionChain.findUnique.mockResolvedValue({ userId: 'user', revokedAt: null, user: { staffRole: 'admin' } });
    guard = new PermissionGuard(new Reflector(), prisma as unknown as PrismaClient);
    context = { getClass: () => ProtectedController, getHandler: () => ProtectedController.prototype.route,
      switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
  });
  it('B1#26: current stored role and an owned unrevoked chain grant permission at class and method level', async () => {
    expect(await guard.canActivate(context)).toBe(true);
    expect(prisma.sessionChain.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'chain' } }));
    context = { ...context, getClass: () => MethodController, getHandler: () => MethodController.prototype.route } as unknown as ExecutionContext;
    expect(await guard.canActivate(context)).toBe(true);
  });
  it.each(['editor', null, 'owner'])('B1#26: role %s fails with 403 even if the chain is live', async (staffRole) => {
    prisma.sessionChain.findUnique.mockResolvedValue({ userId: 'user', revokedAt: null, user: { staffRole } });
    await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 403, problemType: 'forbidden' });
  });
  it.each([null, { userId: 'user', revokedAt: new Date(), user: { staffRole: 'admin' } },
    { userId: 'other', revokedAt: null, user: { staffRole: 'admin' } }])('B1#26/B1E13: missing, revoked or foreign chain is forbidden', async (chain) => {
    prisma.sessionChain.findUnique.mockResolvedValue(chain);
    await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 403, problemType: 'forbidden' });
  });
  it('B1#26: no authenticated user is forbidden without persistence access', async () => {
    request.user = undefined;
    await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 403, problemType: 'forbidden' });
    expect(prisma.sessionChain.findUnique).not.toHaveBeenCalled();
  });
});
