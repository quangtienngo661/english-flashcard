import { randomUUID } from 'node:crypto';
import { decodeJwt } from 'jose';
import { describe, expect, it, vi } from 'vitest';
import { testConfig } from '../../../test/support/test-config.js';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import { runWithOperationId } from '../../common/logging/request-context.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import type { Prisma, PrismaClient, RefreshToken, SessionChain } from '../../generated/prisma/client.js';
import { AccessTokenService } from './access-token.service.js';
import { seal } from './grace-cipher.js';
import { newRefreshToken } from './refresh-token.js';
import { SessionService } from './session.service.js';

const day = 86_400_000;
const options = { timeout: 10_000, maxWait: 5_000 };

function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function setup() {
  const config = testConfig();
  const clock = new FakeClock(new Date('2026-10-07T12:00:00Z'));
  const chain: SessionChain = {
    id: randomUUID(), userId: randomUUID(), clientType: 'mobile', deviceLabel: null,
    createdAt: clock.now(), lastUsedAt: clock.now(), revokedAt: null, revokeReason: null,
  };
  const original = newRefreshToken();
  const row: RefreshToken & { chain: SessionChain } = {
    id: randomUUID(), chainId: chain.id, tokenHash: original.hash, createdAt: clock.now(),
    rotatedAt: null, successorId: null, successorCiphertext: null, graceUntil: null, chain,
  };
  const logs: LogEntry[] = [];
  const events: string[] = [];
  const locked = gate();
  const release = gate();
  release.resolve();
  const lock = vi.fn(async () => { events.push('lock'); locked.resolve(); await release.promise; return 1; });
  const findUnique = vi.fn(async () => { events.push('read'); return row as RefreshToken & { chain: SessionChain } | null; });
  const updateMany = vi.fn(async () => { events.push('cas'); return { count: 1 }; });
  const create = vi.fn(async ({ data }: { data: Partial<RefreshToken> }) => {
    events.push('create'); return { ...row, ...data };
  });
  const chainUpdate = vi.fn(async () => { events.push('chain-write'); return chain; });
  const chainUpdateMany = vi.fn(async () => { events.push('chain-write'); return { count: 1 }; });
  const tx = {
    $executeRaw: lock,
    refreshToken: { findUnique, updateMany, create },
    sessionChain: { update: chainUpdate, updateMany: chainUpdateMany },
  } as unknown as Prisma.TransactionClient;
  let committed = false;
  let rolledBack = false;
  const transaction = vi.fn(async (
    fn: (tx: Prisma.TransactionClient) => Promise<unknown>, _options: typeof options,
  ) => {
    try {
      const result = await fn(tx);
      events.push('commit'); committed = true; return result;
    } catch (err) {
      rolledBack = true; throw err;
    }
  });
  const lookup = vi.fn(async (): Promise<{
    id: string; chainId: string; chain: { userId: string };
  } | null> => ({ id: row.id, chainId: chain.id, chain: { userId: chain.userId } }));
  const prisma = { refreshToken: { findUnique: lookup }, $transaction: transaction } as unknown as PrismaClient;
  const hit = vi.fn(async () => { events.push('rate-limit'); });
  const access = new AccessTokenService(config, clock);
  const realSign = access.sign.bind(access);
  const sign = vi.spyOn(access, 'sign').mockImplementation((user) => {
    events.push('sign');
    return realSign(user);
  });
  const service = new SessionService(prisma, config, clock, access,
    { hit } as unknown as RateLimiter, new AppLogger({ write: (entry) => { logs.push(entry); } }));
  return {
    service, original, config, clock, chain, row, logs, events, lock, locked, tx,
    findUnique, updateMany, create, chainUpdate, chainUpdateMany, lookup, transaction, hit, sign,
    committed: () => committed, rolledBack: () => rolledBack,
  };
}

function grace(s: ReturnType<typeof setup>) {
  const successor = newRefreshToken();
  s.row.rotatedAt = s.clock.now();
  s.row.successorId = randomUUID();
  s.row.successorCiphertext = seal(successor.token, s.config.refreshGraceKey);
  s.row.graceUntil = new Date(s.clock.now().getTime() + 10_000);
  s.findUnique.mockResolvedValueOnce(s.row).mockResolvedValueOnce({
    ...s.row, id: s.row.successorId, tokenHash: successor.hash, rotatedAt: null,
  });
  return successor;
}

