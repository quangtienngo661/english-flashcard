import { decodeJwt } from 'jose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { AccessTokenService } from '../../src/identity/sessions/access-token.service.js';
import { SessionService } from '../../src/identity/sessions/session.service.js';
import { withUserLock } from '../../src/identity/user-lock.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';

const day = 86_400_000;
const options = { timeout: 10_000, maxWait: 5_000 };
const invalidToken = { status: 401, problemType: 'invalid-token' };

function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('Session chains (e2e)', () => {
  let ctx: TestApp;
  let sessions: SessionService;
  let access: AccessTokenService;
  let userId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    sessions = ctx.app.get(SessionService);
    access = ctx.app.get(AccessTokenService);
  });
  beforeEach(async () => {
    ctx.clock.set(new Date('2026-10-07T12:00:00Z'));
    ({ userId } = await seedUser(ctx.prisma));
  });
  afterAll(async () => { await ctx?.close(); });

  const chain = (id: string) => ctx.prisma.sessionChain.findUniqueOrThrow({ where: { id } });
  const tokens = (id: string) => ctx.prisma.refreshToken.findMany({ where: { chainId: id } });

  // Observe a real advisory-lock wait before releasing the holder. Polls are DB queries;
  // no elapsed sleep is used as evidence that a refresh actually reached its lock.
  async function waitForBlocked(pid: number, count: number): Promise<void> {
    const deadline = performance.now() + 4000;
    while (performance.now() < deadline) {
      const [row] = await ctx.prisma.$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS n FROM pg_locks
        WHERE locktype = 'advisory' AND NOT granted
          AND ${pid} = ANY(pg_blocking_pids(pid))`;
      if (row.n >= count) return;
    }
    throw new Error(`Expected ${count} blocked user-lock request(s)`);
  }

  async function holdUser(onRelease?: (tx: Prisma.TransactionClient) => Promise<void>) {
    const ready = gate();
    const release = gate();
    let pid!: number;
    const transaction = ctx.prisma.$transaction(async (tx) => {
      await withUserLock(tx, userId);
      const [row] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`;
      pid = row.pid;
      ready.resolve();
      await release.promise;
      await onRelease?.(tx);
    }, options);
    // Do not leave a rejected holder unobserved if setup or a test assertion fails.
    const settled = transaction.then(() => ({ error: null }), (error: unknown) => ({ error }));
    await Promise.race([ready.promise, transaction]);
    return { pid, release: release.resolve, settled };
  }

  it('B1#15: refresh returns a new pair, persists lastUsedAt = now, and old-token retry takes grace', async () => {
    const initial = await startSession(ctx, userId);
    expect(await access.verify(initial.accessToken)).toEqual({ userId, sessionChainId: initial.sessionChainId });
    expect(initial.refreshExpiresAt).toEqual(new Date(ctx.clock.now().getTime() + 90 * day));
    ctx.clock.advance(1000);
    const rotated = await sessions.refresh(initial.refreshToken, 'mobile');
    expect(rotated.refreshToken).not.toBe(initial.refreshToken);
    expect(rotated.accessToken).not.toBe(initial.accessToken);
    expect(await access.verify(rotated.accessToken)).toEqual({ userId, sessionChainId: initial.sessionChainId });
    expect(rotated.client).toBe('mobile');
    expect((await chain(initial.sessionChainId)).lastUsedAt).toEqual(ctx.clock.now());
    const rows = await tokens(initial.sessionChainId);
    expect(rows).toHaveLength(2);
    const old = rows.find((row) => row.rotatedAt !== null)!;
    const successor = rows.find((row) => row.rotatedAt === null)!;
    expect(old).toMatchObject({
      rotatedAt: ctx.clock.now(), successorId: successor.id,
      graceUntil: new Date(ctx.clock.now().getTime() + 10_000),
      successorCiphertext: expect.any(String),
    });
    expect(JSON.stringify(rows)).not.toContain(initial.refreshToken);
    expect(JSON.stringify(rows)).not.toContain(rotated.refreshToken);
    expect((await sessions.refresh(initial.refreshToken, 'mobile')).refreshToken).toBe(rotated.refreshToken);
    expect(await tokens(initial.sessionChainId)).toHaveLength(2);
  });

  it('B1#16: at exactly 10 s grace returns the identical successor, a fresh exp, and an info log', async () => {
    const initial = await startSession(ctx, userId);
    const rotated = await sessions.refresh(initial.refreshToken, 'mobile');
    const lastUsedAt = (await chain(initial.sessionChainId)).lastUsedAt;
    ctx.clock.advance(10_000);
    const grace = await sessions.refresh(initial.refreshToken, 'mobile');
    expect(grace.refreshToken).toBe(rotated.refreshToken);
    expect(grace.accessToken).not.toBe(rotated.accessToken);
    expect(await access.verify(grace.accessToken)).toEqual({ userId, sessionChainId: initial.sessionChainId });
    expect(decodeJwt(grace.accessToken).exp).toBe(ctx.clock.now().getTime() / 1000 + 900);
    expect(ctx.logs).toContainEqual({ level: 'info', event: 'refresh_grace_used', chain_id: initial.sessionChainId });
    expect((await chain(initial.sessionChainId)).lastUsedAt).toEqual(lastUsedAt);
    expect(await tokens(initial.sessionChainId)).toHaveLength(2);
  });

  it('B1E5: two refreshes blocked on one user lock succeed with the same successor and exactly 2 rows', async () => {
    const initial = await startSession(ctx, userId);
    const holder = await holdUser();
    const pending = Promise.allSettled([
      sessions.refresh(initial.refreshToken, 'mobile'), sessions.refresh(initial.refreshToken, 'mobile'),
    ]);
    try { await waitForBlocked(holder.pid, 2); } finally { holder.release(); }
    expect((await holder.settled).error).toBeNull();
    const results = await pending;
    expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
    const values = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
    expect(values).toHaveLength(2);
    expect(values[0].refreshToken).toBe(values[1].refreshToken);
    expect(await tokens(initial.sessionChainId)).toHaveLength(2);
    expect((await chain(initial.sessionChainId)).revokedAt).toBeNull();
  });

  it('B1#17/B1#34: reuse after 11 s returns 401 with revocation already committed and a safe warn log', async () => {
    const initial = await startSession(ctx, userId);
    const rotated = await sessions.refresh(initial.refreshToken, 'mobile');
    ctx.clock.advance(11_000);
    await expect(sessions.refresh(initial.refreshToken, 'mobile')).rejects.toMatchObject(invalidToken);
    expect(await chain(initial.sessionChainId)).toMatchObject({ revokedAt: ctx.clock.now(), revokeReason: 'reuse_detected' });
    const logs = ctx.logs.filter((entry) => entry.chain_id === initial.sessionChainId);
    expect(logs).toEqual([{ level: 'warn', event: 'refresh_reuse_detected', chain_id: initial.sessionChainId }]);
    expect(JSON.stringify(logs)).not.toContain(initial.refreshToken);
    expect(JSON.stringify(logs)).not.toContain(rotated.refreshToken);
    await expect(sessions.refresh(rotated.refreshToken, 'mobile')).rejects.toMatchObject(invalidToken);
    expect((await chain(initial.sessionChainId)).revokeReason).toBe('reuse_detected');
  });

  it('B1E6: A to B to C within 10 s then A commits reuse revocation', async () => {
    const a = await startSession(ctx, userId);
    const b = await sessions.refresh(a.refreshToken, 'mobile');
    await sessions.refresh(b.refreshToken, 'mobile');
    await expect(sessions.refresh(a.refreshToken, 'mobile')).rejects.toMatchObject(invalidToken);
    expect(await chain(a.sessionChainId)).toMatchObject({ revokedAt: ctx.clock.now(), revokeReason: 'reuse_detected' });
    expect(await tokens(a.sessionChainId)).toHaveLength(3);
  });

  it.each([false, true])('B1E7/IE14: a committed revocation while refresh waits denies it (rotated=%s)', async (rotated) => {
    const initial = await startSession(ctx, userId);
    if (rotated) await sessions.refresh(initial.refreshToken, 'mobile');
    const holder = await holdUser((tx) => sessions.revokeAllForUser(tx, userId, 'password_changed'));
    const pending = sessions.refresh(initial.refreshToken, 'mobile').catch((error: unknown) => error);
    try { await waitForBlocked(holder.pid, 1); } finally { holder.release(); }
    expect((await holder.settled).error).toBeNull();
    expect(await pending).toMatchObject(invalidToken);
    expect(await chain(initial.sessionChainId)).toMatchObject({ revokedAt: ctx.clock.now(), revokeReason: 'password_changed' });
    expect(await tokens(initial.sessionChainId)).toHaveLength(rotated ? 2 : 1);
  });

  it('B1#18: Clock.now is re-read after the user lock, including time spent waiting', async () => {
    const initial = await startSession(ctx, userId);
    const holder = await holdUser();
    const pending = sessions.refresh(initial.refreshToken, 'mobile').catch((error: unknown) => error);
    try {
      await waitForBlocked(holder.pid, 1);
      ctx.clock.advance(90 * day + 1000);
    } finally { holder.release(); }
    expect((await holder.settled).error).toBeNull();
    expect(await pending).toMatchObject(invalidToken);
    expect(await chain(initial.sessionChainId)).toMatchObject({ revokedAt: ctx.clock.now(), revokeReason: 'expired' });
    expect(await tokens(initial.sessionChainId)).toHaveLength(1);
  });

  it('B1#18: 90 d plus 1 s idle returns 401 and commits expired revocation', async () => {
    const initial = await startSession(ctx, userId);
    ctx.clock.advance(90 * day + 1000);
    await expect(sessions.refresh(initial.refreshToken, 'mobile')).rejects.toMatchObject(invalidToken);
    expect(await chain(initial.sessionChainId)).toMatchObject({ revokedAt: ctx.clock.now(), revokeReason: 'expired' });
    expect(await tokens(initial.sessionChainId)).toHaveLength(1);
  });

  it('B1#18: 365 d plus 1 s expires despite refreshes every 30 d; expiry clips at 365 d', async () => {
    const initial = await startSession(ctx, userId);
    let current = initial;
    for (let days = 30; days <= 360; days += 30) {
      ctx.clock.advance(30 * day);
      current = await sessions.refresh(current.refreshToken, 'mobile');
      expect(current.refreshExpiresAt).toEqual(new Date(Math.min(
        ctx.clock.now().getTime() + 90 * day,
        new Date('2026-10-07T12:00:00Z').getTime() + 365 * day,
      )));
    }
    ctx.clock.advance(5 * day + 1000);
    await expect(sessions.refresh(current.refreshToken, 'mobile')).rejects.toMatchObject(invalidToken);
    expect(await chain(initial.sessionChainId)).toMatchObject({ revokedAt: ctx.clock.now(), revokeReason: 'expired' });
    expect(await tokens(initial.sessionChainId)).toHaveLength(13);
  });

  it('B1#19: an expired-but-unrevoked chain does not count toward the 10 and never costs a live chain', async () => {
    // Created 366 days ago (absolute expiry passed) but used recently, so it is NOT the least recently used.
    const stale = await startSession(ctx, userId);
    await ctx.prisma.sessionChain.update({
      where: { id: stale.sessionChainId },
      data: { createdAt: new Date(ctx.clock.now().getTime() - 366 * day) },
    });
    ctx.clock.advance(1000);
    const live = [];
    for (let i = 0; i < 9; i++) {
      live.push(await startSession(ctx, userId));
      ctx.clock.advance(1000);
    }
    await ctx.prisma.sessionChain.update({ where: { id: stale.sessionChainId }, data: { lastUsedAt: ctx.clock.now() } });
    ctx.clock.advance(1000);
    const tenth = await startSession(ctx, userId);
    for (const s of [...live, tenth]) {
      expect((await chain(s.sessionChainId)).revokedAt).toBeNull();
    }
  });

  it('B1#19/IE3: the 11th chain revokes the least recently used rather than the oldest-created chain', async () => {
    const issued = [];
    for (let i = 0; i < 10; i++) {
      issued.push(await startSession(ctx, userId));
      ctx.clock.advance(1000);
    }
    await sessions.refresh(issued[0].refreshToken, 'mobile');
    ctx.clock.advance(1000);
    const eleventh = await startSession(ctx, userId);
    expect(await chain(issued[1].sessionChainId)).toMatchObject({ revokedAt: ctx.clock.now(), revokeReason: 'device_cap' });
    expect((await chain(issued[0].sessionChainId)).revokedAt).toBeNull();
    expect((await chain(eleventh.sessionChainId)).revokedAt).toBeNull();
    expect(await ctx.prisma.sessionChain.count({ where: { userId, revokedAt: null } })).toBe(10);
  });

  it('B1E9: 5 concurrent startChain transactions on a user with 8 chains leave exactly 10 active', async () => {
    // 5, not 10: holder + 10 waiters would exhaust the 10-connection pool and starve the pg_locks probe
    // (the accepted same-user pool-exhaustion risk of design section 4b).
    for (let i = 0; i < 8; i++) { await startSession(ctx, userId); ctx.clock.advance(1000); }
    const holder = await holdUser();
    const pending = Promise.allSettled(Array.from({ length: 5 }, () => ctx.prisma.$transaction(async (tx) => {
      await withUserLock(tx, userId);
      return sessions.startChain(tx, { userId, client: 'mobile' });
    }, options)));
    try {
      await waitForBlocked(holder.pid, 2);
    } finally {
      holder.release();
      await Promise.all([holder.settled, pending]);
    }
    expect((await holder.settled).error).toBeNull();
    const results = await pending;
    expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
    const rows = await ctx.prisma.sessionChain.findMany({ where: { userId } });
    expect(rows).toHaveLength(13);
    expect(rows.filter((row) => row.revokedAt === null)).toHaveLength(10);
    expect(rows.filter((row) => row.revokeReason === 'device_cap')).toHaveLength(3);
  });

  it.each(['web', 'mobile'] as const)('B1E10: %s token on the other path returns 401 with no chain or token changes', async (client) => {
    const initial = await startSession(ctx, userId, client);
    const before = await chain(initial.sessionChainId);
    const beforeTokens = await tokens(initial.sessionChainId);
    await expect(sessions.refresh(initial.refreshToken, client === 'web' ? 'mobile' : 'web')).rejects.toMatchObject(invalidToken);
    expect(await chain(initial.sessionChainId)).toEqual(before);
    expect(await tokens(initial.sessionChainId)).toEqual(beforeTokens);
  });

  it('B1#20: logout is idempotent, affects only the current chain, and path mismatch or rotated token does nothing', async () => {
    const initial = await startSession(ctx, userId);
    const other = await startSession(ctx, userId);
    const rotated = await sessions.refresh(initial.refreshToken, 'mobile');
    await sessions.revokeByRefreshToken(rotated.refreshToken, 'web');
    await sessions.revokeByRefreshToken(initial.refreshToken, 'mobile');
    expect((await chain(initial.sessionChainId)).revokedAt).toBeNull();
    await sessions.revokeByRefreshToken(rotated.refreshToken, 'mobile');
    const revoked = await chain(initial.sessionChainId);
    expect(revoked).toMatchObject({ revokedAt: ctx.clock.now(), revokeReason: 'logout' });
    ctx.clock.advance(1000);
    await sessions.revokeByRefreshToken(rotated.refreshToken, 'mobile');
    await sessions.revokeByRefreshToken('unknown', 'mobile');
    expect(await chain(initial.sessionChainId)).toEqual(revoked);
    expect((await chain(other.sessionChainId)).revokedAt).toBeNull();
    await expect(sessions.refresh(rotated.refreshToken, 'mobile')).rejects.toMatchObject(invalidToken);
    expect(await chain(initial.sessionChainId)).toEqual(revoked);
    expect(await sessions.refresh(other.refreshToken, 'mobile')).toMatchObject({ sessionChainId: other.sessionChainId });
  });

  it('B1E30: unknown refresh returns 401 without revoking existing sessions', async () => {
    const initial = await startSession(ctx, userId);
    const before = await chain(initial.sessionChainId);
    await expect(sessions.refresh('unknown', 'mobile')).rejects.toMatchObject(invalidToken);
    expect(await chain(initial.sessionChainId)).toEqual(before);
    expect(await tokens(initial.sessionChainId)).toHaveLength(1);
  });

  it('B1#15: the 11th refresh of one chain in a minute returns 429 without rotation or revocation', async () => {
    const initial = await startSession(ctx, userId);
    let current = initial;
    for (let i = 0; i < 10; i++) current = await sessions.refresh(current.refreshToken, 'mobile');
    const before = await chain(initial.sessionChainId);
    await expect(sessions.refresh(current.refreshToken, 'mobile')).rejects.toMatchObject({
      status: 429, problemType: 'rate-limited', retryAfterSeconds: 60,
    });
    expect(await chain(initial.sessionChainId)).toEqual(before);
    expect(await tokens(initial.sessionChainId)).toHaveLength(11);
    const counters = await ctx.prisma.rateLimitCounter.findMany({ where: { key: `auth.refresh.chain:chain:${initial.sessionChainId}` } });
    expect(counters).toHaveLength(1);
    expect(counters[0].count).toBe(11);
  });
});
