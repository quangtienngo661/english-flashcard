import { Controller, Get, Post } from '@nestjs/common';
import { SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';
import type { Test } from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ROLE_PERMISSIONS, type Permission } from '../../src/identity/identity.types.js';
import { RequirePermission } from '../../src/identity/staff/require-permission.decorator.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { listRoutes } from '../support/list-routes.js';
import { testConfig } from '../support/test-config.js';

@Controller('admin/__permissions-control')
@RequirePermission('content.edit', 'content.publish')
class PermissionControlController {
  @Post()
  write() { return { ok: true }; }
}

@Controller('admin/__undeclared-control')
class UndeclaredControlController {
  @Get()
  read() { return { ok: true }; }
}

type Route = ReturnType<typeof listRoutes>[number];
const contentPermissions: Permission[] = ['content.edit', 'content.publish', 'content.import', 'taxonomy.manage'];
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;
const placeholderId = '00000000-0000-4000-8000-000000000000';

function auditAdminRoutes(routes: Route[]): void {
  const missing = routes.filter(({ path, permissions }) => path.startsWith('/v1/admin/') && !permissions?.length);
  if (missing.length) {
    throw new Error(`Admin routes missing @RequirePermission: ${missing.map(({ method, path }) => `${method} ${path}`).join(', ')}`);
  }
}

