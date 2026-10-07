import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from './support/create-test-app.js';
import { createIsolatedDatabase } from './support/isolated-database.js';

const problemTypeBase = 'https://api.example.com/problems/';
const origin = 'https://app.example.com';

describe('Shared app setup', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp({ config: { problemTypeBase, corsOrigins: [origin] } });
  });

  afterAll(async () => {
    await testApp?.close();
  });

  it('Review Focus #3: invalid JSON → 400 validation-failed problem+json with operation_id', async () => {
    const res = await testApp.http().post('/v1/sample').set('Content-Type', 'application/json').send('{');
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body).toMatchObject({ status: 400, type: `${problemTypeBase}validation-failed` });
    expect(res.body.operation_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('B1#36: a 101 KB JSON body → 413 payload-too-large with operation_id', async () => {
    const res = await testApp.http().post('/v1/sample').send({ padding: 'x'.repeat(101 * 1024) });
    expect(res.status).toBe(413);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body).toMatchObject({ status: 413, type: `${problemTypeBase}payload-too-large` });
    expect(res.body.operation_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.operation_id).not.toBe((await testApp.http().post('/v1/sample')
      .set('Content-Type', 'application/json').send('{')).body.operation_id);
  });

  it('Review Focus #3: unsupported charset, unsupported encoding and corrupt gzip bodies are client errors, never 500', async () => {
    const charset = await testApp.http().post('/v1/sample')
      .set('Content-Type', 'application/json; charset=klingon').send('{}');
    expect(charset.status).toBe(415);
    expect(charset.body).toMatchObject({ type: `${problemTypeBase}unsupported-media-type` });

    const encoding = await testApp.http().post('/v1/sample')
      .set('Content-Type', 'application/json').set('Content-Encoding', 'klingon').send('{}');
    expect(encoding.status).toBe(415);

    const gzip = await testApp.http().post('/v1/sample')
      .set('Content-Type', 'application/json').set('Content-Encoding', 'gzip').send('not gzip at all');
    expect(gzip.status).toBe(400);
    expect(gzip.body).toMatchObject({ type: `${problemTypeBase}validation-failed` });
    expect(gzip.body.operation_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('GET /v1/health returns 200 through configureApp', async () => {
    const res = await testApp.http().get('/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('D13: CORS preflight from a configured origin allows credentials and X-CSRF-Protection; an unlisted origin gets no Access-Control-Allow-Origin', async () => {
    const res = await testApp.http().options('/v1/sample').set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'X-CSRF-Protection');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['access-control-allow-headers'].toLowerCase()).toContain('x-csrf-protection');
    const unlisted = await testApp.http().options('/v1/sample').set('Origin', 'https://unlisted.example.com')
      .set('Access-Control-Request-Method', 'POST');
    expect(unlisted.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('createIsolatedDatabase returns a migrated empty database', async () => {
    const databaseUrl = await createIsolatedDatabase();
    const isolated = await createTestApp({ databaseUrl });
    try {
      expect(await isolated.prisma.idempotencyKey.count()).toBe(0);
      expect(await isolated.prisma.rateLimitCounter.count()).toBe(0);
      const client = new pg.Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const result = await client.query('SELECT COUNT(*)::int AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL');
        expect(result.rows[0].count).toBeGreaterThan(0);
      } finally {
        await client.end();
      }
    } finally {
      await isolated.close();
    }
  });
});
