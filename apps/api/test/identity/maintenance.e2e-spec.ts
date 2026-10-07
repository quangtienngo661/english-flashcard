import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MaintenanceScheduler } from '../../src/common/maintenance/maintenance.scheduler.js';
import { IdentityCleanupService } from '../../src/identity/maintenance/identity-cleanup.service.js';
import { SessionService } from '../../src/identity/sessions/session.service.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';

const second = 1_000;
const hour = 3_600_000;
const day = 24 * hour;

describe('Maintenance cleanup (e2e, isolated database)', () => {
  let ctx: TestApp;
  let cleanup: IdentityCleanupService;
  let now: Date;
  let userId: string;
  const ago = (ms: number) => new Date(now.getTime() - ms);

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
    cleanup = ctx.app.get(IdentityCleanupService);
  });
  beforeEach(async () => {
    now = new Date('2026-10-07T12:00:00Z');
    ctx.clock.set(now);
    ({ userId } = await seedUser(ctx.prisma));
  });
  afterAll(async () => { await ctx?.close(); });

  const chainAt = (data: { createdAt: Date; lastUsedAt: Date; revokedAt?: Date }) =>
    ctx.prisma.sessionChain.create({ data: { userId, clientType: 'mobile', ...data } });

  it('deletes rate-limit counters only when their window started more than 24 h ago', async () => {
    await ctx.prisma.rateLimitCounter.createMany({ data: [
      { key: 'test:inside', windowStart: ago(day - second), count: 1 },
      { key: 'test:outside', windowStart: ago(day + second), count: 1 },
    ] });
    await ctx.app.get(MaintenanceScheduler).runAll();
    const keys = (await ctx.prisma.rateLimitCounter.findMany({ where: { key: { startsWith: 'test:' } } })).map((r) => r.key);
    expect(keys).toEqual(['test:inside']);
  });

  it('clears successor ciphertext only after grace_until has passed', async () => {
    const chain = await chainAt({ createdAt: now, lastUsedAt: now });
    await ctx.prisma.refreshToken.createMany({ data: [
      { chainId: chain.id, tokenHash: `past-${chain.id}`, successorCiphertext: 'x', graceUntil: ago(second) },
      { chainId: chain.id, tokenHash: `live-${chain.id}`, successorCiphertext: 'y', graceUntil: now },
    ] });
    const result = await cleanup.runOnce(now);
    expect(result.graceSecrets).toBe(1);
    const rows = await ctx.prisma.refreshToken.findMany({ where: { chainId: chain.id }, orderBy: { tokenHash: 'asc' } });
    expect(rows.map((r) => [r.tokenHash.split('-')[0], r.successorCiphertext])).toEqual([['live', 'y'], ['past', null]]);
  });

  it('deletes OTP codes only when they expired more than 24 h ago', async () => {
    await ctx.prisma.otpCode.createMany({ data: [
      { userId, purpose: 'verify_email', codeHmac: 'inside', expiresAt: ago(day - second) },
      { userId, purpose: 'verify_email', codeHmac: 'outside', expiresAt: ago(day + second) },
    ] });
    const result = await cleanup.runOnce(now);
    expect(result.otpCodes).toBe(1);
    expect((await ctx.prisma.otpCode.findMany({ where: { userId } })).map((r) => r.codeHmac)).toEqual(['inside']);
  });

  it('deletes chains (and their tokens) dead for more than 30 days, by revocation, idle or absolute expiry', async () => {
    const keep = [
      await chainAt({ createdAt: ago(40 * day), lastUsedAt: ago(40 * day), revokedAt: ago(30 * day - second) }),
      await chainAt({ createdAt: ago(130 * day), lastUsedAt: ago(120 * day - second) }),
      await chainAt({ createdAt: ago(395 * day - second), lastUsedAt: now }),
    ];
    const drop = [
      await chainAt({ createdAt: ago(40 * day), lastUsedAt: ago(40 * day), revokedAt: ago(30 * day + second) }),
      await chainAt({ createdAt: ago(130 * day), lastUsedAt: ago(120 * day + second) }),
      await chainAt({ createdAt: ago(395 * day + second), lastUsedAt: now }),
    ];
    for (const c of [...keep, ...drop]) {
      await ctx.prisma.refreshToken.create({ data: { chainId: c.id, tokenHash: `t-${c.id}` } });
    }
    const result = await cleanup.runOnce(now);
    expect(result.chains).toBe(3);
    const left = (await ctx.prisma.sessionChain.findMany({ where: { userId } })).map((c) => c.id).sort();
    expect(left).toEqual(keep.map((c) => c.id).sort());
    expect(await ctx.prisma.refreshToken.count({ where: { chainId: { in: drop.map((c) => c.id) } } })).toBe(0);
  });

  it('B1E30: a refresh token whose chain was cleaned up gets 401 invalid-token', async () => {
    const session = await startSession(ctx, userId);
    await ctx.prisma.sessionChain.update({ where: { id: session.sessionChainId }, data: { revokedAt: now, revokeReason: 'logout' } });
    ctx.clock.advance(31 * day);
    await cleanup.runOnce(ctx.clock.now());
    expect(await ctx.prisma.sessionChain.count({ where: { id: session.sessionChainId } })).toBe(0);
    await expect(ctx.app.get(SessionService).refresh(session.refreshToken, 'mobile'))
      .rejects.toMatchObject({ status: 401, problemType: 'invalid-token' });
  });

  it('the scheduler registers both jobs and starts no timer when maintenanceEnabled is false', () => {
    const scheduler = ctx.app.get(MaintenanceScheduler);
    expect(scheduler.jobNames().sort()).toEqual(['identity-cleanup', 'rate-limit-counters']);
    expect(scheduler.isRunning()).toBe(false);
  });

  it('the scheduler starts its hourly timer when maintenanceEnabled is true and stops it on close', async () => {
    const enabled = await createTestApp({ databaseUrl: await createIsolatedDatabase(), config: { maintenanceEnabled: true } });
    const scheduler = enabled.app.get(MaintenanceScheduler);
    try {
      expect(scheduler.isRunning()).toBe(true);
    } finally {
      await enabled.close();
    }
    expect(scheduler.isRunning()).toBe(false);
  });
});
