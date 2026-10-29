import { Controller, Get } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PRISMA_CLIENT, PrismaModule } from '../../src/common/db/prisma.module.js';
import { ROLE_PERMISSIONS } from '../../src/identity/identity.types.js';
import { RequirePermission } from '../../src/identity/staff/require-permission.decorator.js';
import { ROLE_PERMISSIONS_TOKEN } from '../../src/identity/staff/role-permissions.token.js';
import { createTestApp, type TestApp } from './create-test-app.js';
import { adminRoutesWithoutPermission, listRoutes } from './list-routes.js';

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
    // AD18: list and detail moved to users.read (editors read users).
    expect(routes.filter(({ permissions }) => permissions?.includes('users.read'))).toEqual([
      { method: 'GET', path: '/v1/admin/users', permissions: ['users.read'] },
      { method: 'GET', path: '/v1/admin/users/:id', permissions: ['users.read'] },
    ]);
    // Owner 28/10/2026: the AI dashboard's four read routes are the only ones under ai.view.
    expect(routes.filter(({ permissions }) => permissions?.includes('ai.view'))).toEqual([
      { method: 'GET', path: '/v1/admin/ai/dashboard', permissions: ['ai.view'] },
      { method: 'GET', path: '/v1/admin/entitlements/ai-usage/days', permissions: ['ai.view'] },
      { method: 'GET', path: '/v1/admin/entitlements/ai-usage/pro', permissions: ['ai.view'] },
      { method: 'GET', path: '/v1/admin/practice/ai-quality', permissions: ['ai.view'] },
    ]);
    expect(routes.filter(({ permissions }) => permissions?.includes('roles.manage'))).toEqual([
      { method: 'GET', path: '/v1/admin/staff', permissions: ['roles.manage'] },
      { method: 'POST', path: '/v1/admin/users', permissions: ['roles.manage'] },
      { method: 'PATCH', path: '/v1/admin/users/:id', permissions: ['roles.manage'] },
      { method: 'POST', path: '/v1/admin/users/:id/delete', permissions: ['roles.manage'] },
      { method: 'POST', path: '/v1/admin/users/:id/lock', permissions: ['roles.manage'] },
      { method: 'POST', path: '/v1/admin/users/:id/password', permissions: ['roles.manage'] },
      { method: 'PUT', path: '/v1/admin/users/:id/staff-role', permissions: ['roles.manage'] },
      { method: 'POST', path: '/v1/admin/users/:id/unlock', permissions: ['roles.manage'] },
    ]);
    expect(routes.filter(({ path }) => path.startsWith('/v1/admin/__'))).toEqual([
      { method: 'GET', path: '/v1/admin/__route-control/read', permissions: ['content.edit', 'content.publish'] },
      { method: 'GET', path: '/v1/admin/__route-control/read-alias', permissions: ['content.edit', 'content.publish'] },
      { method: 'GET', path: '/v1/admin/__undeclared-control', permissions: null },
    ]);
  });

  it('B2#66: the audit names a route under /v1/admin/ that declares no permission (the control above), and nothing else', () => {
    // The control controller proves the instrument can fail; every real controller of AppModule must be absent from the list.
    expect(adminRoutesWithoutPermission(listRoutes(ctx.app))).toEqual(['GET /v1/admin/__undeclared-control']);
  });

  it('B2#66: the audit ignores routes outside /v1/admin/ and routes with an empty permission list', () => {
    expect(adminRoutesWithoutPermission([
      { method: 'GET', path: '/v1/words', permissions: null },
      { method: 'GET', path: '/v1/admin/a', permissions: [] },
      { method: 'GET', path: '/v1/admin/b', permissions: ['content.edit'] },
    ])).toEqual(['GET /v1/admin/a']);
  });

  it('createTestApp injects a cloned permission table with separate role arrays', () => {
    expect(ctx.app.get(ROLE_PERMISSIONS_TOKEN)).toBe(ctx.rolePermissions);
    expect(ctx.rolePermissions).toEqual(ROLE_PERMISSIONS);
    expect(ctx.rolePermissions).not.toBe(ROLE_PERMISSIONS);
    expect(ctx.rolePermissions.admin).not.toBe(ROLE_PERMISSIONS.admin);
    expect(ctx.rolePermissions.editor).not.toBe(ROLE_PERMISSIONS.editor);
  });
});
