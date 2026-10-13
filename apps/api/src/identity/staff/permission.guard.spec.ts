import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { ROLE_PERMISSIONS, type Permission, type StaffRole } from '../identity.types.js';
import { PermissionGuard } from './permission.guard.js';
import { RequirePermission } from './require-permission.decorator.js';

@RequirePermission('roles.manage')
class ProtectedController { route() {} }
class MethodController {
  @RequirePermission('roles.manage')
  route() {}
}
@RequirePermission('content.edit', 'content.publish')
class MultiPermissionController { route() {} }
class MultiPermissionMethodController {
  @RequirePermission('content.edit', 'content.publish')
  route() {}
}
describe('PermissionGuard', () => {
  const prisma = { sessionChain: { findUnique: vi.fn() } };
  const request = { user: { userId: 'user', sessionChainId: 'chain' } as { userId: string; sessionChainId: string } | undefined };
  let guard: PermissionGuard;
  let context: ExecutionContext;
  let rolePermissions: Record<StaffRole, readonly Permission[]>;
  beforeEach(() => {
    vi.resetAllMocks(); request.user = { userId: 'user', sessionChainId: 'chain' };
    prisma.sessionChain.findUnique.mockResolvedValue({ userId: 'user', revokedAt: null, user: { staffRole: 'admin' } });
    rolePermissions = structuredClone(ROLE_PERMISSIONS);
    guard = new PermissionGuard(new Reflector(), prisma as unknown as PrismaClient, rolePermissions);
    context = { getClass: () => ProtectedController, getHandler: () => ProtectedController.prototype.route,
      switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
  });
  it('B2#65: a route needing two permissions passes only when the role table holds both', async () => {
    for (const controller of [MultiPermissionController, MultiPermissionMethodController]) {
      context = { ...context, getClass: () => controller, getHandler: () => controller.prototype.route } as unknown as ExecutionContext;
      for (const role of ['admin', 'editor'] as const) {
        prisma.sessionChain.findUnique.mockResolvedValue({ userId: 'user', revokedAt: null, user: { staffRole: role } });
        rolePermissions[role] = ['content.edit', 'content.publish'];
        expect(await guard.canActivate(context)).toBe(true);
        for (const permissions of [[], ['content.edit'], ['content.publish']] as Permission[][]) {
          rolePermissions[role] = permissions;
          await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 403, problemType: 'forbidden' });
        }
        rolePermissions[role] = ['content.edit', 'content.publish'];
        expect(await guard.canActivate(context)).toBe(true);
      }
    }
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
