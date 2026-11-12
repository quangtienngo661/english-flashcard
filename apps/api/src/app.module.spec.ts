import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PRISMA_CLIENT, PrismaModule } from './common/db/prisma.module.js';
import { createTestApp, type TestApp } from '../test/support/create-test-app.js';
import { listRoutes } from '../test/support/list-routes.js';

// Security review 07/11 F10: the Bước 0 scaffold `/v1/sample` is dead attack surface and must not be registered.
describe('AppModule routes (unit, isolated persistence)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: { $disconnect: async () => {} } }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('registers no /v1/sample route (control: /v1/auth/login is listed)', () => {
    const paths = listRoutes(ctx.app).map(({ method, path }) => `${method} ${path}`);
    expect(paths).toContain('POST /v1/auth/login');
    expect(paths.filter((route) => route.includes('/v1/sample'))).toEqual([]);
  });

  it('GET and POST /v1/sample answer 404', async () => {
    expect((await ctx.http().get('/v1/sample')).status).toBe(404);
    expect((await ctx.http().post('/v1/sample').send({})).status).toBe(404);
  });
});
