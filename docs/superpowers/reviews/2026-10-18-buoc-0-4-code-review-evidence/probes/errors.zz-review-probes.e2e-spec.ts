// Review probes (independent review 18/10/2026) — not part of the product suite; lives only in the review worktree.
import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';

const out = (...a: unknown[]) => appendFileSync(process.env.PROBE_OUT ?? 'probe.out', a.join(' ') + '\n');
const token64 = (binding: string, payload: Record<string, string>) =>
  Buffer.from(JSON.stringify({ binding, payload }), 'utf8').toString('base64url');

describe('review probes: FD5 forged page token and FD3 logging of a 500', () => {
  let ctx: TestApp;
  beforeAll(async () => { ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() }); });
  afterAll(async () => { await ctx?.close(); });

  it('FD5 + FD3', async () => {
    const { userId, email } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    // Positive control for the log sink: a failed login is logged at info level (auth.service.ts:76-105).
    const bad = await ctx.http().post('/v1/auth/login').send({ email, password: 'Wrong-password-1!', client: 'mobile', device_label: 'probe' });
    out('FD3 control: failed login status', bad.status, 'log entries so far', ctx.logs.length,
      JSON.stringify(ctx.logs.map((e) => (e as { event?: string; message?: string; msg?: string }).event
        ?? (e as { message?: string }).message ?? (e as { msg?: string }).msg ?? Object.keys(e).join('|'))));
    const token = (await startSession(ctx, userId)).accessToken;
    const auth = { Authorization: `Bearer ${token}` };
    const g = await ctx.http().post('/v1/groups').set(auth).set('Idempotency-Key', randomUUID()).send({ name: 'G' });
    const before = ctx.logs.length;
    const forged = token64(`${g.body.id}:`, { at: '2026-10-18T00:00:00.000Z', id: 'not-a-uuid' });
    const r = await ctx.http().get(`/v1/groups/${g.body.id}/items`).query({ page_token: forged }).set(auth);
    out('FD5 GET /v1/groups/:id/items with a well-formed token holding id "not-a-uuid":', r.status, JSON.stringify(r.body).slice(0, 220));
    const fresh = ctx.logs.slice(before);
    const opId = (r.body as { operation_id?: string }).operation_id;
    out('FD3 log entries written during that request:', fresh.length,
      'entries mentioning its operation_id:', fresh.filter((e) => JSON.stringify(e).includes(String(opId))).length,
      'levels:', JSON.stringify(fresh.map((e) => (e as { level?: string; event?: string }).level ?? '?')));
    const control = await ctx.http().get('/v1/groups/not-a-uuid').set(auth);
    out('FD5 control, a malformed id in the path:', control.status);
    out('FD3 control, total log entries in this app so far:', ctx.logs.length, 'sample events:',
      JSON.stringify(ctx.logs.slice(0, 5).map((e) => (e as { event?: string; msg?: string }).event ?? (e as { msg?: string }).msg ?? '?')));
    expect(true).toBe(true);
  });
});
