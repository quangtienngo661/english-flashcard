import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AccessTokenService } from '../../src/identity/sessions/access-token.service.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';

describe('Global AuthGuard (e2e)', () => {
  let testApp: TestApp;
  let tokens: AccessTokenService;

  beforeAll(async () => {
    testApp = await createTestApp();
    tokens = testApp.app.get(AccessTokenService);
  });

  afterAll(async () => {
    await testApp?.close();
  });

  it('B1#14: POST /v1/sample without Authorization returns 401 invalid-token', async () => {
    const res = await testApp.http().post('/v1/sample').send({});
    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body).toMatchObject({
      type: 'https://api.example.com/problems/invalid-token', status: 401,
      title: 'Invalid token', operation_id: expect.any(String),
    });
  });

  it('B1#14: a signed token reaches the handler and supplies the user before rate limiting', async () => {
    const user = { userId: randomUUID(), sessionChainId: randomUUID() };
    const token = await tokens.sign(user);
    const res = await testApp.http().post('/v1/sample')
      .set('Authorization', `Bearer ${token}`).set('Idempotency-Key', randomUUID()).send({});
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ receivedAt: expect.any(String) });
    expect(testApp.logs).toContainEqual({
      level: 'info', event: 'sample.create', user_id: user.userId, operation_id: expect.any(String),
    });
    const rows = await testApp.prisma.rateLimitCounter.findMany({
      where: { key: `sample.create:user:${user.userId}` },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(1);
  });

  it('B1#31: X-Test-User-Id alone returns 401 before rate limiting or the handler', async () => {
    const userId = randomUUID();
    const res = await testApp.http().post('/v1/sample')
      .set('X-Test-User-Id', userId).set('Idempotency-Key', randomUUID()).send({});
    expect(res.status).toBe(401);
    expect(res.body.type).toBe('https://api.example.com/problems/invalid-token');
    expect(testApp.logs.some((entry) => entry.user_id === userId)).toBe(false);
    expect(await testApp.prisma.rateLimitCounter.count({ where: { key: `sample.create:user:${userId}` } }))
      .toBe(0);
  });

  it.each(['/v1/health', '/v1/sample'])('B1#14: GET %s stays public', async (path) => {
    const res = await testApp.http().get(path);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(path === '/v1/health' ? { status: 'ok' } : { items: [], next_page_token: null });
  });

  it.each(['/v1/health', '/v1/sample'])('B1#14: a public route %s with an invalid Bearer still answers', async (path) => {
    const res = await testApp.http().get(path).set('Authorization', 'Bearer invalid');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(path === '/v1/health' ? { status: 'ok' } : { items: [], next_page_token: null });
  });
});
