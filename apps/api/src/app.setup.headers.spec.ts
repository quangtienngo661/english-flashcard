import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PRISMA_CLIENT, PrismaModule } from './common/db/prisma.module.js';
import { createTestApp, type TestApp } from '../test/support/create-test-app.js';

// Persistence is not needed: GET /v1/health touches no table.
describe('API security headers (launch prep A, LA1#11)', () => {
  let ctx: TestApp;
  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: { $disconnect: async () => {} } }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('LA1#11: GET /v1/health carries exactly the JSON-API header set', async () => {
    const res = await ctx.http().get('/v1/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    // helmet writes the directives joined by ";" with no space; CSP allows that. The design text shows a space after ";".
    expect(res.headers['content-security-policy']).toBe("default-src 'none';frame-ancestors 'none'");
    expect(res.headers['cross-origin-resource-policy']).toBe('same-site');
    expect(res.headers['x-powered-by']).toBeUndefined();
    // Cloudflare sets HSTS at the edge (design 4.4); the API must not.
    expect(res.headers['strict-transport-security']).toBeUndefined();
  });

  it('adds no other helmet header the API does not want', async () => {
    const res = await ctx.http().get('/v1/health');
    for (const name of ['cross-origin-opener-policy', 'cross-origin-embedder-policy', 'origin-agent-cluster', 'x-dns-prefetch-control',
      'x-download-options', 'x-frame-options', 'x-permitted-cross-domain-policies', 'x-xss-protection']) {
      expect(res.headers[name], name).toBeUndefined();
    }
  });

  it('keeps CORS working: a preflight from a configured origin is answered with that origin and credentials', async () => {
    const origin = ctx.app.get<{ corsOrigins: string[] }>('APP_CONFIG').corsOrigins[0] as string;
    const res = await ctx.http().options('/v1/auth/login').set('Origin', origin).set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });
});
