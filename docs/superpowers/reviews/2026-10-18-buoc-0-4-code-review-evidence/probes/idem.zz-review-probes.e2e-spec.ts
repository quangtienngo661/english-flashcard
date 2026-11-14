// Review probes (independent review 18/10/2026) — not part of the product suite; lives only in the review worktree.
import { Controller, Inject, type INestApplication, Module, Post, Req, UseInterceptors } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { CommonModule } from '../../src/common/common.module.js';
import { PRISMA_CLIENT, PrismaModule } from '../../src/common/db/prisma.module.js';
import { Idempotent } from '../../src/common/idempotency/idempotent.decorator.js';
import { IdempotencyInterceptor } from '../../src/common/idempotency/idempotency.interceptor.js';
import { operationIdMiddleware } from '../../src/common/logging/operation-id.middleware.js';
import { ProblemDetailsFilter } from '../../src/common/problem-details/problem-details.filter.js';
import { fakeRequestUserMiddleware } from '../../src/common/request-user/fake-request-user.middleware.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SampleModule } from '../../src/sample/sample.module.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { testConfig } from '../support/test-config.js';

const out = (...a: unknown[]) => appendFileSync(process.env.PROBE_OUT ?? 'probe.out', a.join(' ') + '\n');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const callsByKey = new Map<string, number>();

@Controller('probe-idem')
class ProbeIdemController {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  @Post()
  @Idempotent({ timeoutSeconds: 0.5 })
  @UseInterceptors(IdempotencyInterceptor)
  async create(@Req() req: { user?: { userId: string }; headers: Record<string, string> }) {
    const key = req.headers['idempotency-key'];
    const call = (callsByKey.get(key) ?? 0) + 1;
    callsByKey.set(key, call);
    if (call === 1) await sleep(900); // only the first run of a key is slow
    const now = new Date();
    const name = `probe-${call}-${randomUUID()}`;
    await this.prisma.learningGroup.create({ data: { userId: req.user!.userId, name, nameKey: name, createdAt: now, updatedAt: now } });
    return { call };
  }
}

@Module({
  imports: [CommonModule.forRoot(testConfig()), PrismaModule.forRoot({ connectionString: inject('databaseUrl') }), SampleModule],
  controllers: [ProbeIdemController],
  providers: [IdempotencyInterceptor],
})
class ProbeModule {}

describe('review probes: DB10 handler outside the key transaction', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ProbeModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(operationIdMiddleware, fakeRequestUserMiddleware);
    app.setGlobalPrefix('v1');
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    prisma = app.get(PRISMA_CLIENT);
  });
  afterAll(async () => { await app?.close(); });
  const post = (user: string, key: string) => request(app.getHttpServer()).post('/v1/probe-idem')
    .set('Idempotency-Key', key).set('X-Test-User-Id', user).send({ same: 'body' });

  it('DB10a: the first run times out (key timeout 0.5 s, handler 0.9 s); the same key is sent again after the first run ended', async () => {
    const user = randomUUID();
    const key = randomUUID();
    const t = Date.now();
    const r1 = await post(user, key);
    out(`DB10a first send: status ${r1.status} after ${Date.now() - t} ms`, JSON.stringify(r1.body).slice(0, 160));
    await sleep(1000);
    out('DB10a after the first run ended: groups', await prisma.learningGroup.count({ where: { userId: user } }),
      'idempotency rows for the key', await prisma.idempotencyKey.count({ where: { key } }));
    const r2 = await post(user, key);
    await sleep(200);
    out(`DB10a same key again: status ${r2.status}`, JSON.stringify(r2.body).slice(0, 160), 'handler runs', callsByKey.get(key),
      'groups', await prisma.learningGroup.count({ where: { userId: user } }));
  });

  it('DB10b: the same key is sent again while the first run is still inside its handler', async () => {
    const user = randomUUID();
    const key = randomUUID();
    const first = post(user, key).then((r) => r);
    await sleep(600);
    const r2 = await post(user, key);
    const r1 = await first;
    await sleep(600);
    out(`DB10b first: ${r1.status}; second (sent at 0.6 s): ${r2.status}`, JSON.stringify(r2.body).slice(0, 160),
      'handler runs', callsByKey.get(key), 'groups', await prisma.learningGroup.count({ where: { userId: user } }));
    expect(true).toBe(true);
  });
});

describe('review probes: DB11 concurrent idempotent writes vs the 10-connection pool', () => {
  let ctx: TestApp;
  const tokens: string[] = [];
  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
    for (let i = 0; i < 14; i += 1) {
      const { userId } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
      tokens.push((await startSession(ctx, userId)).accessToken);
    }
  }, 300_000);
  afterAll(async () => { await ctx?.close(); });

  const burst = async (label: string, n: number) => {
    const started = Date.now();
    const results = await Promise.all(tokens.slice(0, n).map(async (token, i) => {
      const t = Date.now();
      const r = await ctx.http().post('/v1/groups').set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID()).send({ name: `${label} ${i} ${randomUUID().slice(0, 8)}` });
      return { status: r.status, ms: Date.now() - t, type: (r.body as { type?: string }).type };
    }));
    const statuses = results.map((r) => r.status).sort().join(',');
    out(`DB11 ${label}: ${n} concurrent POST /v1/groups (distinct users and keys) → statuses [${statuses}]; slowest ${Math.max(...results.map((r) => r.ms))} ms;`
      + ` total ${Date.now() - started} ms; error types ${[...new Set(results.filter((r) => r.status >= 400).map((r) => r.type))].join(' ')}`);
  };

  it('DB11: 4, 9, 10 and 14 concurrent idempotent writes', async () => {
    await burst('warm-up', 2);
    await burst('n4', 4);
    await burst('n9', 9);
    await burst('n10', 10);
    await burst('n14', 14);
    expect(true).toBe(true);
  }, 300_000);
});
