import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { IDEMPOTENT_KEY } from '../../common/idempotency/idempotent.decorator.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RATE_LIMIT_KEY } from '../../common/rate-limit/rate-limit.decorator.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { ROLE_PERMISSIONS } from '../../identity/identity.types.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { PublishJobsController } from './publish-jobs.controller.js';
import { PublishJobsService } from './publish-jobs.service.js';

const PROBLEM = 'https://api.example.com/problems/';
const BASE = '/v1/admin/content/senses/publish-jobs';

describe('publish jobs HTTP (unit, mocked service and database)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const jobId = randomUUID();
  const prisma = {
    sessionChain: { findUnique: vi.fn() },
    publishJob: { findUnique: vi.fn(), findMany: vi.fn() },
    $disconnect: async () => {},
  };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  let cancel: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => ctx.http();
  const row = (job: { status: string; errorSummary: string | null }) => ({
    id: jobId, filter: {}, snapshotCount: 10, notReadyCount: 0,
    counters: { processed: 4, pending: 6, published: 4, already_published: 0, refused: 0 },
    job: { ...job, createdAt: new Date('2026-10-28T08:00:00.000Z'), startedAt: new Date('2026-10-28T08:00:05.000Z'), finishedAt: null },
  });

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    // An editor without content.publish shows the permission on the route is that one and no other.
    ctx = await createTestApp({ databaseUrl: 'unused', rolePermissions: {
      admin: ROLE_PERMISSIONS.admin, editor: ROLE_PERMISSIONS.editor.filter((permission) => permission !== 'content.publish'),
    } });
    cancel = vi.spyOn(ctx.app.get(PublishJobsService), 'cancel');
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'admin';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    prisma.publishJob.findUnique.mockReset().mockResolvedValue(row({ status: 'failed', errorSummary: 'cancelled' }));
    prisma.publishJob.findMany.mockReset().mockResolvedValue([]);
    cancel.mockReset().mockResolvedValue(undefined);
    hit.mockReset().mockResolvedValue(undefined);
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('every route needs content.publish; cancel is a POST with the user.write limit and no Idempotency-Key (a second cancel must answer 409, not replay)', () => {
    const routes = listRoutes(ctx.app).filter(({ path }) => path.startsWith(BASE));
    expect(routes.map(({ method, path }) => `${method} ${path}`).sort()).toEqual([
      `GET ${BASE}`, `GET ${BASE}/:id`, `GET ${BASE}/:id/report.csv`, `POST ${BASE}`, `POST ${BASE}/:id/cancel`,
    ]);
    for (const route of routes) expect(route.permissions, `${route.method} ${route.path}`).toEqual(['content.publish']);
    const reflector = new Reflector();
    expect(reflector.get(RATE_LIMIT_KEY, PublishJobsController.prototype.cancel)).toEqual(['user.write']);
    expect(reflector.get(IDEMPOTENT_KEY, PublishJobsController.prototype.cancel)).toBeUndefined();
    expect(reflector.get(IDEMPOTENT_KEY, PublishJobsController.prototype.create)).toBeDefined();
  });

  it('POST :id/cancel → 200 with the job as GET :id shows it now, marked cancelled; the actor goes to the service; user.write counted', async () => {
    const res = await http().post(`${BASE}/${jobId.toUpperCase()}/cancel`).set(auth());

    expect(res.status).toBe(200);
    expect(cancel).toHaveBeenCalledWith(jobId, actorId);
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
    expect(res.body).toEqual({
      id: jobId, status: 'failed', cancelled: true, snapshot_count: 10, not_ready_count: 0,
      counters: { processed: 4, pending: 6, published: 4, already_published: 0, refused: 0 },
      created_at: '2026-10-28T08:00:00.000Z', started_at: '2026-10-28T08:00:05.000Z', finished_at: null,
    });
  });

  it('a job that ended → 409 job-not-active; an unknown id → 404 not-found (the service decides, the controller passes it on)', async () => {
    cancel.mockRejectedValueOnce(new ProblemDetailsException({ status: 409, title: 'Job not active', type: 'job-not-active' }));
    const ended = await http().post(`${BASE}/${jobId}/cancel`).set(auth());
    expect(ended.status).toBe(409);
    expect(ended.body.type).toBe(`${PROBLEM}job-not-active`);

    cancel.mockRejectedValueOnce(new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' }));
    const missing = await http().post(`${BASE}/${jobId}/cancel`).set(auth());
    expect(missing.status).toBe(404);
    expect(missing.body.type).toBe(`${PROBLEM}not-found`);
  });

  it('a malformed id → 400 before the service', async () => {
    const res = await http().post(`${BASE}/nope/cancel`).set(auth());
    expect(res.status).toBe(400);
    expect(res.body.type).toBe(`${PROBLEM}validation-failed`);
    expect(cancel).not.toHaveBeenCalled();
  });

  it('a learner, and an editor without content.publish → 403, the service is not reached', async () => {
    role = null;
    expect((await http().post(`${BASE}/${jobId}/cancel`).set(auth())).status).toBe(403);
    role = 'editor';
    expect((await http().post(`${BASE}/${jobId}/cancel`).set(auth())).status).toBe(403);
    expect(cancel).not.toHaveBeenCalled();
  });

  it('GET :id tells a cancelled job from a real failure; only status failed with the "cancelled" summary counts', async () => {
    const detail = async (job: { status: string; errorSummary: string | null }) => {
      prisma.publishJob.findUnique.mockResolvedValue(row(job));
      return (await http().get(`${BASE}/${jobId}`).set(auth())).body;
    };

    expect(await detail({ status: 'failed', errorSummary: 'cancelled' })).toMatchObject({ status: 'failed', cancelled: true });
    expect(await detail({ status: 'failed', errorSummary: 'Error: boom' })).toMatchObject({ status: 'failed', cancelled: false });
    expect(await detail({ status: 'failed', errorSummary: 'lease expired after max attempts' })).toMatchObject({ cancelled: false });
    expect(await detail({ status: 'running', errorSummary: null })).toMatchObject({ status: 'running', cancelled: false });
    expect(await detail({ status: 'succeeded', errorSummary: null })).toMatchObject({ status: 'succeeded', cancelled: false });
  });

  it('GET (list) carries the same flag on every row', async () => {
    prisma.publishJob.findMany.mockResolvedValue([row({ status: 'failed', errorSummary: 'cancelled' }), row({ status: 'failed', errorSummary: 'Error: boom' })]);

    const res = await http().get(`${BASE}?page_size=20`).set(auth());

    expect(res.status).toBe(200);
    expect(res.body.items.map((item: { status: string; cancelled: boolean }) => [item.status, item.cancelled]))
      .toEqual([['failed', true], ['failed', false]]);
  });
});
