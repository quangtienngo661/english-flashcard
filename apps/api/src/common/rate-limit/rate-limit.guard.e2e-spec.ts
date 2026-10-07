import { randomUUID } from 'node:crypto';
import { Controller, Get } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { configureApp } from '../../app.setup.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { testConfig } from '../../../test/support/test-config.js';
import { Clock, FakeClock } from '../clock/clock.js';
import { CommonModule } from '../common.module.js';
import { DEFAULT_LIMITS } from '../config/app-config.js';
import { PRISMA_CLIENT, PrismaModule } from '../db/prisma.module.js';
import { fakeRequestUserMiddleware } from '../request-user/fake-request-user.middleware.js';
import { RateLimit } from './rate-limit.decorator.js';

@Controller('test-rate-limited')
class TestRateLimitedController {
  @Get()
  @RateLimit('sample.create')
  ping() {
    return { ok: true };
  }

  @Get('rule-a')
  @RateLimit('auth.otp.email.cooldown')
  ruleA() {
    return { ok: true };
  }

  @Get('rule-b')
  @RateLimit('auth.otp.email.hourly')
  ruleB() {
    return { ok: true };
  }
}

describe('RateLimitGuard (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaClient;
  const clock = new FakeClock();
  const config = testConfig({
    limits: {
      ...DEFAULT_LIMITS,
      'sample.create': { by: 'user', max: 3, windowSeconds: 60 },
      'auth.otp.email.cooldown': { by: 'user', max: 2, windowSeconds: 60 },
      'auth.otp.email.hourly': { by: 'user', max: 2, windowSeconds: 3600 },
    },
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        CommonModule.forRoot(config),
        PrismaModule.forRoot({ connectionString: inject('databaseUrl') }),
      ],
      controllers: [TestRateLimitedController],
    }).overrideProvider(Clock).useValue(clock).compile();
    prisma = moduleRef.get<PrismaClient>(PRISMA_CLIENT);
    app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
    configureApp(app, config);
    app.use(fakeRequestUserMiddleware);
    await app.init();
  });

  beforeEach(() => clock.set(new Date('2026-10-07T12:00:00.000Z')));

  afterAll(async () => {
    try {
      await prisma.$disconnect();
    } finally {
      await app.close();
    }
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
    expect(fourth.headers['retry-after']).toBe('60');
    expect(fourth.headers['content-type']).toContain('application/problem+json');
    expect(fourth.body).toMatchObject({
      type: `${config.problemTypeBase}rate-limited`,
      title: 'Too many requests',
      operation_id: expect.any(String),
    });
    expect(await prisma.rateLimitCounter.findUnique({
      where: { key_windowStart: { key: `sample.create:user:${userId}`, windowStart: clock.now() } },
    })).toMatchObject({ count: 4 });
  });

  it('N concurrent requests at the boundary never let more than max through', async () => {
    const userId = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app.getHttpServer()).get('/v1/test-rate-limited').set('X-Test-User-Id', userId),
      ),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(3);
    expect(results.filter((r) => r.status === 429)).toHaveLength(7);
    expect(await prisma.rateLimitCounter.findUnique({
      where: { key_windowStart: { key: `sample.create:user:${userId}`, windowStart: clock.now() } },
    })).toMatchObject({ count: 10 });
  });

  it('B1#33: two rules with different windows on the same subject never share a counter', async () => {
    const userId = randomUUID();
    const hit = (rule: string) => request(app.getHttpServer())
      .get(`/v1/test-rate-limited/${rule}`).set('X-Test-User-Id', userId);
    for (const rule of ['rule-a', 'rule-b']) {
      expect((await hit(rule)).status).toBe(200);
      expect((await hit(rule)).status).toBe(200);
      const rejected = await hit(rule);
      expect(rejected.status).toBe(429);
      expect(rejected.headers['retry-after']).toBe(rule === 'rule-a' ? '60' : '3600');
    }
    const rows = await prisma.rateLimitCounter.findMany({
      where: { key: { in: [
        `auth.otp.email.cooldown:user:${userId}`, `auth.otp.email.hourly:user:${userId}`,
      ] } },
    });
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.count === 3 && row.windowStart.getTime() === clock.now().getTime()))
      .toBe(true);
  });

  it('the window resets when the FakeClock crosses it', async () => {
    const userId = randomUUID();
    clock.advance(59_250);
    const hit = () => request(app.getHttpServer())
      .get('/v1/test-rate-limited').set('X-Test-User-Id', userId);
    for (let i = 0; i < 3; i++) expect((await hit()).status).toBe(200);
    const rejected = await hit();
    expect(rejected.status).toBe(429);
    expect(rejected.headers['retry-after']).toBe('1');
    clock.advance(750);
    expect((await hit()).status).toBe(200);
    const rows = await prisma.rateLimitCounter.findMany({
      where: { key: `sample.create:user:${userId}` }, orderBy: { windowStart: 'asc' },
    });
    expect(rows.map((row) => ({ windowStart: row.windowStart, count: row.count }))).toEqual([
      { windowStart: new Date('2026-10-07T12:00:00.000Z'), count: 4 },
      { windowStart: new Date('2026-10-07T12:01:00.000Z'), count: 1 },
    ]);
  });
});
