import argon2 from 'argon2';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PasswordHasher } from './password-hasher.service.js';

afterEach(() => vi.restoreAllMocks());

describe('PasswordHasher', () => {
  it('B1#3: hashes with the pinned Argon2id PHC parameters and verifies passwords', async () => {
    const hasher = new PasswordHasher();
    const hash = await hasher.hash('Mật-khẩu1');
    expect(hash.startsWith('$argon2id$v=19$m=19456,p=1,t=2$')).toBe(true);
    await expect(hasher.verify(hash, 'Mật-khẩu1')).resolves.toBe(true);
    await expect(hasher.verify(hash, 'Wrong-password1')).resolves.toBe(false);
  });

  it('B1E1: decomposed input verifies against a composed-input hash in both directions', async () => {
    const hasher = new PasswordHasher();
    const composed = 'Café-good1';
    const decomposed = 'Cafe\u0301-good1';
    await expect(hasher.verify(await hasher.hash(composed), decomposed)).resolves.toBe(true);
    await expect(hasher.verify(await hasher.hash(decomposed), composed)).resolves.toBe(true);
  });

  it('B1#12: module init builds one dummy hash using the same parameters', async () => {
    const hashSpy = vi.spyOn(argon2, 'hash');
    const hasher = new PasswordHasher();
    await hasher.onModuleInit();
    await hasher.onModuleInit();
    expect(hashSpy).toHaveBeenCalledTimes(1);
    expect(hashSpy).toHaveBeenCalledWith(expect.any(String), {
      type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1,
    });
  });

  it('B1#12: verifyDummy calls argon2.verify exactly once and resolves false even on a match', async () => {
    const hasher = new PasswordHasher();
    await hasher.onModuleInit();
    const verifySpy = vi.spyOn(argon2, 'verify').mockResolvedValueOnce(true);
    await expect(hasher.verifyDummy('Cafe\u0301-good1')).resolves.toBe(false);
    expect(verifySpy).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/), 'Café-good1',
    );
  });

  it('B1#12: never runs more than four hash, verify and dummy operations in flight', async () => {
    const hasher = new PasswordHasher();
    await hasher.onModuleInit();
    let active = 0;
    let peak = 0;
    const releases: Array<() => void> = [];
    const gate = async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise<void>((resolve) => releases.push(resolve));
      active--;
    };
    vi.spyOn(argon2, 'hash').mockImplementation(async () => { await gate(); return 'hash'; });
    vi.spyOn(argon2, 'verify').mockImplementation(async () => { await gate(); return true; });
    const operations = Array.from({ length: 12 }, (_, index) => {
      if (index % 3 === 0) return hasher.hash('Password1!');
      if (index % 3 === 1) return hasher.verify('hash', 'Password1!');
      return hasher.verifyDummy('Password1!');
    });
    try {
      await vi.waitFor(() => expect(releases).toHaveLength(4));
      expect(active).toBe(4);
      for (let index = 0; index < 12; index++) {
        await vi.waitFor(() => expect(releases.length).toBeGreaterThan(index));
        releases[index]();
      }
      const results = await Promise.all(operations);
      expect(peak).toBe(4);
      expect(active).toBe(0);
      expect(results.filter((result) => result === false)).toHaveLength(4);
    } finally {
      // Release queued operations too if an assertion fails.
      for (let index = 0; index < 12; index++) {
        releases[index]?.();
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
      await Promise.allSettled(operations);
    }
  });

  it('B1#12: releases semaphore slots after Argon2 errors', async () => {
    const hasher = new PasswordHasher();
    const failure = new Error('hash failed');
    vi.spyOn(argon2, 'hash').mockRejectedValue(failure);
    const failed = await Promise.allSettled(Array.from({ length: 8 }, () => hasher.hash('Password1!')));
    expect(failed).toEqual(Array.from({ length: 8 }, () => ({ status: 'rejected', reason: failure })));
    vi.restoreAllMocks();
    const hash = await hasher.hash('Password1!');
    await expect(hasher.verify(hash, 'Password1!')).resolves.toBe(true);
  });
});
