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
import { AdminWordFormsController } from './admin-word-forms.controller.js';
import { WordFormExistsError, WordFormsService } from './word-forms.service.js';

const PROBLEM = 'https://api.example.com/problems/';

describe('admin word forms HTTP (Bước 7 design §10; unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  const passThrough = vi.spyOn(IdempotencyInterceptor.prototype, 'intercept');
  let add: ReturnType<typeof vi.spyOn>; let remove: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const formId = randomUUID();
  const http = () => ctx.http();

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const forms = ctx.app.get(WordFormsService);
    add = vi.spyOn(forms, 'add'); remove = vi.spyOn(forms, 'remove');
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'editor';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    add.mockReset().mockResolvedValue({ id: formId, lemmaKey: 'deploy', formKey: 'deployable', form: 'deployable' });
    remove.mockReset().mockResolvedValue(true);
    hit.mockReset().mockResolvedValue(undefined);
    passThrough.mockReset().mockImplementation((_context, next) => next.handle());
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('every route requires content.edit; POST is @Idempotent', () => {
    const routes = listRoutes(ctx.app).filter(({ path }) => path.startsWith('/v1/admin/content/word-forms'));
    expect(routes.map(({ method, path }) => `${method} ${path}`).sort())
      .toEqual(['DELETE /v1/admin/content/word-forms/:id', 'POST /v1/admin/content/word-forms']);
    for (const route of routes) expect(route.permissions, `${route.method} ${route.path}`).toEqual(['content.edit']);
    expect(new Reflector().get(IDEMPOTENT_KEY, AdminWordFormsController.prototype.add)).toBeDefined();
    expect(new Reflector().get(IDEMPOTENT_KEY, AdminWordFormsController.prototype.remove)).toBeUndefined();
  });

  it('POST → 201 {id, lemma_key, form}; the text is trimmed and NFC; the actor is passed; user.write', async () => {
    const res = await http().post('/v1/admin/content/word-forms').set(auth()).set('Idempotency-Key', 'k1')
      .send({ lemma: ' deploy ', form: ' deployable ' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: formId, lemma_key: 'deploy', form: 'deployable' });
    expect(add).toHaveBeenCalledWith(actorId, 'deploy', 'deployable');
    expect(passThrough).toHaveBeenCalledTimes(1);
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
  });

  it('POST of a pair that exists → 409 word-form-exists', async () => {
    add.mockRejectedValue(new WordFormExistsError());
    const res = await http().post('/v1/admin/content/word-forms').set(auth()).set('Idempotency-Key', 'k2')
      .send({ lemma: 'deploy', form: 'deployable' });
    expect(res.status).toBe(409);
    expect(res.body.type).toBe(`${PROBLEM}word-form-exists`);
  });

  it('bad bodies → 400 validation-failed before the service', async () => {
    for (const body of [{ lemma: 'deploy' }, { lemma: '  ', form: 'x' }, { lemma: 'deploy', form: 'x'.repeat(101) },
      { lemma: 'deploy', form: 'x', extra: 1 }]) {
      const res = await http().post('/v1/admin/content/word-forms').set(auth()).set('Idempotency-Key', 'k3').send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.type).toBe(`${PROBLEM}validation-failed`);
    }
    expect(add).not.toHaveBeenCalled();
  });

  it('DELETE → 204; unknown id → 404 not-found; not a uuid → 400', async () => {
    expect((await http().delete(`/v1/admin/content/word-forms/${formId.toUpperCase()}`).set(auth())).status).toBe(204);
    expect(remove).toHaveBeenCalledWith(formId);
    remove.mockResolvedValue(false);
    const missing = await http().delete(`/v1/admin/content/word-forms/${formId}`).set(auth());
    expect(missing.status).toBe(404);
    expect(missing.body.type).toBe(`${PROBLEM}not-found`);
    expect((await http().delete('/v1/admin/content/word-forms/nope').set(auth())).status).toBe(400);
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
  });

  it('a learner (no staff role) → 403', async () => {
    role = null;
    expect((await http().post('/v1/admin/content/word-forms').set(auth()).set('Idempotency-Key', 'k4')
      .send({ lemma: 'deploy', form: 'deployable' })).status).toBe(403);
    expect(add).not.toHaveBeenCalled();
  });
});
