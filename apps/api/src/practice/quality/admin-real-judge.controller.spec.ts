import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { RealJudgeService } from './real-judge.service.js';

const PROBLEM = 'https://api.example.com/problems/';

describe('admin real-question judge HTTP (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  const passThrough = vi.spyOn(IdempotencyInterceptor.prototype, 'intercept');
  let estimate: ReturnType<typeof vi.spyOn>; let start: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => ctx.http();
  const judgeId = randomUUID();

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const service = ctx.app.get(RealJudgeService);
    estimate = vi.spyOn(service, 'estimate'); start = vi.spyOn(service, 'start');
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'admin';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    estimate.mockReset().mockResolvedValue({ selected: 2 }); start.mockReset().mockResolvedValue({ pass_id: 'p1', selected: 2, skipped: {} });
    hit.mockReset().mockResolvedValue(undefined);
    passThrough.mockReset().mockImplementation((_context, next) => next.handle());
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('D19: both routes need settings.manage', () => {
    expect(listRoutes(ctx.app).filter(({ path }) => path === '/v1/admin/practice/real-judge' || path === '/v1/admin/practice/real-judge/estimate')).toEqual([
      { method: 'POST', path: '/v1/admin/practice/real-judge', permissions: ['settings.manage'] },
      { method: 'GET', path: '/v1/admin/practice/real-judge/estimate', permissions: ['settings.manage'] },
    ]);
  });

  it('an editor gets 403 on both routes and the service is not reached', async () => {
    role = 'editor';
    const get = await http().get('/v1/admin/practice/real-judge/estimate').set(auth()).query({ judge_id: judgeId, operation: 'generate_cloze' });
    expect(get.status).toBe(403);
    expect(get.body.type).toBe(`${PROBLEM}forbidden`);
    const post = await http().post('/v1/admin/practice/real-judge').set(auth()).set('Idempotency-Key', 'k').send({ judge_id: judgeId, operation: 'generate_cloze' });
    expect(post.status).toBe(403);
    expect(estimate).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
  });

  it('an admin asks for an estimate: the filters reach the service in one shape, defaults filled in', async () => {
    expect((await http().get('/v1/admin/practice/real-judge/estimate').set(auth()).query({ judge_id: judgeId, operation: 'generate_cloze' })).status).toBe(200);
    expect(estimate).toHaveBeenLastCalledWith(actorId, { judge_id: judgeId, operation: 'generate_cloze', config: null, test_accounts_only: false });
    expect((await http().get('/v1/admin/practice/real-judge/estimate').set(auth())
      .query({ judge_id: judgeId.toUpperCase(), operation: 'generate_sentence_mcq', config_number: '0', model: 'fake:ok', test_accounts_only: 'true' })).status).toBe(200);
    expect(estimate).toHaveBeenLastCalledWith(actorId, {
      judge_id: judgeId, operation: 'generate_sentence_mcq', config: { number: 0, model: 'fake:ok' }, test_accounts_only: true,
    });
  });

  it('an estimate with an operation Practice does not make, a half config pair, a bad judge id, a bad switch or a stray key → 400 before the service', async () => {
    const bad = [
      { judge_id: judgeId, operation: 'lookup_word' }, { judge_id: judgeId, operation: 'generate_cloze', config_number: '4' },
      { judge_id: judgeId, operation: 'generate_cloze', model: 'fake:ok' }, { judge_id: 'nope', operation: 'generate_cloze' },
      { judge_id: judgeId, operation: 'generate_cloze', config_number: '', model: 'm' }, { judge_id: judgeId, operation: 'generate_cloze', config_number: '-1', model: 'm' },
      { judge_id: judgeId, operation: 'generate_cloze', test_accounts_only: 'yes' }, { judge_id: judgeId, operation: 'generate_cloze', extra: '1' },
      { operation: 'generate_cloze' },
    ];
    for (const query of bad) expect((await http().get('/v1/admin/practice/real-judge/estimate').set(auth()).query(query)).status, JSON.stringify(query)).toBe(400);
    expect(estimate).not.toHaveBeenCalled();
  });

  it('an admin starts a pass: 201 with the service answer, one write against the limit, the same filters shape', async () => {
    const res = await http().post('/v1/admin/practice/real-judge').set(auth()).set('Idempotency-Key', 'k')
      .send({ judge_id: judgeId, operation: 'generate_meaning_question', config: { number: 4, model: 'fake:ok' }, test_accounts_only: true });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ pass_id: 'p1', selected: 2, skipped: {} });
    expect(start).toHaveBeenCalledExactlyOnceWith(actorId, {
      judge_id: judgeId, operation: 'generate_meaning_question', config: { number: 4, model: 'fake:ok' }, test_accounts_only: true,
    });
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
    start.mockClear();
    expect((await http().post('/v1/admin/practice/real-judge').set(auth()).set('Idempotency-Key', 'k2').send({ judge_id: judgeId, operation: 'generate_cloze', config: null })).status).toBe(201);
    expect(start).toHaveBeenCalledExactlyOnceWith(actorId, { judge_id: judgeId, operation: 'generate_cloze', config: null, test_accounts_only: false });
  });

  it('a start with a bad body → 400 before the service: another operation, a half pair, a non-boolean switch, a stray key', async () => {
    const bad = [
      { judge_id: judgeId, operation: 'translate_sentence' }, { judge_id: judgeId, operation: 'generate_cloze', config: { number: 4 } },
      { judge_id: judgeId, operation: 'generate_cloze', config: { number: -1, model: 'm' } }, { judge_id: judgeId, operation: 'generate_cloze', test_accounts_only: 'true' },
      { judge_id: judgeId, operation: 'generate_cloze', limit: 5 }, { operation: 'generate_cloze' },
    ];
    for (const body of bad) expect((await http().post('/v1/admin/practice/real-judge').set(auth()).set('Idempotency-Key', 'k').send(body)).status, JSON.stringify(body)).toBe(400);
    expect(start).not.toHaveBeenCalled();
  });
});
