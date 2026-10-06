import { randomUUID } from 'node:crypto';
import { Controller, Get, INestApplication, Module, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { DrizzleModule } from '../db/drizzle.module.js';
import { operationIdMiddleware } from '../logging/operation-id.middleware.js';
import { ProblemDetailsFilter } from '../problem-details/problem-details.filter.js';
import { fakeRequestUserMiddleware } from '../request-user/fake-request-user.middleware.js';
import { RateLimit } from './rate-limit.decorator.js';
import { RateLimitGuard } from './rate-limit.guard.js';

@Controller('test-rate-limited')
class TestRateLimitedController {
  @Get()
  @RateLimit({ max: 3, windowSeconds: 60 })
  @UseGuards(RateLimitGuard)
  ping() {
    return { ok: true };
  }
}

@Module({
  imports: [DrizzleModule.forRoot({ connectionString: inject('databaseUrl') })],
  controllers: [TestRateLimitedController],
  providers: [RateLimitGuard],
})
class TestModule {}

describe('RateLimitGuard (e2e)', () => {
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

  it('allows up to max requests, then returns 429 with Retry-After', async () => {
    const userId = randomUUID();
    for (let i = 0; i < 3; i++) {
      const res = await request(app.getHttpServer())
        .get('/v1/test-rate-limited')
        .set('X-Test-User-Id', userId);
      expect(res.status).toBe(200);
    }
    const fourth = await request(app.getHttpServer())
      .get('/v1/test-rate-limited')
      .set('X-Test-User-Id', userId);
    expect(fourth.status).toBe(429);
    expect(fourth.headers['retry-after']).toBeDefined();
  });

  it('N concurrent requests at the boundary never let more than max through', async () => {
    const userId = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app.getHttpServer()).get('/v1/test-rate-limited').set('X-Test-User-Id', userId),
      ),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(3);
  });
});