describe('SessionService transaction invariants', () => {
  it('B1#15: locks before re-reading and uses CAS before inserting a successor, then signs after commit', async () => {
    const s = setup();
    s.clock.advance(1000);
    const session = await s.service.refresh(s.original.token, 'mobile');
    expect(s.events).toEqual(['rate-limit', 'lock', 'read', 'cas', 'create', 'chain-write', 'commit', 'sign']);
    expect(s.transaction.mock.calls[0][1]).toEqual(options);
    expect(s.updateMany).toHaveBeenCalledWith({
      where: { id: s.row.id, rotatedAt: null },
      data: {
        rotatedAt: s.clock.now(), successorId: expect.any(String),
        successorCiphertext: expect.any(String), graceUntil: new Date(s.clock.now().getTime() + 10_000),
      },
    });
    expect(s.chainUpdate).toHaveBeenCalledWith({ where: { id: s.chain.id }, data: { lastUsedAt: s.clock.now() } });
    expect(session.refreshToken).not.toBe(s.original.token);
    expect(session.refreshExpiresAt).toEqual(new Date(s.clock.now().getTime() + 90 * day));
    expect(decodeJwt(session.accessToken)).toMatchObject({ sub: s.chain.userId, sid: s.chain.id });
    expect(s.sign).toHaveBeenCalledOnce();
    expect(s.committed()).toBe(true);
  });

  it('B1#16: grace includes exactly 10 seconds, returns the identical successor, and signs a fresh JWT', async () => {
    const s = setup();
    const successor = grace(s);
    s.clock.advance(10_000);
    const session = await runWithOperationId('grace-operation', () => s.service.refresh(s.original.token, 'mobile'));
    expect(session.refreshToken).toBe(successor.token);
    expect(decodeJwt(session.accessToken).exp).toBe(s.clock.now().getTime() / 1000 + 900);
    expect(s.updateMany).not.toHaveBeenCalled();
    expect(s.chainUpdate).not.toHaveBeenCalled();
    expect(s.logs).toEqual([{
      level: 'info', event: 'refresh_grace_used', chain_id: s.chain.id, operation_id: 'grace-operation',
    }]);
  });

  it.each(['reuse', 'expired', 'revoked', 'path_mismatch'] as const)(
    'B1#34: %s is returned by the transaction and becomes 401 only after commit', async (reason) => {
      const s = setup();
      if (reason === 'reuse') { grace(s); s.clock.advance(11_000); }
      if (reason === 'expired') s.clock.advance(90 * day + 1000);
      if (reason === 'revoked') { s.chain.revokedAt = s.clock.now(); s.chain.revokeReason = 'logout'; }
      if (reason === 'path_mismatch') s.chain.clientType = 'web';
      await expect(s.service.refresh(s.original.token, 'mobile')).rejects.toMatchObject({ problemType: 'invalid-token' });
      expect(s.committed()).toBe(true);
      expect(s.rolledBack()).toBe(false);
      expect(s.sign).not.toHaveBeenCalled();
      expect(s.updateMany).not.toHaveBeenCalled();
      if (reason === 'reuse' || reason === 'expired') {
        expect(s.chainUpdateMany).toHaveBeenCalledWith({
          where: { id: s.chain.id, revokedAt: null },
          data: { revokedAt: s.clock.now(), revokeReason: reason === 'reuse' ? 'reuse_detected' : 'expired' },
        });
      } else expect(s.chainUpdateMany).not.toHaveBeenCalled();
      if (reason === 'reuse') {
        expect(s.logs).toEqual([{ level: 'warn', event: 'refresh_reuse_detected', chain_id: s.chain.id }]);
        expect(JSON.stringify(s.logs)).not.toContain(s.original.token);
      }
    },
  );

  it('B1#18: rotation clips refresh expiry to the absolute deadline', async () => {
    const s = setup();
    s.clock.advance(360 * day);
    s.chain.lastUsedAt = s.clock.now();
    const session = await s.service.refresh(s.original.token, 'mobile');
    expect(session.refreshExpiresAt).toEqual(new Date(s.chain.createdAt.getTime() + 365 * day));
  });

  it.each([90, 365])('B1#18: the exact %i-day expiry boundary is accepted; only greater ages expire', async (days) => {
    const s = setup();
    s.clock.advance(days * day);
    if (days === 365) s.chain.lastUsedAt = s.clock.now();
    await expect(s.service.refresh(s.original.token, 'mobile')).resolves.toMatchObject({ sessionChainId: s.chain.id });
    expect(s.chainUpdateMany).not.toHaveBeenCalled();
  });

  it('B1E6: an already-rotated successor commits reuse revocation even within grace', async () => {
    const s = setup();
    grace(s);
    s.findUnique.mockReset().mockResolvedValueOnce(s.row).mockResolvedValueOnce({ ...s.row });
    await expect(s.service.refresh(s.original.token, 'mobile')).rejects.toMatchObject({ problemType: 'invalid-token' });
    expect(s.chainUpdateMany).toHaveBeenCalled();
    expect(s.committed()).toBe(true);
  });

  it.each(['missing_successor', 'missing_ciphertext', 'missing_grace'] as const)(
    'B1#17: %s cannot enter grace and commits reuse revocation', async (missing) => {
      const s = setup();
      grace(s);
      if (missing === 'missing_successor') {
        s.findUnique.mockReset().mockResolvedValueOnce(s.row).mockResolvedValueOnce(null);
      }
      if (missing === 'missing_ciphertext') s.row.successorCiphertext = null;
      if (missing === 'missing_grace') s.row.graceUntil = null;
      await expect(s.service.refresh(s.original.token, 'mobile')).rejects.toMatchObject({ problemType: 'invalid-token' });
      expect(s.chainUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: { revokedAt: s.clock.now(), revokeReason: 'reuse_detected' },
      }));
      expect(s.committed()).toBe(true);
      expect(s.sign).not.toHaveBeenCalled();
    },
  );

  it('B1E5: a zero-count CAS re-reads the winner and returns grace without inserting another token', async () => {
    const s = setup();
    s.findUnique.mockResolvedValueOnce({ ...s.row });
    const successor = grace(s);
    s.updateMany.mockResolvedValueOnce({ count: 0 });
    const session = await s.service.refresh(s.original.token, 'mobile');
    expect(session.refreshToken).toBe(successor.token);
    expect(s.create).not.toHaveBeenCalled();
    expect(s.updateMany).toHaveBeenCalledOnce();
  });

  it('B1E7: decisions and Clock.now are refreshed after a gated user lock', async () => {
    const s = setup();
    const release = gate();
    s.lock.mockImplementationOnce(async () => { s.locked.resolve(); await release.promise; return 1; });
    const pending = s.service.refresh(s.original.token, 'mobile');
    const result = pending.catch((err: unknown) => err);
    await s.locked.promise;
    expect(s.findUnique).not.toHaveBeenCalled();
    s.clock.advance(90 * day + 1000);
    release.resolve();
    expect(await result).toBeInstanceOf(ProblemDetailsException);
    expect(s.chainUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { revokedAt: s.clock.now(), revokeReason: 'expired' },
    }));
    expect(s.committed()).toBe(true);
  });

  it('B1E30: a token removed while waiting is denied after committing a read-only transaction', async () => {
    const s = setup();
    s.findUnique.mockResolvedValueOnce(null);
    await expect(s.service.refresh(s.original.token, 'mobile')).rejects.toMatchObject({ problemType: 'invalid-token' });
    expect(s.committed()).toBe(true);
    expect(s.chainUpdateMany).not.toHaveBeenCalled();
  });

  it('B1#15: unexpected insert failure rolls back and returns no pair or success log', async () => {
    const s = setup();
    const error = new Error('database failure');
    s.create.mockRejectedValueOnce(error);
    await expect(s.service.refresh(s.original.token, 'mobile')).rejects.toBe(error);
    expect(s.rolledBack()).toBe(true);
    expect(s.committed()).toBe(false);
    expect(s.sign).not.toHaveBeenCalled();
    expect(s.logs).toEqual([]);
  });

  it('B1#15: rate limiting rejects before acquiring a user lock', async () => {
    const s = setup();
    const error = new ProblemDetailsException({ status: 429, title: 'Too many requests', type: 'rate-limited' });
    s.hit.mockRejectedValueOnce(error);
    await expect(s.service.refresh(s.original.token, 'mobile')).rejects.toBe(error);
    expect(s.transaction).not.toHaveBeenCalled();
  });

  it('B1E30: unknown tokens have no lock owner and cannot revoke any chain', async () => {
    const s = setup();
    s.lookup.mockResolvedValueOnce(null);
    await expect(s.service.refresh('unknown', 'mobile')).rejects.toMatchObject({ problemType: 'invalid-token' });
    expect(s.hit).not.toHaveBeenCalled();
    expect(s.transaction).not.toHaveBeenCalled();
    expect(s.chainUpdateMany).not.toHaveBeenCalled();
    s.lookup.mockResolvedValueOnce(null);
    await s.service.revokeByRefreshToken('unknown', 'mobile');
    expect(s.transaction).not.toHaveBeenCalled();
  });

  it('B1#20: current-token logout re-reads after locking and writes one revocation', async () => {
    const s = setup();
    await s.service.revokeByRefreshToken(s.original.token, 'mobile');
    expect(s.events).toEqual(['lock', 'read', 'chain-write', 'commit']);
    expect(s.chainUpdateMany).toHaveBeenCalledWith({
      where: { id: s.chain.id, revokedAt: null }, data: { revokedAt: s.clock.now(), revokeReason: 'logout' },
    });
    expect(s.hit).not.toHaveBeenCalled();
  });

  it('B1#22: revokeAllForUser changes only unrevoked chains of the locked user', async () => {
    const s = setup();
    await s.service.revokeAllForUser(s.tx, s.chain.userId, 'password_changed');
    expect(s.chainUpdateMany).toHaveBeenCalledWith({
      where: { userId: s.chain.userId, revokedAt: null },
      data: { revokedAt: s.clock.now(), revokeReason: 'password_changed' },
    });
    // Both helpers accept an existing transaction; they must not nest transactions or locks.
    expect(s.transaction).not.toHaveBeenCalled();
    expect(s.lock).not.toHaveBeenCalled();
  });

  it.each([9, 10, 14])('B1#19: startChain with %i older active chains evicts only the LRU excess', async (olderCount) => {
    const s = setup();
    const older = Array.from({ length: olderCount }, () => ({ id: randomUUID() }));
    const createChain = vi.fn(async () => s.chain);
    const findMany = vi.fn(async () => older);
    const tx = {
      ...s.tx, sessionChain: { create: createChain, findMany, updateMany: s.chainUpdateMany },
    } as unknown as Prisma.TransactionClient;
    const session = await s.service.startChain(tx, { userId: s.chain.userId, client: 'mobile', deviceLabel: 'Phone' });
    expect(createChain).toHaveBeenCalledWith({ data: {
      userId: s.chain.userId, clientType: 'mobile', deviceLabel: 'Phone', createdAt: s.clock.now(), lastUsedAt: s.clock.now(),
    } });
    expect(findMany).toHaveBeenCalledWith({
      where: {
        userId: s.chain.userId, revokedAt: null, id: { not: s.chain.id },
        lastUsedAt: { gte: new Date(s.clock.now().getTime() - 90 * day) },
        createdAt: { gte: new Date(s.clock.now().getTime() - 365 * day) },
      },
      orderBy: [{ lastUsedAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }], select: { id: true },
    });
    expect(s.create).toHaveBeenCalledWith({ data: {
      chainId: s.chain.id, tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/), createdAt: s.clock.now(),
    } });
    expect(session).toMatchObject({ sessionChainId: s.chain.id, client: 'mobile' });
    expect(session.refreshExpiresAt).toEqual(new Date(s.clock.now().getTime() + 90 * day));
    if (olderCount > 9) {
      expect(s.chainUpdateMany).toHaveBeenCalledWith({
        where: { userId: s.chain.userId, id: { in: older.slice(0, olderCount - 9).map((row) => row.id) }, revokedAt: null },
        data: { revokedAt: s.clock.now(), revokeReason: 'device_cap' },
      });
    } else expect(s.chainUpdateMany).not.toHaveBeenCalled();
    expect(s.transaction).not.toHaveBeenCalled();
    expect(s.lock).not.toHaveBeenCalled();
  });

  it.each(['rotated', 'revoked', 'path_mismatch'] as const)(
    'B1#20: logout with a %s token is a locked read-only no-op', async (state) => {
      const s = setup();
      if (state === 'rotated') s.row.rotatedAt = s.clock.now();
      if (state === 'revoked') s.chain.revokedAt = s.clock.now();
      if (state === 'path_mismatch') s.chain.clientType = 'web';
      await s.service.revokeByRefreshToken(s.original.token, 'mobile');
      expect(s.events).toEqual(['lock', 'read', 'commit']);
      expect(s.transaction.mock.calls[0][1]).toEqual(options);
      expect(s.chainUpdateMany).not.toHaveBeenCalled();
    },
  );
});
