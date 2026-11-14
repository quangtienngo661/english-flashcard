import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { ContentService } from '../content.service.js';
import { EntryUsageRegistry, REQUIRED_ENTRY_USAGE_MODULES } from './entry-usage.js';

const PROBLEM = 'https://api.example.com/problems/';

describe('admin entries HTTP: DELETE /v1/admin/content/entries/:id (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  let remove: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const entryId = randomUUID();
  const http = () => ctx.http();

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    remove = vi.spyOn(ctx.app.get(ContentService), 'deleteEntry');
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'editor';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    remove.mockReset().mockResolvedValue(undefined);
    hit.mockReset().mockResolvedValue(undefined);
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('the route exists next to the other entry routes and needs content.edit', () => {
    const routes = listRoutes(ctx.app).filter(({ path }) => path.startsWith('/v1/admin/content/entries'));
    const writes = routes.filter(({ method }) => method !== 'GET');
    expect(writes.map(({ method, path }) => `${method} ${path}`).sort()).toEqual([
      'DELETE /v1/admin/content/entries/:id', 'POST /v1/admin/content/entries/batch',
      'PUT /v1/admin/content/entries/:id/levels/editorial', 'PUT /v1/admin/content/entries/:id/variants',
    ].sort());
    expect(writes.find(({ method }) => method === 'DELETE')!.permissions).toEqual(['content.edit']);
  });

  it('the app registers every probe at startup (all() throws if one is missing, so the real delete would refuse to run)', () => {
    const registry = ctx.app.get(EntryUsageRegistry, { strict: false });
    expect(registry.all().map(({ module }) => module).sort()).toEqual([...REQUIRED_ENTRY_USAGE_MODULES].sort());
  });

  it('DELETE → 204 with no body; the id is lower-cased by the uuid check and passed on; user.write is charged', async () => {
    const res = await http().delete(`/v1/admin/content/entries/${entryId}`).set(auth());
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(remove).toHaveBeenCalledWith(entryId);
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
  });

  it('an admin may delete too', async () => {
    role = 'admin';
    expect((await http().delete(`/v1/admin/content/entries/${entryId}`).set(auth())).status).toBe(204);
  });

  it('unknown id → 404 not-found', async () => {
    remove.mockRejectedValue(new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' }));
    const res = await http().delete(`/v1/admin/content/entries/${entryId}`).set(auth());
    expect(res.status).toBe(404);
    expect(res.body.type).toBe(`${PROBLEM}not-found`);
  });

  it('refused → 409 entry-in-use with the reasons as a top-level member of the problem', async () => {
    remove.mockRejectedValue(new ProblemDetailsException({
      status: 409, title: 'Entry in use', type: 'entry-in-use', extensions: { reasons: ['published-sense', 'learner-data'] },
    }));
    const res = await http().delete(`/v1/admin/content/entries/${entryId}`).set(auth());
    expect(res.status).toBe(409);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body).toMatchObject({ type: `${PROBLEM}entry-in-use`, status: 409, reasons: ['published-sense', 'learner-data'] });
  });

  it('an error the service did not expect stays a 500 without a cause in the body (fail closed)', async () => {
    remove.mockRejectedValue(new Error('Entry usage probe not registered: practice'));
    const res = await http().delete(`/v1/admin/content/entries/${entryId}`).set(auth());
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('probe');
  });

  it('not a uuid → 400 validation-failed before the service', async () => {
    const res = await http().delete('/v1/admin/content/entries/nope').set(auth());
    expect(res.status).toBe(400);
    expect(res.body.type).toBe(`${PROBLEM}validation-failed`);
    expect(remove).not.toHaveBeenCalled();
  });

  it('a learner (no staff role) → 403, and without a token → 401; the service is not reached', async () => {
    role = null;
    expect((await http().delete(`/v1/admin/content/entries/${entryId}`).set(auth())).status).toBe(403);
    expect((await http().delete(`/v1/admin/content/entries/${entryId}`)).status).toBe(401);
    expect(remove).not.toHaveBeenCalled();
  });

  it('the rate limit refuses with 429 before the service', async () => {
    hit.mockRejectedValue(new ProblemDetailsException({ status: 429, title: 'Too many requests', type: 'rate-limited', retryAfterSeconds: 3 }));
    const res = await http().delete(`/v1/admin/content/entries/${entryId}`).set(auth());
    expect(res.status).toBe(429);
    expect(remove).not.toHaveBeenCalled();
  });
});