describe('admin permissions (e2e, isolated database)', () => {
  let ctx: TestApp;
  let databaseUrl: string;
  const config = testConfig();
  config.limits['user.write'].max = 10_000;

  beforeAll(async () => {
    databaseUrl = await createIsolatedDatabase();
    ctx = await createTestApp({ databaseUrl, config, controllers: [PermissionControlController] });
  });
  beforeEach(async () => {
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(new Date('2026-10-12T12:00:00Z'));
    ctx.rolePermissions.admin = [...ROLE_PERMISSIONS.admin];
    ctx.rolePermissions.editor = [...ROLE_PERMISSIONS.editor];
  });
  afterAll(async () => { await ctx?.close(); });

  it('B2#66: every route under /v1/admin/ declares a permission', () => {
    const routes = listRoutes(ctx.app);
    expect(routes.filter(({ permissions }) => permissions?.includes('roles.manage'))).toEqual([
      { method: 'GET', path: '/v1/admin/staff', permissions: ['roles.manage'] },
      { method: 'GET', path: '/v1/admin/users', permissions: ['roles.manage'] },
      { method: 'POST', path: '/v1/admin/users', permissions: ['roles.manage'] },
      { method: 'PUT', path: '/v1/admin/users/:id/staff-role', permissions: ['roles.manage'] },
    ]);
    expect(() => auditAdminRoutes(routes)).not.toThrow();
  });

  it('B2#66: the route audit fails naming an undeclared admin route registered through createTestApp', async () => {
    const control = await createTestApp({ databaseUrl, config, controllers: [UndeclaredControlController] });
    try {
      const routes = listRoutes(control.app);
      expect(routes).toContainEqual({ method: 'GET', path: '/v1/admin/__undeclared-control', permissions: null });
      expect(() => auditAdminRoutes(routes)).toThrow('Admin routes missing @RequirePermission: GET /v1/admin/__undeclared-control');
    } finally { await control.close(); }
  });

  it('B2#65: each admin route returns 401 without a token, 403 for a learner, 403 for an editor whose table lacks any one of the route\'s permissions, 403 for a revoked session, and neither 401 nor 403 for admin and for an editor holding all of them', async () => {
    const routes = listRoutes(ctx.app).filter(({ path, permissions }) =>
      path.startsWith('/v1/admin/') && !permissions?.includes('roles.manage'));
    expect(routes).toContainEqual({ method: 'POST', path: '/v1/admin/__permissions-control', permissions: ['content.edit', 'content.publish'] });
    const admin = await seedUser(ctx.prisma, { verified: true, staffRole: 'admin' });
    const editor = await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' });
    const learner = await seedUser(ctx.prisma, { verified: true });
    const adminSession = await startSession(ctx, admin.userId);
    const editorSession = await startSession(ctx, editor.userId);
    const learnerSession = await startSession(ctx, learner.userId);
    const revokedSession = await startSession(ctx, admin.userId);
    expect((await ctx.http().post('/v1/auth/logout').set('Idempotency-Key', randomUUID())
      .send({ refresh_token: revokedSession.refreshToken })).status).toBe(204);
    expect((await ctx.prisma.sessionChain.findUniqueOrThrow({ where: { id: revokedSession.sessionChainId } })).revokedAt).toEqual(ctx.clock.now());
    // Signed but misleading claims must not replace the current stored role or session state.
    const claimToken = async (session: typeof adminSession, userId: string) => new SignJWT({
      sid: session.sessionChainId, staff_role: 'admin', permissions: ['roles.manage', ...contentPermissions],
    }).setProtectedHeader({ alg: 'HS256', kid: config.jwt.keys[0].kid }).setSubject(userId)
      .setIssuedAt(Math.floor(ctx.clock.now().getTime() / 1000))
      .setExpirationTime(Math.floor(ctx.clock.now().getTime() / 1000) + config.jwt.accessTtlSeconds)
      .setIssuer(config.jwt.issuer).setAudience(config.jwt.audience).sign(config.jwt.keys[0].secret);
    const learnerClaims = await claimToken(learnerSession, learner.userId);
    const editorClaims = await claimToken(editorSession, editor.userId);
    const revokedClaims = await claimToken(revokedSession, admin.userId);
    const usersBefore = await ctx.prisma.user.findMany({ orderBy: { id: 'asc' } });
    const revokedBefore = await ctx.prisma.sessionChain.findUniqueOrThrow({ where: { id: revokedSession.sessionChainId } });

    for (const route of routes) {
      const label = `${route.method} ${route.path}`;
      expect(route.permissions, label).not.toBeNull();
      const send = (token?: string) => {
        const method = (route.method === 'ALL' ? 'get' : route.method.toLowerCase()) as 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';
        const req: Test = ctx.http()[method](route.path.replace(/:[A-Za-z_][A-Za-z_0-9]*/g, placeholderId));
        req.set('Idempotency-Key', randomUUID()).send({});
        if (token) req.set('Authorization', `Bearer ${token}`);
        return req;
      };
      const refused = async (token: string | undefined, status: number, slug: string) => {
        const res = await send(token);
        expect(res.status, label).toBe(status);
        if (route.method !== 'HEAD') expect(res.body.type, label).toBe(problem(slug));
        expect(res.headers['content-type'], label).toContain('application/problem+json');
        expect(await ctx.prisma.user.findMany({ orderBy: { id: 'asc' } }), label).toEqual(usersBefore);
        expect(await ctx.prisma.sessionChain.findUniqueOrThrow({ where: { id: revokedSession.sessionChainId } }), label).toEqual(revokedBefore);
      };
      await refused(undefined, 401, 'invalid-token');
      await refused('invalid-token', 401, 'invalid-token');
      await refused(learnerSession.accessToken, 403, 'forbidden');
      await refused(learnerClaims, 403, 'forbidden');
      for (const missing of route.permissions!) {
        ctx.rolePermissions.editor = ROLE_PERMISSIONS.editor.filter((permission) => permission !== missing);
        try {
          await refused(editorSession.accessToken, 403, 'forbidden');
          await refused(editorClaims, 403, 'forbidden');
        } finally { ctx.rolePermissions.editor = [...ROLE_PERMISSIONS.editor]; }
      }
      await refused(revokedSession.accessToken, 403, 'forbidden');
      await refused(revokedClaims, 403, 'forbidden');
      // An admin-only permission (settings.manage) is granted to the editor's table here, so the editor holds all of them.
      ctx.rolePermissions.editor = [...new Set([...ROLE_PERMISSIONS.editor, ...route.permissions!])];
      try {
        for (const token of [adminSession.accessToken, editorSession.accessToken]) {
          const res = await send(token);
          expect([401, 403, 429], label).not.toContain(res.status);
          if (route.path === '/v1/admin/__permissions-control') {
            expect(res.status, label).toBe(201); expect(res.body, label).toEqual({ ok: true });
          }
        }
      } finally { ctx.rolePermissions.editor = [...ROLE_PERMISSIONS.editor]; }
    }
    expect((await ctx.prisma.user.findUniqueOrThrow({ where: { id: learner.userId } })).staffRole).toBeNull();
    expect((await ctx.prisma.user.findUniqueOrThrow({ where: { id: editor.userId } })).staffRole).toBe('editor');
    expect((await ctx.prisma.user.findUniqueOrThrow({ where: { id: admin.userId } })).staffRole).toBe('admin');
    expect((await ctx.prisma.sessionChain.findUniqueOrThrow({ where: { id: revokedSession.sessionChainId } })).revokedAt).toEqual(ctx.clock.now());
  });

  it('B2#67: GET /v1/me lists content.edit, content.publish, content.import and taxonomy.manage for admin and for editor, and settings.manage for admin only', async () => {
    for (const staffRole of ['admin', 'editor'] as const) {
      const user = await seedUser(ctx.prisma, { verified: true, staffRole });
      const token = (await startSession(ctx, user.userId)).accessToken;
      const res = await ctx.http().get('/v1/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.staff_role).toBe(staffRole);
      expect(res.body.permissions).toEqual(staffRole === 'admin'
        ? ['roles.manage', ...contentPermissions, 'settings.manage'] : contentPermissions);
    }
  });
});
