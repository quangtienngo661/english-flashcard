import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { ExampleSourceService } from './example-source.service.js';

const PROBLEM = 'https://api.example.com/problems/';
const BASE = '/v1/admin/practice/eval-examples/from-source';

describe('admin add-to-examples HTTP (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  const passThrough = vi.spyOn(IdempotencyInterceptor.prototype, 'intercept');
  let preview: ReturnType<typeof vi.spyOn>; let create: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => ctx.http();
  const reportId = randomUUID();
  const questionId = randomUUID();

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const service = ctx.app.get(ExampleSourceService);
    preview = vi.spyOn(service, 'preview'); create = vi.spyOn(service, 'create');
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'admin';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    preview.mockReset().mockResolvedValue({ operation: 'generate_cloze' }); create.mockReset().mockResolvedValue({ id: 'ex1', operation: 'generate_cloze', rebuilt: false });
    hit.mockReset().mockResolvedValue(undefined);
    passThrough.mockReset().mockImplementation((_context, next) => next.handle());
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('D19: both routes need settings.manage', () => {
    expect(listRoutes(ctx.app).filter(({ path }) => path === BASE)).toEqual([
      { method: 'GET', path: BASE, permissions: ['settings.manage'] },
      { method: 'POST', path: BASE, permissions: ['settings.manage'] },
    ]);
  });

  it('B43: an editor gets 403 on the preview and on the add, and the service is not reached', async () => {
    role = 'editor';
    const get = await http().get(BASE).set(auth()).query({ report_id: reportId });
    expect(get.status).toBe(403);
    expect(get.body.type).toBe(`${PROBLEM}forbidden`);
    expect((await http().post(BASE).set(auth()).set('Idempotency-Key', 'k').send({ report_id: reportId, expected: null, note: null })).status).toBe(403);
    expect(preview).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('an admin previews by report id or by question id (any case): the reference reaches the service in one shape', async () => {
    expect((await http().get(BASE).set(auth()).query({ report_id: reportId.toUpperCase() })).status).toBe(200);
    expect(preview).toHaveBeenLastCalledWith(actorId, { report_id: reportId });
    expect((await http().get(BASE).set(auth()).query({ question_id: questionId })).status).toBe(200);
    expect(preview).toHaveBeenLastCalledWith(actorId, { question_id: questionId });
  });

  it('a preview with both ids, none, a bad id or a stray key → 400 before the service', async () => {
    const bad = [{ report_id: reportId, question_id: questionId }, {}, { report_id: 'nope' }, { question_id: 'nope' }, { report_id: reportId, other: '1' }];
    for (const query of bad) expect((await http().get(BASE).set(auth()).query(query)).status, JSON.stringify(query)).toBe(400);
    expect(preview).not.toHaveBeenCalled();
  });

  it('an admin adds an example: 201, the note trimmed, one write against the limit', async () => {
    const res = await http().post(BASE).set(auth()).set('Idempotency-Key', 'k')
      .send({ report_id: reportId, expected: { forms: ['go'] }, note: '  sai nghĩa  ' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 'ex1', operation: 'generate_cloze', rebuilt: false });
    expect(create).toHaveBeenCalledExactlyOnceWith(actorId, { report_id: reportId, expected: { forms: ['go'] }, note: 'sai nghĩa' });
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
    create.mockClear();
    expect((await http().post(BASE).set(auth()).set('Idempotency-Key', 'k2').send({ question_id: questionId })).status).toBe(201);
    expect(create).toHaveBeenCalledExactlyOnceWith(actorId, { question_id: questionId, expected: null, note: null });
  });

  it('an add with both ids or none, a note over 500 characters, an expected that is not an object, or a stray key → 400 before the service', async () => {
    const bad = [
      { report_id: reportId, question_id: questionId, expected: null, note: null }, { expected: null, note: null }, { report_id: reportId, note: 'x'.repeat(501) },
      { report_id: reportId, expected: 'go' }, { report_id: reportId, expected: ['go'] }, { report_id: reportId, split: 'held_out' },
    ];
    for (const body of bad) expect((await http().post(BASE).set(auth()).set('Idempotency-Key', 'k').send(body)).status, JSON.stringify(body)).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});
