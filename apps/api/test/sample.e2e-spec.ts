import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { configureApp } from '../src/app.setup.js';
import { CommonModule } from '../src/common/common.module.js';
import { PrismaModule } from '../src/common/db/prisma.module.js';
import { LOG_SINK, type LogEntry, type LogSink } from '../src/common/logging/app-logger.js';
// TEST-ONLY seam (B0E6): wired directly on this standalone test app, never on the real AppModule.
import { fakeRequestUserMiddleware } from '../src/common/request-user/fake-request-user.middleware.js';
import { SampleModule } from '../src/sample/sample.module.js';
import { testConfig } from './support/test-config.js';

describe('Sample endpoint (e2e)', () => {
  let app: NestExpressApplication;
  const config = testConfig();
  const logs: LogEntry[] = [];
  const sink: LogSink = { write: (entry) => { logs.push(entry); } };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        CommonModule.forRoot(config),
        PrismaModule.forRoot({ connectionString: inject('databaseUrl') }),
        SampleModule,
      ],
    }).overrideProvider(LOG_SINK).useValue(sink).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
    configureApp(app, config);
    app.use(fakeRequestUserMiddleware);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /v1/sample with Idempotency-Key writes a log entry carrying operation_id', async () => {
    const userId = randomUUID();
    const res = await request(app.getHttpServer())
      .post('/v1/sample')
      .set('Idempotency-Key', randomUUID())
      .set('X-Test-User-Id', userId)
      .send({});
    expect(res.status).toBe(201);
    expect(logs.filter((entry) => entry.user_id === userId)).toEqual([{
      level: 'info', event: 'sample.create', user_id: userId,
      operation_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
    }]);
  });

  it('POST /v1/sample with a bad Idempotency-Key payload mismatch returns Problem Details', async () => {
    const key = randomUUID();
    const userId = randomUUID();
    await request(app.getHttpServer())
      .post('/v1/sample')
      .set('Idempotency-Key', key)
      .set('X-Test-User-Id', userId)
      .send({ a: 1 });
    const res = await request(app.getHttpServer())
      .post('/v1/sample')
      .set('Idempotency-Key', key)
      .set('X-Test-User-Id', userId)
      .send({ a: 2 });
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body.operation_id).toBeDefined();
  });

  it('Review Focus #1 end-to-end: two real concurrent POSTs with the same key never double-execute', async () => {
    // Exact timing (one 2xx + one 409, or two 2xx if the first finishes before the second's lock
    // attempt and the second replays) is non-deterministic and both are correct. What must always
    // hold: at least one succeeds, neither is a hard rejection, and two successes must carry the
    // identical stored result rather than two independently-run bodies.
    const key = randomUUID();
    const userId = randomUUID();
    const [a, b] = await Promise.all([
      request(app.getHttpServer())
        .post('/v1/sample')
        .set('Idempotency-Key', key)
        .set('X-Test-User-Id', userId)
        .send({ a: 1 }),
      request(app.getHttpServer())
        .post('/v1/sample')
        .set('Idempotency-Key', key)
        .set('X-Test-User-Id', userId)
        .send({ a: 1 }),
    ]);
    expect([a.status, b.status].some((s) => s < 300)).toBe(true);
    expect([a.status, b.status]).not.toContain(400);
    if (a.status < 300 && b.status < 300) {
      expect(a.body).toEqual(b.body);
    }
  });

  it('GET /v1/sample with a malformed page_token returns 400 Problem Details', async () => {
    const res = await request(app.getHttpServer()).get('/v1/sample?page_token=not-real');
    expect(res.status).toBe(400);
  });

  it('GET /v1/sample returns a paginated envelope', async () => {
    const res = await request(app.getHttpServer()).get('/v1/sample?page_size=1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('next_page_token');
  });
});
