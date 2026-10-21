import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { IDEMPOTENT_KEY } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { AdminReportReasonsController } from './admin-report-reasons.controller.js';
import { ReportReasonsService } from './report-reasons.service.js';

const PROBLEM = 'https://api.example.com/problems/';

describe('report reasons HTTP (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  let nativeLanguage: 'vi' | 'en' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  const passThrough = vi.spyOn(IdempotencyInterceptor.prototype, 'intercept');
  let learnerList: ReturnType<typeof vi.spyOn>; let adminList: ReturnType<typeof vi.spyOn>;
  let create: ReturnType<typeof vi.spyOn>; let update: ReturnType<typeof vi.spyOn>; let profile: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => ctx.http();
  const validCreate = {
    code: 'ai_typo', label_vi: 'Lỗi chính tả', label_en: 'Typo', applies_to: 'ai', note_required: false, refundable: true, position: 8,
  };

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const reasons = ctx.app.get(ReportReasonsService);
    learnerList = vi.spyOn(reasons, 'learnerList'); adminList = vi.spyOn(reasons, 'adminList');
    create = vi.spyOn(reasons, 'create'); update = vi.spyOn(reasons, 'update');
    profile = vi.spyOn(ctx.app.get(IdentityService), 'getProfile');
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'admin'; nativeLanguage = 'vi';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    profile.mockReset().mockImplementation(async () => ({ native_language: nativeLanguage }));
    learnerList.mockReset().mockResolvedValue({ items: [] }); adminList.mockReset().mockResolvedValue({ items: [] });
    create.mockReset().mockResolvedValue({ code: 'ai_typo' }); update.mockReset().mockResolvedValue({ code: 'other' });
    hit.mockReset().mockResolvedValue(undefined);
    passThrough.mockReset().mockImplementation((_context, next) => next.handle());
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('admin routes need settings.manage; the learner route needs no staff permission', () => {
    expect(listRoutes(ctx.app).filter(({ path }) => path.includes('report-reasons'))).toEqual([
      { method: 'GET', path: '/v1/admin/practice/report-reasons', permissions: ['settings.manage'] },
      { method: 'POST', path: '/v1/admin/practice/report-reasons', permissions: ['settings.manage'] },
      { method: 'PATCH', path: '/v1/admin/practice/report-reasons/:code', permissions: ['settings.manage'] },
      { method: 'GET', path: '/v1/practice/report-reasons', permissions: null },
    ]);
  });

  it('the learner list is read in the learner language for the kind asked', async () => {
    role = null; nativeLanguage = 'en';
    expect((await http().get('/v1/practice/report-reasons').set(auth()).query({ kind: 'non_ai' })).status).toBe(200);
    expect(learnerList).toHaveBeenCalledWith('non_ai', 'en');
    for (const query of [{}, { kind: 'rule' }]) {
      const res = await http().get('/v1/practice/report-reasons').set(auth()).query(query);
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(`${PROBLEM}validation-failed`);
    }
    expect(learnerList).toHaveBeenCalledTimes(1);
  });

  it('admin list, create and update reach the service with the actor; writes carry user.write', async () => {
    expect((await http().get('/v1/admin/practice/report-reasons').set(auth())).status).toBe(200);
    expect(adminList).toHaveBeenCalled();
    expect(hit).not.toHaveBeenCalled();
    expect((await http().post('/v1/admin/practice/report-reasons').set(auth()).set('Idempotency-Key', 'k1').send(validCreate)).status).toBe(201);
    expect(create).toHaveBeenCalledWith(actorId, validCreate);
    const patch = { label_en: 'Something else', active: false, detail_hint_vi: null };
    expect((await http().patch('/v1/admin/practice/report-reasons/other').set(auth()).send(patch)).status).toBe(200);
    expect(update).toHaveBeenCalledWith(actorId, 'other', patch);
    expect(hit).toHaveBeenCalledTimes(2);
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
  });

  it('bad bodies and codes → 400 validation-failed before the service', async () => {
    for (const request of [
      () => http().post('/v1/admin/practice/report-reasons').set(auth()).set('Idempotency-Key', 'k').send({ ...validCreate, code: 'Bad-Code' }),
      () => http().post('/v1/admin/practice/report-reasons').set(auth()).set('Idempotency-Key', 'k').send({ ...validCreate, code: 'a' }),
      () => http().post('/v1/admin/practice/report-reasons').set(auth()).set('Idempotency-Key', 'k').send({ ...validCreate, applies_to: 'some' }),
      () => http().post('/v1/admin/practice/report-reasons').set(auth()).set('Idempotency-Key', 'k').send({ ...validCreate, label_vi: ' ' }),
      () => http().post('/v1/admin/practice/report-reasons').set(auth()).set('Idempotency-Key', 'k').send({ ...validCreate, active: false }),
      () => http().post('/v1/admin/practice/report-reasons').set(auth()).set('Idempotency-Key', 'k').send({ ...validCreate, position: undefined }),
      () => http().patch('/v1/admin/practice/report-reasons/other').set(auth()).send({ code: 'renamed' }),
      () => http().patch('/v1/admin/practice/report-reasons/other').set(auth()).send({}),
      () => http().patch('/v1/admin/practice/report-reasons/BAD').set(auth()).send({ active: true }),
    ]) {
      const res = await request();
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(`${PROBLEM}validation-failed`);
    }
    expect(create).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
  });

  it('an editor gets 403 forbidden', async () => {
    role = 'editor';
    const res = await http().get('/v1/admin/practice/report-reasons').set(auth());
    expect(res.status).toBe(403);
    expect(res.body.type).toBe(`${PROBLEM}forbidden`);
    expect(adminList).not.toHaveBeenCalled();
  });

  it('POST is idempotent: marked @Idempotent and run through the real interceptor, which needs an Idempotency-Key', async () => {
    expect(new Reflector().get(IDEMPOTENT_KEY, AdminReportReasonsController.prototype.create)).toBeDefined();
    expect(new Reflector().get(IDEMPOTENT_KEY, AdminReportReasonsController.prototype.update)).toBeUndefined();
    passThrough.mockRestore();
    const res = await http().post('/v1/admin/practice/report-reasons').set(auth()).send(validCreate);
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});
