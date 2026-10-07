import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { decideCredential } from './credential-decision.js';

describe('credential decision under the caller user lock', () => {
  const clock = new FakeClock(new Date('2026-10-07T12:00:00Z'));
  const input = { userId: 'user', verifiedHash: 'verified', passwordMatched: true };
  const tx = { user: { findUnique: vi.fn(), update: vi.fn() } };
  const client = tx as unknown as Prisma.TransactionClient;
  beforeEach(() => {
    vi.resetAllMocks();
    tx.user.findUnique.mockResolvedValue({ failedLoginCount: 3, loginLockedUntil: null,
      passwordCredential: { hash: input.verifiedHash } });
    tx.user.update.mockResolvedValue({ failedLoginCount: 4 });
  });

  it('B1#11: correct credentials clear the failure counter without rewriting the hash', async () => {
    expect(await decideCredential(client, input, clock)).toBe('ok');
    expect(tx.user.update).toHaveBeenCalledExactlyOnceWith({ where: { id: input.userId }, data: { failedLoginCount: 0 } });
  });
  it('B1#34: a wrong password returns an outcome after incrementing persistent state', async () => {
    expect(await decideCredential(client, { ...input, passwordMatched: false }, clock)).toBe('wrong');
    expect(tx.user.update).toHaveBeenCalledExactlyOnceWith({ where: { id: input.userId }, data: { failedLoginCount: { increment: 1 } } });
  });
  it('B1#13: the tenth failure locks for exactly fifteen minutes and resets the counter', async () => {
    tx.user.update.mockResolvedValueOnce({ failedLoginCount: 10 });
    expect(await decideCredential(client, { ...input, passwordMatched: false }, clock)).toBe('locked');
    expect(tx.user.update).toHaveBeenLastCalledWith({ where: { id: input.userId }, data: {
      failedLoginCount: 0, loginLockedUntil: new Date(clock.now().getTime() + 900_000),
    } });
  });
  it.each([true, false])('B1E3: an active lock leaves all state unchanged (matched=%s)', async (passwordMatched) => {
    tx.user.findUnique.mockResolvedValue({ loginLockedUntil: new Date(clock.now().getTime() + 1),
      passwordCredential: { hash: 'changed' } });
    expect(await decideCredential(client, { ...input, passwordMatched }, clock)).toBe('locked');
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it.each([null, { passwordCredential: null }, { passwordCredential: { hash: 'changed' } }])(
    'B1E33: missing or changed credential is stale and never counted (%j)', async (user) => {
      tx.user.findUnique.mockResolvedValue(user);
      expect(await decideCredential(client, input, clock)).toBe('stale');
      expect(tx.user.update).not.toHaveBeenCalled();
    });
  it('B1#13: a lock ending exactly now permits correct credentials', async () => {
    tx.user.findUnique.mockResolvedValue({ loginLockedUntil: clock.now(), passwordCredential: { hash: input.verifiedHash } });
    expect(await decideCredential(client, input, clock)).toBe('ok');
  });
});
