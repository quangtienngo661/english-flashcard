import { Controller, Get } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PRISMA_CLIENT, PrismaModule } from '../../src/common/db/prisma.module.js';
import { ROLE_PERMISSIONS } from '../../src/identity/identity.types.js';
import { RequirePermission } from '../../src/identity/staff/require-permission.decorator.js';
import { ROLE_PERMISSIONS_TOKEN } from '../../src/identity/staff/role-permissions.token.js';
import { createTestApp, type TestApp } from './create-test-app.js';
import { listRoutes } from './list-routes.js';

@Controller('admin/__route-control')
@RequirePermission('content.edit')
class RouteControlController {
  @Get(['read', 'read-alias'])
  @RequirePermission('content.edit', 'content.publish')
  read() { return { ok: true }; }
}
@Controller('admin/__undeclared-control')
class UndeclaredControlController {
  @Get()
  read() { return { ok: true }; }
}

describe('listRoutes (unit, isolated persistence)', () => {
  let ctx: TestApp;
  const prisma = { $disconnect: async () => {} };

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused', controllers: [RouteControlController, UndeclaredControlController] });
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('B2#66: discovery finds staff routes, permission overrides, route aliases and undeclared admin routes', () => {
    const routes = listRoutes(ctx.app);
    expect(routes.filter(({ permissions }) => permissions?.includes('roles.manage'))).toEqual([
      { method: 'GET', path: '/v1/admin/staff', permissions: ['roles.manage'] },
      { method: 'GET', path: '/v1/admin/users', permissions: ['roles.manage'] },
      { method: 'POST', path: '/v1/admin/users', permissions: ['roles.manage'] },
      { method: 'GET', path: '/v1/admin/users/:id', permissions: ['roles.manage'] },
      { method: 'POST', path: '/v1/admin/users/:id/lock', permissions: ['roles.manage'] },
      { method: 'PUT', path: '/v1/admin/users/:id/staff-role', permissions: ['roles.manage'] },
      { method: 'POST', path: '/v1/admin/users/:id/unlock', permissions: ['roles.manage'] },
    ]);
    expect(routes.filter(({ path }) => path.startsWith('/v1/admin/__'))).toEqual([
      { method: 'GET', path: '/v1/admin/__route-control/read', permissions: ['content.edit', 'content.publish'] },
      { method: 'GET', path: '/v1/admin/__route-control/read-alias', permissions: ['content.edit', 'content.publish'] },
      { method: 'GET', path: '/v1/admin/__undeclared-control', permissions: null },
    ]);
  });

  it('createTestApp injects a cloned permission table with separate role arrays', () => {
    expect(ctx.app.get(ROLE_PERMISSIONS_TOKEN)).toBe(ctx.rolePermissions);
    expect(ctx.rolePermissions).toEqual(ROLE_PERMISSIONS);
    expect(ctx.rolePermissions).not.toBe(ROLE_PERMISSIONS);
    expect(ctx.rolePermissions.admin).not.toBe(ROLE_PERMISSIONS.admin);
    expect(ctx.rolePermissions.editor).not.toBe(ROLE_PERMISSIONS.editor);
  });
});
