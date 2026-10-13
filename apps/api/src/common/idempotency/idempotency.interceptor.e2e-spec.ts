import { createHash, randomUUID } from 'node:crypto';
import {
  Body,
  Controller,
  INestApplication,
  Module,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { SampleModule } from '../../sample/sample.module.js';
import { testConfig } from '../../../test/support/test-config.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { CommonModule } from '../common.module.js';
import { PRISMA_CLIENT, PrismaModule } from '../db/prisma.module.js';
import { operationIdMiddleware } from '../logging/operation-id.middleware.js';
import { ProblemDetailsFilter } from '../problem-details/problem-details.filter.js';
import { fakeRequestUserMiddleware } from '../request-user/fake-request-user.middleware.js';
import { Idempotent } from './idempotent.decorator.js';
import { IdempotencyInterceptor } from './idempotency.interceptor.js';

let handlerCallCount = 0;

@Controller('test-idempotent')
class TestIdempotentController {
  @Post()
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  handle(@Body() body: unknown) {
    handlerCallCount += 1;
    return { received: body, handlerCallCount };
  }

  @Post('slow')
  @Idempotent({ timeoutSeconds: 0.3 })
  @UseInterceptors(IdempotencyInterceptor)
  async slow() {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { ok: true };
  }
}

@Module({
  imports: [
    CommonModule.forRoot(testConfig()),
    PrismaModule.forRoot({ connectionString: inject('databaseUrl') }),
    SampleModule,
  ],
  controllers: [TestIdempotentController],
  providers: [IdempotencyInterceptor],
})
class TestModule {}

describe('IdempotencyInterceptor (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [TestModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(operationIdMiddleware, fakeRequestUserMiddleware);
    app.setGlobalPrefix('v1');
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    handlerCallCount = 0;
  });

  it('missing Idempotency-Key header returns 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/test-idempotent')
      .set('X-Test-User-Id', randomUUID())
      .send({ a: 1 });
    expect(res.status).toBe(400);
  });

  it('same key + same body replays the first response without re-running the handler', async () => {
    const key = randomUUID();
    const userId = randomUUID();
    const first = await request(app.getHttpServer())
      .post('/v1/test-idempotent')
      .set('Idempotency-Key', key)
      .set('X-Test-User-Id', userId)
      .send({ a: 1 });
    const second = await request(app.getHttpServer())
      .post('/v1/test-idempotent')
      .set('Idempotency-Key', key)
      .set('X-Test-User-Id', userId)
      .send({ a: 1 });
    expect(second.body).toEqual(first.body);
    expect(handlerCallCount).toBe(1);
  });

  it('same key + different body returns a Problem Details error', async () => {
    const key = randomUUID();
    const userId = randomUUID();
    await request(app.getHttpServer())
      .post('/v1/test-idempotent')
      .set('Idempotency-Key', key)
      .set('X-Test-User-Id', userId)
      .send({ a: 1 });
    const res = await request(app.getHttpServer())
      .post('/v1/test-idempotent')
      .set('Idempotency-Key', key)
      .set('X-Test-User-Id', userId)
      .send({ a: 2 });
    expect(res.status).toBe(400); // S5: Problem Details rejection, not 409 — 409 is reserved for in-flight
  });

  it('JSON requests without a file through the existing sample route replay the exact pre-multipart payload hash', async () => {
    const key = randomUUID();
    const userId = randomUUID();
    const body = { a: 1, nested: { items: ['one', 'two'] }, empty: null };
    const payloadHash = createHash('sha256').update(JSON.stringify(body)).digest('hex');
    const responseBody = { receivedAt: '2026-10-12T12:00:00.000Z' };
    const prisma = app.get<PrismaClient>(PRISMA_CLIENT);
    // A row produced by the old formula must still replay after the interceptor gains file support.
    await prisma.idempotencyKey.create({ data: {
      key, userId, endpoint: '/v1/sample', status: 'succeeded', payloadHash,
      responseStatus: 201, responseBody,
    } });
    const res = await request(app.getHttpServer()).post('/v1/sample')
      .set('Idempotency-Key', key).set('X-Test-User-Id', userId).send(body);
    expect(res.status).toBe(201);
    expect(res.body).toEqual(responseBody);
    expect(await prisma.idempotencyKey.findUniqueOrThrow({
      where: { key_userId_endpoint: { key, userId, endpoint: '/v1/sample' } },
    })).toMatchObject({ status: 'succeeded', payloadHash, responseBody });
  });

  it('a custom @Idempotent({ timeoutSeconds }) is honored — a slower handler gets a Problem Details error instead of hanging', async () => {
    const started = Date.now();
    const res = await request(app.getHttpServer())
      .post('/v1/test-idempotent/slow')
      .set('Idempotency-Key', randomUUID())
      .set('X-Test-User-Id', randomUUID())
      .send({});
    expect(Date.now() - started).toBeLessThan(500); // bounded by the 0.3s timeout, not the 0.6s handler
    expect(res.status).toBe(500);
    expect(res.headers['content-type']).toContain('application/problem+json');
  });
});
