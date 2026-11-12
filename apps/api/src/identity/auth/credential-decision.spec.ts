import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { fakeLoginFailures } from '../../../test/support/fake-login-failures.js';
import { decideCredential } from './credential-decision.js';

describe('credential decision under the caller user lock', () => {
  const clock = new FakeClock(new Date('2026-10-07T12:00:00Z'));
  const A = 'ip-key-a';
  const B = 'ip-key-b';
  const input = { userId: 'user', verifiedHash: 'verified', passwordMatched: true, ipKey: A };
  const wrong = { ...input, passwordMatched: false };
  const lockedUntil = new Date(clock.now().getTime() + 900_000);
  let failures: ReturnType<typeof fakeLoginFailures>;
  const tx = { user: { findUnique: vi.fn(), update: vi.fn() }, loginFailure: {} };
  const client = tx as unknown as Prisma.TransactionClient;
  beforeEach(() => {
    vi.resetAllMocks();
    failures = fakeLoginFailures(); tx.loginFailure = failures.table;
    failures.seed({ userId: input.userId, ipKey: A, failedCount: 3 });
    tx.user.findUnique.mockResolvedValue({ status: 'active', passwordCredential: { hash: input.verifiedHash } });
  });

  it('B1#11: correct credentials delete this ip\'s failure row and never touch the user row', async () => {
    expect(await decideCredential(client, input, clock)).toEqual({ kind: 'ok', lockedUntil: null, newlyLocked: false });
    expect(failures.table.deleteMany).toHaveBeenCalledExactlyOnceWith({ where: { userId: input.userId, ipKey: A } });
    expect(failures.get(input.userId, A)).toBeUndefined();
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it('B1#34: a wrong password counts once on the (account, ip) row', async () => {
    expect(await decideCredential(client, wrong, clock)).toEqual({ kind: 'wrong', lockedUntil: null, newlyLocked: false });
    expect(failures.get(input.userId, A)).toEqual({ userId: input.userId, ipKey: A, failedCount: 4, lockedUntil: null, updatedAt: clock.now() });
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it('F4: the first wrong password from a new ip creates its row at 1', async () => {
    expect(await decideCredential(client, { ...wrong, ipKey: B }, clock)).toMatchObject({ kind: 'wrong' });
    expect(failures.get(input.userId, B)).toEqual({ userId: input.userId, ipKey: B, failedCount: 1, lockedUntil: null, updatedAt: clock.now() });
    expect(failures.get(input.userId, A)).toMatchObject({ failedCount: 3 });
  });
  it('B1#13: the tenth failure locks this ip for exactly fifteen minutes, resets its counter and says it is new', async () => {
    failures.seed({ userId: input.userId, ipKey: A, failedCount: 9 });
    expect(await decideCredential(client, wrong, clock)).toEqual({ kind: 'locked', lockedUntil, newlyLocked: true });
    expect(failures.get(input.userId, A)).toMatchObject({ failedCount: 0, lockedUntil });
  });
  it.each([true, false])('B1E3: an active lock on this ip leaves all state unchanged and is not new (matched=%s)', async (passwordMatched) => {
    const until = new Date(clock.now().getTime() + 1);
    failures.seed({ userId: input.userId, ipKey: A, lockedUntil: until });
    tx.user.findUnique.mockResolvedValue({ status: 'active', passwordCredential: { hash: 'changed' } });
    expect(await decideCredential(client, { ...input, passwordMatched }, clock)).toEqual({ kind: 'locked', lockedUntil: until, newlyLocked: false });
    expect(failures.writes()).toEqual([]); expect(tx.user.update).not.toHaveBeenCalled();
  });
  it('F4: ten wrong passwords from ip A lock A only; the right password from ip B is ok while A stays locked', async () => {
    failures = fakeLoginFailures(); tx.loginFailure = failures.table;
    const outcomes = [];
    for (let i = 0; i < 10; i += 1) outcomes.push(await decideCredential(client, wrong, clock));
    expect(outcomes.slice(0, 9).every((o) => o.kind === 'wrong')).toBe(true);
    expect(outcomes[9]).toEqual({ kind: 'locked', lockedUntil, newlyLocked: true });
    expect(await decideCredential(client, { ...input, ipKey: B }, clock)).toEqual({ kind: 'ok', lockedUntil: null, newlyLocked: false });
    expect(await decideCredential(client, { ...wrong, ipKey: B }, clock)).toMatchObject({ kind: 'wrong' });
    expect(await decideCredential(client, input, clock)).toEqual({ kind: 'locked', lockedUntil, newlyLocked: false });
  });
  it('F4: the right password on ip A deletes only A\'s row; B\'s counter stays', async () => {
    failures.seed({ userId: input.userId, ipKey: B, failedCount: 5 });
    expect(await decideCredential(client, input, clock)).toMatchObject({ kind: 'ok' });
    expect(failures.get(input.userId, A)).toBeUndefined();
    expect(failures.get(input.userId, B)).toMatchObject({ failedCount: 5 });
  });
  it.each([null, { passwordCredential: null }, { passwordCredential: { hash: 'changed' } }])(
    'B1E33: missing or changed credential is stale and never counted (%j)', async (user) => {
      tx.user.findUnique.mockResolvedValue(user);
      expect(await decideCredential(client, wrong, clock)).toMatchObject({ kind: 'stale' });
      expect(failures.writes()).toEqual([]);
    });
  it.each([true, false])('B8 (IE11): a deleting account is stale (generic failure) and never counted (matched=%s)', async (passwordMatched) => {
    tx.user.findUnique.mockResolvedValue({ status: 'deleting', passwordCredential: { hash: input.verifiedHash } });
    expect(await decideCredential(client, { ...input, passwordMatched }, clock)).toMatchObject({ kind: 'stale' });
    expect(failures.writes()).toEqual([]);
  });
  it('N4: a locked account with the right password is account_locked and keeps its failure counter', async () => {
    tx.user.findUnique.mockResolvedValue({ status: 'locked', passwordCredential: { hash: input.verifiedHash } });
    expect(await decideCredential(client, input, clock)).toMatchObject({ kind: 'account_locked' });
    expect(failures.writes()).toEqual([]); expect(failures.get(input.userId, A)).toMatchObject({ failedCount: 3 });
  });
  it('N4: a locked account with a wrong password still counts the failure and stays generic', async () => {
    tx.user.findUnique.mockResolvedValue({ status: 'locked', passwordCredential: { hash: input.verifiedHash } });
    expect(await decideCredential(client, wrong, clock)).toMatchObject({ kind: 'wrong' });
    expect(failures.get(input.userId, A)).toMatchObject({ failedCount: 4 });
  });
  it('B1#13: a lock ending exactly now permits correct credentials', async () => {
    failures.seed({ userId: input.userId, ipKey: A, lockedUntil: clock.now() });
    expect(await decideCredential(client, input, clock)).toMatchObject({ kind: 'ok' });
  });
});
