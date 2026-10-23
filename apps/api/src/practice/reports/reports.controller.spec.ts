import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { ReportsService } from './reports.service.js';

const PROBLEM = 'https://api.example.com/problems/';

describe('learner reports HTTP (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let userId: string;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  let create: ReturnType<typeof vi.spyOn>; let listMine: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => ctx.http();
  const itemId = randomUUID();

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const reports = ctx.app.get(ReportsService);
    create = vi.spyOn(reports, 'create'); listMine = vi.spyOn(reports, 'listMine');
    vi.spyOn(ctx.app.get(IdentityService), 'getProfile').mockImplementation(async () => ({ native_language: 'vi' }) as never);
  });
  beforeEach(async () => {
    userId = randomUUID();
    token = await ctx.app.get(AccessTokenService).sign({ userId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId, revokedAt: null, user: { staffRole: null } }));
    create.mockReset().mockResolvedValue({ id: 'r-1' }); listMine.mockReset().mockResolvedValue({ items: [], next_page_token: null });
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('a report takes any reason code and an optional note; share_private_word is still accepted but no longer passed on (GF2)', async () => {
    const res = await http().post(`/v1/practice/items/${itemId}/report`).set(auth())
      .send({ reason: 'ai_more_than_one_answer', note: '  run  ', share_private_word: true });
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith({ userId, nativeLanguage: 'vi' }, itemId,
      { reason: 'ai_more_than_one_answer', note: 'run' });
    await http().post(`/v1/practice/items/${itemId}/report`).set(auth()).send({ reason: 'other' });
    expect(create).toHaveBeenLastCalledWith({ userId, nativeLanguage: 'vi' }, itemId, { reason: 'other', note: null });
  });

  it('a malformed body → 400 validation-failed before the service', async () => {
    for (const body of [{}, { reason: 'Other' }, { reason: 'other', share_private_word: 'yes' }, { reason: 'other', extra: 1 }]) {
      const res = await http().post(`/v1/practice/items/${itemId}/report`).set(auth()).send(body);
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(`${PROBLEM}validation-failed`);
    }
    expect(create).not.toHaveBeenCalled();
  });

  it('GET /v1/practice/reports lists the signed-in learner\'s reports', async () => {
    expect((await http().get('/v1/practice/reports').set(auth()).query({ page_size: 5, page_token: 't' })).status).toBe(200);
    expect(listMine).toHaveBeenCalledWith(userId, { pageSize: 5, pageToken: 't' });
    expect((await http().get('/v1/practice/reports').set(auth()).query({ page_size: 0 })).status).toBe(400);
  });
});
