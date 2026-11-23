import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../test/support/create-test-app.js';
import { PRISMA_CLIENT, PrismaModule } from './common/db/prisma.module.js';

describe('CORS origins per API host (SEC-01)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({
      module: PrismaModule,
      global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: { $disconnect: async () => {} } }],
      exports: [PRISMA_CLIENT],
    });
    ctx = await createTestApp({
      databaseUrl: 'unused',
      config: {
        corsOrigins: ['https://wordmet.com', 'https://www.wordmet.com', 'https://admin.wordmet.com'],
        adminAppUrl: 'https://admin.wordmet.com',
      },
    });
  });

  afterAll(async () => {
    await ctx?.close();
    vi.restoreAllMocks();
  });

  it('refuses learner origin on admin-api host', async () => {
    const res = await ctx.http()
      .options('/v1/auth/refresh')
      .set('Host', 'admin-api.wordmet.com')
      .set('Origin', 'https://wordmet.com')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows admin origin with credentials on admin-api host', async () => {
    const res = await ctx.http()
      .options('/v1/auth/refresh')
      .set('Host', 'admin-api.wordmet.com')
      .set('Origin', 'https://admin.wordmet.com')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://admin.wordmet.com');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('enforces the same restriction when admin-api host has uppercase letters and port', async () => {
    const denied = await ctx.http()
      .options('/v1/auth/refresh')
      .set('Host', 'ADMIN-API.wordmet.com:443')
      .set('Origin', 'https://wordmet.com')
      .set('Access-Control-Request-Method', 'POST');
    expect(denied.status).toBe(204);
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();

    const allowed = await ctx.http()
      .options('/v1/auth/refresh')
      .set('Host', 'ADMIN-API.wordmet.com:443')
      .set('Origin', 'https://admin.wordmet.com')
      .set('Access-Control-Request-Method', 'POST');
    expect(allowed.status).toBe(204);
    expect(allowed.headers['access-control-allow-origin']).toBe('https://admin.wordmet.com');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
  });

  it('keeps learner origin allowed on the public api host', async () => {
    const res = await ctx.http()
      .options('/v1/auth/refresh')
      .set('Host', 'api.wordmet.com')
      .set('Origin', 'https://wordmet.com')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://wordmet.com');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });
});
